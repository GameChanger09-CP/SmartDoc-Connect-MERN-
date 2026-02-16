const { User, Document, Department, ActivityLog } = require('../models');
const bcrypt = require('bcryptjs');
const { sendMail } = require('../utils/mailer');

// --- DASHBOARD STATISTICS ---
exports.getDashboardStats = async (req, res) => {
    try {
        const pendingUsers = await User.countDocuments({ kyc_status: 'Pending', role: { $ne: 'Main_Admin' } });
        
        const deptStats = await Document.aggregate([
            { $match: { status: 'In_Progress' } },
            { $group: { _id: '$current_dept', count: { $sum: 1 } } },
            { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
            { $unwind: '$dept' },
            { $project: { name: '$dept.name', count: 1 } }
        ]);
        
        res.json({ pendingUsers, deptStats });
    } catch (e) { res.status(500).json({ error: "Stats error" }); }
};

// --- PENDING USERS (For KYC) ---
exports.getPendingUsers = async (req, res) => {
    try {
        const users = await User.find({ kyc_status: 'Pending', role: { $ne: 'Main_Admin' } });
        res.json(users);
    } catch (e) { res.status(500).json({ error: "Fetch failed" }); }
};

// --- CREATE USER (Admin Manual Provisioning) ---
exports.createUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Admin-created users are auto-verified
        const newUser = await User.create({
            username, email, password: hashedPassword, role, kyc_status: 'Verified' 
        });

        // Send Email with Credentials (Only possible here because Admin just typed it)
        const emailContent = `
            <h3>Welcome to SmartDoc Connect</h3>
            <p>Your account has been created by the Administrator.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
                <p><b>Username:</b> ${username}</p>
                <p><b>Password:</b> ${password}</p>
                <p><b>Role:</b> ${role}</p>
            </div>
            <p>Please login and change your password immediately.</p>
        `;
        await sendMail(email, "Account Created - Credentials", emailContent);

        res.json({ status: "Created" });
    } catch (e) {
        if(e.code === 11000) return res.status(400).json({ error: "Username/Email exists" });
        res.status(500).json({ error: "Creation failed" });
    }
};

// --- APPROVE USER (Main Admin Actions) ---
exports.approveUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { kyc_status: 'Verified' }, { new: true });
        
        if (!user) return res.status(404).json({ error: "User not found" });

        // 🔥 SEND APPROVAL EMAIL 🔥
        const emailContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #166534;">Account Approved</h2>
                <p>Hello <b>${user.username}</b>,</p>
                <p>Your identity has been verified by the Main Administrator.</p>
                <p>You can now log in to your dashboard to submit documents and view status.</p>
                <a href="http://localhost:5173/login" style="background: #166534; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
            </div>
        `;
        await sendMail(user.email, "Access Granted - SmartDoc Connect", emailContent);

        res.json({ status: 'Approved' });
    } catch (e) { res.status(500).json({ error: "Approve failed" }); }
};

// --- REJECT USER (Main Admin Actions) ---
exports.rejectUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            // Send Rejection Email before deletion
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
            
            await User.findByIdAndDelete(req.params.id);
        }
        res.json({ status: 'Rejected' });
    } catch (e) { res.status(500).json({ error: "Reject failed" }); }
};

// --- GET FACULTY LIST ---
exports.getFaculty = async (req, res) => {
    try {
        const faculty = await User.find({ role: 'Faculty', department: req.user.department });
        res.json(faculty);
    } catch (e) { res.status(500).json({ error: "Fetch failed" }); }
};

// --- GET DEPARTMENTS ---
exports.getDepartments = async (req, res) => {
    try {
        const depts = await Department.find();
        res.json(depts);
    } catch (e) { res.status(500).json({ error: "Fetch failed" }); }
};

// --- GET SYSTEM LOGS ---
exports.getLogs = async (req, res) => {
    try {
        const logs = await ActivityLog.find().populate('user', 'username').sort({ timestamp: -1 }).limit(50);
        res.json(logs);
    } catch (e) { res.status(500).json({ error: "Fetch failed" }); }
};

// --- SEARCH USERS (For Offline Upload) ---
exports.searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);
        
        const users = await User.find({
            role: 'Client',
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } }
            ]
        }).select('username email _id');
        
        res.json(users);
    } catch (e) { res.status(500).json({ error: "Search failed" }); }
};