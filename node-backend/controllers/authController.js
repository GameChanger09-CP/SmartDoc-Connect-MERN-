const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, ActivityLog } = require('../models');

exports.login = async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: 'Invalid Credentials' });
    }
    if (user.role !== 'Main_Admin' && user.kyc_status !== 'Verified') {
        return res.status(403).json({ error: 'Account Pending Approval.' });
    }
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    await ActivityLog.create({ user: user._id, action: 'Login', details: 'Logged in' });
    
    res.json({ token, role: user.role, username: user.username });
};

exports.register = async (req, res) => {
    const { username, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const kyc_status = role === 'Main_Admin' ? 'Verified' : 'Pending';
    const gov_id = req.file ? req.file.path : null;

    try {
        await User.create({ username, email, password: hashedPassword, role, kyc_status, gov_id });
        res.status(201).json({ status: 'Registered' });
    } catch (e) { 
        res.status(400).json({ error: 'Username may already exist' }); 
    }
};