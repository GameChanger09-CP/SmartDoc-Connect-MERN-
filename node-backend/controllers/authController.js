const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, ActivityLog } = require('../models');

exports.login = async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: 'Invalid Credentials' });
    }
    
    // Main Admins bypass KYC, everyone else must be verified
    if (user.role !== 'Main_Admin' && user.kyc_status !== 'Verified') {
        return res.status(403).json({ error: 'Account Pending Approval by System Administrator.' });
    }
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    await ActivityLog.create({ user: user._id, action: 'Login', details: 'Logged in successfully' });
    
    res.json({ token, role: user.role, username: user.username });
};

exports.register = async (req, res) => {
    const { username, email, password, role } = req.body;

    // --- 🚨 CRITICAL SECURITY PATCH 🚨 ---
    // Prevent anyone from publicly registering as an Admin or Faculty
    if (role === 'Main_Admin' || role === 'Dept_Admin' || role === 'Faculty') {
        return res.status(403).json({ 
            error: `Security Alert: ${role.replace('_', ' ')} accounts cannot be created publicly. They must be provisioned internally by an administrator.` 
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const kyc_status = 'Pending'; // All new public users start as Pending
    const gov_id = req.file ? req.file.path : null;

    try {
        // Force the role to 'Client' just in case they tried to spoof the request
        await User.create({ username, email, password: hashedPassword, role: 'Client', kyc_status, gov_id });
        res.status(201).json({ status: 'Registered successfully' });
    } catch (e) { 
        // Catch MongoDB duplicate key error
        if (e.code === 11000) {
            return res.status(400).json({ error: 'Username already exists.' });
        }
        res.status(500).json({ error: 'Server error during registration.' }); 
    }
};