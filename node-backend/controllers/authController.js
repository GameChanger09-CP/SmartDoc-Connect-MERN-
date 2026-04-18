const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const { User, ActivityLog } = require('../models');
const { sendMail } = require('../utils/mailer');

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

        const user = await User.findOne({ username });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Invalid Credentials' });
        }
        
        if (user.role !== 'Main_Admin' && user.kyc_status !== 'Verified') {
            return res.status(403).json({ error: 'Access Denied: Your account is pending Admin Approval or has been Rejected.' });
        }
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        await ActivityLog.create({ user: user._id, action: 'Login', details: 'Logged in successfully' });
        
        res.json({ token, role: user.role, username: user.username });
    } catch (e) {
        console.error("Login Error:", e);
        res.status(500).json({ error: 'Server error during login' });
    }
};

exports.register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        
        if (!username || !email || !password) {
            if (req.file) fs.unlinkSync(req.file.path); // Cleanup file if validation fails
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Username or Email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const kyc_status = 'Pending'; 
        const gov_id = req.file ? req.file.path : null;

        const user = await User.create({ 
            username, 
            email, 
            password: hashedPassword, 
            role: role || 'Client', 
            kyc_status, 
            gov_id 
        });

        const emailContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #1e3a8a;">Registration Successful</h2>
                <p>Hello <b>${username}</b>,</p>
                <p>Your account has been created and is currently <b>PENDING APPROVAL</b>.</p>
                <p>The Main Administrator will review your uploaded ID. Once approved, you will be able to log in.</p>
                <div style="background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 20px 0;">
                    <strong>Status:</strong> Waiting for Admin Verification
                </div>
            </div>
        `;
        
        await sendMail(email, "Account Pending Approval - SmartDoc", emailContent);
        res.status(201).json({ status: 'Registered successfully. Wait for approval.', userId: user._id });

    } catch (e) { 
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // Cleanup on DB fail
        console.error("Register Error:", e);
        res.status(500).json({ error: 'Server error during registration.' }); 
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: "User not found" });

        if (username) user.username = username;
        if (email) user.email = email;
        if (password) user.password = await bcrypt.hash(password, 10);

        await user.save();
        res.json({ status: "Profile Updated" });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ error: "Update Failed" });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: "Invalid User: Email not found." });

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; 
        await user.save();

        const message = `
            <h3>Password Reset</h3>
            <p>Your token: <b>${resetToken}</b></p>
            <p>Copy this token and enter it in the app to reset your password.</p>
            <p>If you did not request this, please ignore this email.</p>
        `;
        await sendMail(user.email, "Password Reset Token", message);
        
        res.json({ status: "Email sent" });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ error: "Email could not be sent" });
    }
};

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

        res.json({ status: "Password Updated successfully" });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ error: "Server Error during password reset" });
    }
};