const bcrypt = require('bcryptjs');
const { User, Department, ActivityLog, Document } = require('../models');

// --- DASHBOARD STATS ---
exports.getDashboardStats = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: "Unauthorized" });
        const deptStats = await Document.aggregate([
            { $match: { status: { $in: ['In_Progress', 'With_Faculty', 'Dept_Reported'] } } },
            { $group: { _id: "$current_dept", count: { $sum: 1 } } },
            { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "dept_info" } },
            { $unwind: "$dept_info" },
            { $project: { name: "$dept_info.name", count: 1 } }
        ]);
        const userCounts = {
            clients: await User.countDocuments({ role: 'Client' }),
            staff: await User.countDocuments({ role: { $in: ['Dept_Admin', 'Faculty'] } }),
            pending: await User.countDocuments({ kyc_status: 'Pending' })
        };
        res.json({ deptStats, userCounts });
    } catch (error) { res.status(500).json({ error: "Stats failed" }); }
};

// --- GET PENDING USERS ---
exports.getPendingUsers = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json([]);
        const users = await User.find({ kyc_status: 'Pending' }).populate('department', 'name');
        res.json(users);
    } catch (error) { res.status(500).json({ error: "Failed" }); }
};

// --- GET FACULTY ---
exports.getFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json([]);
        const faculty = await User.find({ role: 'Faculty', department: req.user.department });
        res.json(faculty);
    } catch (error) { res.status(500).json({ error: "Failed" }); }
};

// --- CREATE USER ---
exports.createUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        if (role === 'Dept_Admin') {
            let dept = await Department.findOneAndUpdate({ name: username }, { keywords: username.toLowerCase() }, { upsert: true, returnDocument: 'after' });
            await User.create({ username, email, password: hashedPassword, role, kyc_status: 'Verified', department: dept._id });
        } else {
            const data = { username, email, password: hashedPassword, role, kyc_status: 'Verified' };
            if(role === 'Faculty') data.department = req.user.department;
            await User.create(data);
        }
        res.status(201).json({ status: 'Created' });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
};

// --- APPROVE USER ---
exports.approveUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { kyc_status: 'Verified' });
        if (user && user.role === 'Dept_Admin') {
            await Department.findOneAndUpdate({ name: user.username }, { keywords: user.username.toLowerCase() }, { upsert: true });
        }
        res.json({ status: 'Approved' });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
};

// --- 🔥 REJECT USER (DELETES RECORD) ---
exports.rejectUser = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        // Delete user so they can re-register with same email/username
        await User.findByIdAndDelete(req.params.id);
        res.json({ status: 'Rejected & Deleted' });
    } catch (error) { res.status(500).json({ error: "Failed" }); }
};

exports.getDepartments = async (req, res) => {
    try { res.json(await Department.find()); } catch (e) { res.status(500).json({ error: "Failed" }); }
};

exports.getLogs = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Main_Admin' && req.query.user_id) query = { user: req.query.user_id };
        else if (req.user.role !== 'Main_Admin') query = { user: req.user._id };
        const logs = await ActivityLog.find(query).populate('user', 'username role').sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) { res.status(500).json({ error: "Failed" }); }
};