const { User, Document, Department, ActivityLog } = require('../models');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { sendMail } = require('../utils/mailer');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

exports.getDashboardStats = async (req, res) => {
    try {
        const pendingUsers = await User.countDocuments({ kyc_status: 'Pending', role: { $ne: 'Main_Admin' } });
        
        const deptStats = await Document.aggregate([
            { $match: { status: 'In_Progress' } },
            { $unwind: { path: '$current_dept', preserveNullAndEmptyArrays: true } },
            { $group: { _id: '$current_dept', count: { $sum: 1 } } },
            { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
            { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
            { $project: { name: { $ifNull: ['$dept.name', 'Unassigned'] }, count: 1 } }
        ]);
        
        res.json({ pendingUsers, deptStats });
    } catch (e) { 
        console.error("Stats Error:", e);
        res.status(500).json({ error: "Stats error" }); 
    }
};

exports.getPendingUsers = async (req, res) => {
    try {
        const users = await User.find({ kyc_status: 'Pending', role: { $ne: 'Main_Admin' } }).select('-password');
        res.json(users);
    } catch (e) { 
        res.status(500).json({ error: "Fetch failed" }); 
    }
};

exports.createUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        if (!username || !email || !password || !role) return res.status(400).json({ error: "Missing required fields" });

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(400).json({ error: "Username or Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // --- FIXED: Dept_Admin Name IS the Department Name ---
        let finalDeptId = null;
        if (role === 'Dept_Admin') {
            const targetDeptName = username.trim();
            let dept = await Department.findOne({ name: targetDeptName });
            if (!dept) {
                dept = await Department.create({ name: targetDeptName });
            }
            finalDeptId = dept._id;
        }

        const newUser = await User.create({
            username, 
            email, 
            password: hashedPassword, 
            role, 
            kyc_status: 'Verified',
            department: finalDeptId
        });

        const emailContent = `
            <h3>Welcome to SmartDoc Connect</h3>
            <p>Your account has been created by the Administrator.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
                <p><b>Username:</b> ${username}</p>
                <p><b>Password:</b> ${password}</p>
                <p><b>Role:</b> ${role}</p>
            </div>
            <p>Please login at <a href="${frontendUrl}/login">${frontendUrl}/login</a> and change your password immediately.</p>
        `;
        await sendMail(email, "Account Created - Credentials", emailContent);

        res.status(201).json({ status: "Created" });
    } catch (e) {
        if(e.code === 11000) return res.status(400).json({ error: "Username/Email exists" });
        console.error("Create User Error:", e);
        res.status(500).json({ error: "Creation failed" });
    }
};

exports.approveUser = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid User ID" });

        const user = await User.findByIdAndUpdate(req.params.id, { kyc_status: 'Verified' }, { new: true });
        if (!user) return res.status(404).json({ error: "User not found" });

        const emailContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #166534;">Account Approved</h2>
                <p>Hello <b>${user.username}</b>,</p>
                <p>Your identity has been verified by the Main Administrator.</p>
                <p>You can now log in to your dashboard to submit documents and view status.</p>
                <a href="${frontendUrl}/login" style="background: #166534; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
            </div>
        `;
        await sendMail(user.email, "Access Granted - SmartDoc Connect", emailContent);

        res.json({ status: 'Approved' });
    } catch (e) { 
        console.error("Approve User Error:", e);
        res.status(500).json({ error: "Approve failed" }); 
    }
};

exports.rejectUser = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid User ID" });

        const user = await User.findById(req.params.id);
        if (user) {
            const emailContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #dc2626;">Account Rejected</h2>
                    <p>Hello <b>${user.username}</b>,</p>
                    <p>Your account application has been rejected by the Administrator.</p>
                    <p>This is likely due to an invalid or unclear Government ID.</p>
                    <p>Please register again with valid documents.</p>
                </div>
            `;
            await sendMail(user.email, "Application Rejected", emailContent);
            
            if (user.gov_id) {
                const fs = require('fs');
                if (fs.existsSync(user.gov_id)) fs.unlinkSync(user.gov_id);
            }
            await User.findByIdAndDelete(req.params.id);
        }
        res.json({ status: 'Rejected' });
    } catch (e) { 
        console.error("Reject User Error:", e);
        res.status(500).json({ error: "Reject failed" }); 
    }
};

exports.getFaculty = async (req, res) => {
    try {
        if (!req.user.department) return res.status(400).json({ error: "User has no assigned department" });
        const faculty = await User.find({ role: 'Faculty', department: req.user.department }).select('-password');
        res.json(faculty);
    } catch (e) { 
        res.status(500).json({ error: "Fetch failed" }); 
    }
};

exports.getDepartments = async (req, res) => {
    try {
        // --- AUTO-HEAL: Ensure all Dept_Admins have a Department mapping ---
        const deptAdmins = await User.find({ role: 'Dept_Admin' });
        for (let admin of deptAdmins) {
            let dept = await Department.findOne({ name: admin.username });
            if (!dept) {
                dept = await Department.create({ name: admin.username });
            }
            if (!admin.department || admin.department.toString() !== dept._id.toString()) {
                admin.department = dept._id;
                await admin.save();
            }
        }
        // Fetch and return the updated list
        const depts = await Department.find();
        res.json(depts);
    } catch (e) { 
        console.error("Fetch Departments Error:", e);
        res.status(500).json({ error: "Fetch failed" }); 
    }
};

exports.getLogs = async (req, res) => {
    try {
        const logs = await ActivityLog.find().populate('user', 'username').sort({ timestamp: -1 }).limit(50);
        res.json(logs);
    } catch (e) { 
        res.status(500).json({ error: "Fetch failed" }); 
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') return res.json([]);
        const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const users = await User.find({
            role: 'Client',
            $or: [
                { username: { $regex: safeQuery, $options: 'i' } },
                { email: { $regex: safeQuery, $options: 'i' } }
            ]
        }).select('username email _id').limit(10);
        
        res.json(users);
    } catch (e) { 
        console.error("Search Users Error:", e);
        res.status(500).json({ error: "Search failed" }); 
    }
};