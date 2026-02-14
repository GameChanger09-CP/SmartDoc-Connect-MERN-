const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, ActivityLog } = require('../models');
const { sendMail } = require('../utils/mailer');

// --- LOGIN ---
exports.login = async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: 'Invalid Credentials' });
    }
    
    if (user.role !== 'Main_Admin' && user.kyc_status !== 'Verified') {
        return res.status(403).json({ error: 'Account Pending Approval by System Administrator.' });
    }
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    await ActivityLog.create({ user: user._id, action: 'Login', details: 'Logged in successfully' });
    
    res.json({ token, role: user.role, username: user.username });
};

// --- REGISTER ---
exports.register = async (req, res) => {
    const { username, email, password, role } = req.body;

    if (role === 'Main_Admin' || role === 'Dept_Admin' || role === 'Faculty') {
        return res.status(403).json({ error: `Security Alert: ${role} accounts cannot be created publicly.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const kyc_status = 'Pending'; 
    const gov_id = req.file ? req.file.path : null;

    try {
        await User.create({ username, email, password: hashedPassword, role: 'Client', kyc_status, gov_id });
        res.status(201).json({ status: 'Registered successfully' });
    } catch (e) { 
        if (e.code === 11000) return res.status(400).json({ error: 'Username already exists.' });
        res.status(500).json({ error: 'Server error.' }); 
    }
};

// --- UPDATE PROFILE ---
exports.updateProfile = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = await User.findById(req.user._id);

        if (username) user.username = username;
        if (email) user.email = email;
        if (password) user.password = await bcrypt.hash(password, 10);

        await user.save();
        res.json({ status: "Profile Updated" });
    } catch (error) {
        res.status(500).json({ error: "Update Failed" });
    }
};

// --- 🔥 STEP 1: FORGOT PASSWORD (SEND TOKEN) ---
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        // 1. Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "This email is not registered with us." });
        }

        // 2. Generate Reset Token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes
        await user.save();

        // 3. Clear Instructions in Email
        const message = `
            <h3>Password Reset Request</h3>
            <p>You requested to reset your password. Please copy the token below:</p>
            <h2 style="background: #f3f4f6; padding: 10px; display: inline-block; letter-spacing: 2px;">${resetToken}</h2>
            <p>Return to the application, select <b>"I have a token"</b> (or continue if the screen is open), and enter this code along with your new password.</p>
            <p><small>(This token expires in 10 minutes)</small></p>
        `;

        await sendMail(user.email, "Your Password Reset Token", message);
        
        res.json({ status: "Email sent" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Email could not be sent" });
    }
};

// --- 🔥 STEP 2: RESET PASSWORD (VERIFY TOKEN) ---
exports.resetPassword = async (req, res) => {
    try {
        // Expect token in body now (easier for manual entry)
        const { token, password } = req.body;

        if(!token || !password) return res.status(400).json({ error: "Token and Password required" });

        const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
        
        const user = await User.findOne({ 
            resetPasswordToken, 
            resetPasswordExpire: { $gt: Date.now() } 
        });

        if (!user) return res.status(400).json({ error: "Invalid or expired token" });

        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({ status: "Password Updated Successfully" });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
};