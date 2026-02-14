const { Document, Department, ActivityLog, User } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { sendMail } = require('../utils/mailer');

exports.getDocs = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Dept_Admin') query = { current_dept: req.user.department, status: { $ne: 'Declined' } };
        else if (req.user.role === 'Faculty') query = { current_faculty: req.user._id, status: { $ne: 'Declined' } };
        else if (req.user.role === 'Client') query = { user: req.user._id };
        
        const docs = await Document.find(query).populate('user', 'username').populate('current_dept').populate('current_faculty', 'username').sort({ uploaded_at: -1 });
        res.json(docs);
    } catch (error) { res.status(500).json({ error: "Failed to fetch" }); }
};

exports.uploadDoc = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file" });
        const depts = await Department.find();
        
        let targetDept = null; 
        let docStatus = 'Review_Required';

        const doc = await Document.create({
            user: req.user._id,
            file: req.file.path,
            tracking_id: uuidv4().slice(0, 8).toUpperCase(),
            status: docStatus,
            current_dept: null,
            ai_confidence: 0,
            sent_to_dept_at: null
        });

        await ActivityLog.create({ user: req.user._id, action: 'Uploaded', details: req.file.originalname });
        await doc.populate('user', 'username email');
        sendMail(req.user.email, "Uploaded", `Doc ${doc.tracking_id} received.`);
        
        const mainAdmins = await User.find({ role: 'Main_Admin' });
        mainAdmins.forEach(admin => sendMail(admin.email, "New Document", `User '${req.user.username}' uploaded a doc.`));

        res.status(201).json(doc);
    } catch (error) { res.status(500).json({ error: "Upload failed" }); }
};

exports.routeDoc = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findByIdAndUpdate(req.params.id, { 
            current_dept: req.body.department_id, status: 'In_Progress', sent_to_dept_at: new Date() 
        }, { new: true });
        res.json({ status: 'Routed' });
    } catch (error) { res.status(500).json({ error: "Route failed" }); }
};

exports.assignToFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        await Document.findByIdAndUpdate(req.params.id, { 
            current_faculty: req.body.faculty_id, status: 'With_Faculty', assigned_to_faculty_at: new Date() 
        });
        res.json({ status: 'Assigned' });
    } catch (error) { res.status(500).json({ error: "Assign failed" }); }
};

exports.submitReport = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "PDF required" });
        const update = { dept_report: req.file.path };
        if (req.user.role === 'Faculty') { update.status = 'Faculty_Reported'; update.faculty_processed_at = new Date(); }
        else { update.status = 'Dept_Reported'; update.dept_processed_at = new Date(); }
        
        await Document.findByIdAndUpdate(req.params.id, update);
        res.json({ status: 'Reported' });
    } catch (error) { res.status(500).json({ error: "Report failed" }); }
};

exports.approveFacultyReport = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        await Document.findByIdAndUpdate(req.params.id, { status: 'Dept_Reported', dept_processed_at: new Date() });
        res.json({ status: 'Approved' });
    } catch (error) { res.status(500).json({ error: "Approval failed" }); }
};

exports.forwardToClient = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'Completed', final_report_sent_at: new Date() }).populate('user');
        sendMail(doc.user.email, "Verification Complete", `Doc ${doc.tracking_id} verified.`);
        res.json({ status: 'Forwarded' });
    } catch (error) { res.status(500).json({ error: "Forward failed" }); }
};

exports.toggleFreeze = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        doc.is_frozen = !doc.is_frozen;
        await doc.save();
        res.json({ status: 'Toggled' });
    } catch (error) { res.status(500).json({ error: "Freeze failed" }); }
};

exports.declineDoc = async (req, res) => {
    try {
        await Document.findByIdAndUpdate(req.params.id, { status: 'Declined' });
        res.json({ status: 'Declined' });
    } catch (error) { res.status(500).json({ error: "Decline failed" }); }
};

exports.returnDoc = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (req.user.role === 'Faculty') { doc.status = 'In_Progress'; doc.current_faculty = null; }
        else { doc.status = 'Returned_To_Main'; doc.current_dept = null; }
        await doc.save();
        res.json({ status: 'Returned' });
    } catch (error) { res.status(500).json({ error: "Return failed" }); }
};  