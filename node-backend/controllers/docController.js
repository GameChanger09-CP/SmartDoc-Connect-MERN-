const { Document, Department, ActivityLog, User } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { sendMail } = require('../utils/mailer');
const fs = require('fs');

// Helper: Add Note
const addNote = (doc, user, message) => {
    if (message && message.trim()) {
        doc.notes.push({ sender: user.username, role: user.role, message: message.trim() });
    }
};

exports.getDocs = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Dept_Admin') query = { current_dept: req.user.department, status: { $ne: 'Declined' } };
        else if (req.user.role === 'Faculty') query = { current_faculty: req.user._id, status: { $ne: 'Declined' } };
        else if (req.user.role === 'Client') query = { user: req.user._id };
        
        let docs = await Document.find(query)
            .populate('user', 'username')
            .populate('current_dept')
            .populate('current_faculty', 'username')
            .sort({ uploaded_at: -1 });

        // 🔥 PRIVACY FILTER: Clients only see Main_Admin notes 🔥
        if (req.user.role === 'Client') {
            docs = docs.map(doc => {
                const d = doc.toObject(); // Convert Mongoose Doc to Plain Object
                d.notes = d.notes.filter(n => n.role === 'Main_Admin'); // Filter notes
                return d;
            });
        }

        res.json(docs);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Failed to fetch documents" }); 
    }
};

exports.uploadDoc = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        const depts = await Department.find();
        
        const doc = await Document.create({
            user: req.user._id,
            file: req.file.path,
            tracking_id: uuidv4().slice(0, 8).toUpperCase(),
            status: 'Review_Required',
            current_dept: null,
            ai_confidence: 0,
            sent_to_dept_at: null
        });

        addNote(doc, req.user, "Document Uploaded.");
        await doc.save();

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
        const doc = await Document.findById(req.params.id);
        const dept = await Department.findById(req.body.department_id);
        
        doc.current_dept = dept._id;
        doc.status = 'In_Progress';
        doc.sent_to_dept_at = new Date();
        addNote(doc, req.user, req.body.note || "Routed to Department");
        await doc.save();
        
        const deptAdmins = await User.find({ role: 'Dept_Admin', department: dept._id });
        deptAdmins.forEach(admin => sendMail(admin.email, "Document Routed", `Doc (${doc.tracking_id}) routed to you.`));

        res.json({ status: 'Routed' });
    } catch (error) { res.status(500).json({ error: "Route failed" }); }
};

exports.assignToFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findById(req.params.id);
        
        doc.current_faculty = req.body.faculty_id;
        doc.status = 'With_Faculty';
        doc.assigned_to_faculty_at = new Date();
        addNote(doc, req.user, req.body.note || "Assigned to Faculty");
        await doc.save();
        
        const facultyUser = await User.findById(req.body.faculty_id);
        if (facultyUser) sendMail(facultyUser.email, "Assigned", `Doc (${doc.tracking_id}) assigned to you.`);

        res.json({ status: 'Assigned' });
    } catch (error) { res.status(500).json({ error: "Assign failed" }); }
};

exports.unassignFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findById(req.params.id).populate('current_faculty');
        
        const oldFaculty = doc.current_faculty;
        doc.status = 'In_Progress';
        doc.current_faculty = null;
        addNote(doc, req.user, "Assignment Revoked (Taken Back)");
        await doc.save();

        if (oldFaculty) sendMail(oldFaculty.email, "Revoked", `Doc (${doc.tracking_id}) unassigned.`);
        res.json({ status: 'Unassigned' });
    } catch (error) { res.status(500).json({ error: "Failed to unassign" }); }
};

exports.submitReport = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "PDF required" });
        const doc = await Document.findById(req.params.id).populate('current_dept');
        
        doc.dept_report = req.file.path;
        if (req.user.role === 'Faculty') { doc.status = 'Faculty_Reported'; doc.faculty_processed_at = new Date(); }
        else { doc.status = 'Dept_Reported'; doc.dept_processed_at = new Date(); }
        
        addNote(doc, req.user, req.body.note || "Report Submitted");
        await doc.save();
        
        if (req.user.role === 'Faculty') {
            const deptAdmins = await User.find({ role: 'Dept_Admin', department: doc.current_dept._id });
            deptAdmins.forEach(admin => sendMail(admin.email, "Faculty Report", `Report for (${doc.tracking_id}).`));
        } else {
            const mainAdmins = await User.find({ role: 'Main_Admin' });
            mainAdmins.forEach(admin => sendMail(admin.email, "Dept Report", `Report ready for (${doc.tracking_id}).`));
        }
        res.json({ status: 'Reported' });
    } catch (error) { res.status(500).json({ error: "Report failed" }); }
};

exports.approveFacultyReport = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findById(req.params.id);
        
        doc.status = 'Dept_Reported';
        doc.dept_processed_at = new Date();
        addNote(doc, req.user, req.body.note || "Report Approved");
        await doc.save();

        const mainAdmins = await User.find({ role: 'Main_Admin' });
        mainAdmins.forEach(admin => sendMail(admin.email, "Report Approved", `Dept approved report for (${doc.tracking_id}).`));
        res.json({ status: 'Approved' });
    } catch (error) { res.status(500).json({ error: "Approval failed" }); }
};

exports.rejectFacultyReport = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findById(req.params.id).populate('current_faculty');
        
        // Delete File
        if (doc.dept_report) {
            fs.unlink(doc.dept_report, (err) => { if (err) console.error("Del failed:", err); });
        }

        doc.status = 'In_Progress';
        doc.dept_report = null;
        doc.faculty_processed_at = null;
        doc.current_faculty = null;
        
        addNote(doc, req.user, req.body.note || "Report Rejected & Reset");
        await doc.save();

        if (doc.current_faculty) sendMail(doc.current_faculty.email, "Report Rejected", `Report for (${doc.tracking_id}) rejected.`);
        res.json({ status: 'Rejected' });
    } catch (error) { res.status(500).json({ error: "Reject failed" }); }
};

exports.forwardToClient = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'Completed', final_report_sent_at: new Date() }, { new: true }).populate('user');
        
        addNote(doc, req.user, "Forwarded to Client");
        await doc.save();
        
        sendMail(doc.user.email, "Complete", `Doc ${doc.tracking_id} verified.`);
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
        const doc = await Document.findById(req.params.id).populate('user');
        doc.status = 'Declined';
        addNote(doc, req.user, req.body.note || "Declined");
        await doc.save();
        sendMail(doc.user.email, "Declined", `Doc (${doc.tracking_id}) declined.`);
        res.json({ status: 'Declined' });
    } catch (error) { res.status(500).json({ error: "Decline failed" }); }
};

exports.returnDoc = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        addNote(doc, req.user, req.body.note || "Returned");
        
        if (req.user.role === 'Faculty') { doc.status = 'In_Progress'; doc.current_faculty = null; }
        else { doc.status = 'Returned_To_Main'; doc.current_dept = null; }
        
        await doc.save();
        res.json({ status: 'Returned' });
    } catch (error) { res.status(500).json({ error: "Return failed" }); }
};