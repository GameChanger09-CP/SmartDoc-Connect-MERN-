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
    
    // Only Clients or Verified internal staff can login. Main_Admin always can.
    if (user.role !== 'Main_Admin' && user.role !== 'Client' && user.kyc_status !== 'Verified') {
        return res.status(403).json({ error: 'Account Pending Approval by System Administrator.' });
    }
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    await ActivityLog.create({ user: user._id, action: 'Login', details: 'Logged in successfully' });
    
    res.json({ token, role: user.role, username: user.username });
};

// --- REGISTER (WITH EMAIL CREDENTIALS) ---
exports.register = async (req, res) => {
    const { username, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const kyc_status = 'Pending'; 
    const gov_id = req.file ? req.file.path : null;

    try {
        const user = await User.create({ 
            username, 
            email, 
            password: hashedPassword, 
            role: role || 'Client', 
            kyc_status, 
            gov_id 
        });

        // 🔥 SEND CREDENTIALS EMAIL 🔥
        const emailContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #1e3a8a;">Welcome to SmartDoc Connect</h2>
                <p>Your account has been successfully created.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Username:</strong> ${username}</p>
                    <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                    <p style="margin: 5px 0;"><strong>Role:</strong> ${role || 'Client'}</p>
                </div>
                <p>Please log in and change your password immediately for security.</p>
                <a href="http://localhost:5173/login" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
            </div>
        `;
        
        await sendMail(email, "Your Account Credentials", emailContent);

        res.status(201).json({ status: 'Registered successfully', userId: user._id });
    } catch (e) { 
        if (e.code === 11000) return res.status(400).json({ error: 'Username already exists.' });
        console.error("Register Error:", e);
        res.status(500).json({ error: 'Server error during registration.' }); 
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

// --- FORGOT PASSWORD (STEP 1) ---
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: "Invalid User: Email not found." });

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Min
        await user.save();

        const message = `
            <h3>Password Reset</h3>
            <p>Your token: <b>${resetToken}</b></p>
            <p>Copy this token and enter it in the app to reset your password.</p>
        `;
        await sendMail(user.email, "Password Reset Token", message);
        
        res.json({ status: "Email sent" });
    } catch (error) {
        res.status(500).json({ error: "Email could not be sent" });
    }
};

// --- RESET PASSWORD (STEP 2) ---
exports.resetPassword = async (req, res) => {
    try {
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

        res.json({ status: "Password Updated" });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
};