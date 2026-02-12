const bcrypt = require('bcryptjs');
const { User, Department, ActivityLog, Document } = require('../models');

// --- NEW: AGGREGATED DASHBOARD STATS ---
exports.getDashboardStats = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: "Unauthorized" });

        // 1. Get Department-wise Pending Docs (Aggregation Pipeline)
        const deptStats = await Document.aggregate([
            { $match: { status: { $in: ['In_Progress', 'With_Faculty', 'Dept_Reported'] } } },
            { $group: { _id: "$current_dept", count: { $sum: 1 } } },
            { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "dept_info" } },
            { $unwind: "$dept_info" },
            { $project: { name: "$dept_info.name", count: 1 } }
        ]);

        // 2. Get User Counts
        const userCounts = {
            clients: await User.countDocuments({ role: 'Client' }),
            staff: await User.countDocuments({ role: { $in: ['Dept_Admin', 'Faculty'] } }),
            pending: await User.countDocuments({ kyc_status: 'Pending' })
        };

        res.json({ deptStats, userCounts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Stats fetch failed" });
    }
};

// --- USERS ---
exports.getPendingUsers = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json([]);
        const users = await User.find({ kyc_status: 'Pending' }).populate('department', 'name');
        res.json(users);
    } catch (error) { res.status(500).json({ error: "Failed to fetch pending users" }); }
};

exports.getFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json([]);
        const faculty = await User.find({ role: 'Faculty', department: req.user.department });
        res.json(faculty);
    } catch (error) { res.status(500).json({ error: "Failed to fetch faculty" }); }
};

exports.createUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        if (req.user.role === 'Main_Admin' && role === 'Dept_Admin') {
            let dept = await Department.findOneAndUpdate(
                { name: username }, { keywords: username.toLowerCase() }, { upsert: true, returnDocument: 'after' }
            );
            await User.create({ username, email, password: hashedPassword, role, kyc_status: 'Verified', department: dept._id });
            await ActivityLog.create({ user: req.user._id, action: 'Created Dept Admin', details: username });
            return res.status(201).json({ status: 'Created Dept Admin' });
        }
        
        if (req.user.role === 'Main_Admin' && role === 'Client') {
            await User.create({ username, email, password: hashedPassword, role, kyc_status: 'Verified' });
            await ActivityLog.create({ user: req.user._id, action: 'Created Client', details: username });
            return res.status(201).json({ status: 'Created Client' });
        }
        
        if (req.user.role === 'Dept_Admin' && role === 'Faculty') {
            await User.create({ 
                username, email, password: hashedPassword, role: 'Faculty', 
                kyc_status: 'Verified', department: req.user.department 
            });
            await ActivityLog.create({ user: req.user._id, action: 'Created Faculty', details: username });
            return res.status(201).json({ status: 'Created Faculty' });
        }

        res.status(403).json({ error: 'Unauthorized to create this role' });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: "This username already exists!" });
        res.status(500).json({ error: "Failed to create user." });
    }
};

exports.approveUser = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const user = await User.findByIdAndUpdate(req.params.id, { kyc_status: 'Verified' });
        if (user && user.role === 'Dept_Admin') {
            await Department.findOneAndUpdate({ name: user.username }, { keywords: user.username.toLowerCase() }, { upsert: true, returnDocument: 'after' });
        }
        await ActivityLog.create({ user: req.user._id, action: 'Approved User', details: user ? user.username : 'Unknown' });
        res.json({ status: 'Approved' });
    } catch (error) { res.status(500).json({ error: "Failed to approve user" }); }
};

exports.rejectUser = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        await User.findByIdAndUpdate(req.params.id, { kyc_status: 'Rejected' });
        res.json({ status: 'Rejected' });
    } catch (error) { res.status(500).json({ error: "Failed to reject user" }); }
};

exports.getDepartments = async (req, res) => {
    try { res.json(await Department.find()); } 
    catch (error) { res.status(500).json({ error: "Failed to fetch departments" }); }
};

// --- LOGS (UPDATED) ---
exports.getLogs = async (req, res) => {
    try {
        let query = {};
        
        // If Main Admin sends ?user_id=XYZ, show logs for THAT user
        if (req.user.role === 'Main_Admin' && req.query.user_id) {
            query = { user: req.query.user_id };
        } 
        // Otherwise, show own logs (unless Main Admin wants all)
        else if (req.user.role !== 'Main_Admin') {
            query = { user: req.user._id };
        }

        const logs = await ActivityLog.find(query).populate('user', 'username role').sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) { res.status(500).json({ error: "Failed to fetch logs" }); }
};