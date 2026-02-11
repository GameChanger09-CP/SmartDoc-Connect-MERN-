const bcrypt = require('bcryptjs');
const { User, Department, ActivityLog } = require('../models');

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
        
        // 1. MAIN ADMIN CREATING A DEPT ADMIN
        if (req.user.role === 'Main_Admin' && role === 'Dept_Admin') {
            // FIXED MONGOOSE WARNING HERE -> changed "new: true" to "returnDocument: 'after'"
            let dept = await Department.findOneAndUpdate(
                { name: username }, { keywords: username.toLowerCase() }, { upsert: true, returnDocument: 'after' }
            );
            await User.create({ username, email, password: hashedPassword, role, kyc_status: 'Verified', department: dept._id });
            await ActivityLog.create({ user: req.user._id, action: 'Created Dept Admin', details: username });
            return res.status(201).json({ status: 'Created Dept Admin' });
        }
        
        // 2. MAIN ADMIN CREATING A CLIENT
        if (req.user.role === 'Main_Admin' && role === 'Client') {
            await User.create({ username, email, password: hashedPassword, role, kyc_status: 'Verified' });
            await ActivityLog.create({ user: req.user._id, action: 'Created Client', details: username });
            return res.status(201).json({ status: 'Created Client' });
        }
        
        // 3. DEPT ADMIN CREATING A FACULTY MEMBER
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
        // CATCH DUPLICATE USERNAME ERRORS
        if (error.code === 11000) {
            return res.status(400).json({ error: "This username already exists in the system!" });
        }
        res.status(500).json({ error: "Failed to create user due to server error." });
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

exports.getLogs = async (req, res) => {
    try {
        const query = req.user.role === 'Main_Admin' ? {} : { user: req.user._id };
        const logs = await ActivityLog.find(query).populate('user', 'username').sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) { res.status(500).json({ error: "Failed to fetch logs" }); }
};