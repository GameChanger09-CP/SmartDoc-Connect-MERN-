const { Document, Department, ActivityLog, User } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { sendMail } = require('../utils/mailer');
const fs = require('fs'); // 🔥 ADDED: File System module for deleting files

exports.getDocs = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Dept_Admin') query = { current_dept: req.user.department, status: { $ne: 'Declined' } };
        else if (req.user.role === 'Faculty') query = { current_faculty: req.user._id, status: { $ne: 'Declined' } };
        else if (req.user.role === 'Client') query = { user: req.user._id };
        
        const docs = await Document.find(query).populate('user', 'username').populate('current_dept').populate('current_faculty', 'username').sort({ uploaded_at: -1 });
        res.json(docs);
    } catch (error) { res.status(500).json({ error: "Failed to fetch documents" }); }
};

exports.uploadDoc = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const depts = await Department.find();
        
        // AI Placeholder (Bypass)
        let targetDept = null; 
        let docStatus = 'Review_Required';
        let confidence = 0;

        const doc = await Document.create({
            user: req.user._id,
            file: req.file.path,
            tracking_id: uuidv4().slice(0, 8).toUpperCase(),
            status: docStatus,
            current_dept: null,
            ai_confidence: confidence,
            sent_to_dept_at: null
        });

        await ActivityLog.create({ user: req.user._id, action: 'Uploaded', details: req.file.originalname });
        await doc.populate('user', 'username email');

        sendMail(req.user.email, "Document Uploaded", `Your document (${doc.tracking_id}) has been uploaded and is pending review.`);
        
        const mainAdmins = await User.find({ role: 'Main_Admin' });
        mainAdmins.forEach(admin => sendMail(admin.email, "New Document", `User '${req.user.username}' has uploaded a new document.`));

        res.status(201).json(doc);
    } catch (error) { res.status(500).json({ error: "Failed to process upload" }); }
};

exports.routeDoc = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        
        const incomingDept = req.body.department_id;
        let dept = await Department.findById(incomingDept).catch(() => null);
        if (!dept) dept = await Department.findOne({ name: incomingDept });
        if (!dept) return res.status(400).json({ error: "Department not found." });
        
        const doc = await Document.findByIdAndUpdate(req.params.id, { 
            current_dept: dept._id, status: 'In_Progress', sent_to_dept_at: new Date(),
            dept_processed_at: null, final_report_sent_at: null, dept_report: null              
        }, { new: true });
        
        const deptAdmins = await User.find({ role: 'Dept_Admin', department: dept._id });
        deptAdmins.forEach(admin => sendMail(admin.email, "Document Routed", `A new document (${doc.tracking_id}) has been routed to your department.`));

        res.json({ status: 'Routed' });
    } catch (error) { res.status(500).json({ error: "Failed to route document" }); }
};

exports.assignToFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        
        const doc = await Document.findByIdAndUpdate(req.params.id, { 
            current_faculty: req.body.faculty_id, status: 'With_Faculty', assigned_to_faculty_at: new Date() 
        }, { new: true });
        
        const facultyUser = await User.findById(req.body.faculty_id);
        if (facultyUser) sendMail(facultyUser.email, "New Assignment", `You have been assigned document (${doc.tracking_id}) for review.`);

        res.json({ status: 'Assigned to Faculty' });
    } catch (error) { res.status(500).json({ error: "Failed to assign" }); }
};

// 🔥 TAKE BACK DOCUMENT FROM FACULTY (UNASSIGN) 🔥
exports.unassignFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });

        const doc = await Document.findById(req.params.id).populate('current_faculty');
        
        // Reset to In_Progress so Dept Admin can assign to someone else
        await Document.findByIdAndUpdate(req.params.id, {
            status: 'In_Progress',
            current_faculty: null
        });

        // Notify the Faculty that it was revoked
        if (doc.current_faculty) {
            sendMail(doc.current_faculty.email, "Assignment Revoked", `The document (${doc.tracking_id}) has been unassigned from your queue by the Dept Admin.`);
        }

        res.json({ status: 'Unassigned Successfully' });
    } catch (error) { res.status(500).json({ error: "Failed to unassign" }); }
};

exports.submitReport = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Report PDF required" });
        
        const updateData = { dept_report: req.file.path };
        if (req.user.role === 'Faculty') {
            updateData.status = 'Faculty_Reported'; updateData.faculty_processed_at = new Date();
        } else if (req.user.role === 'Dept_Admin') {
            updateData.status = 'Dept_Reported'; updateData.dept_processed_at = new Date();
        }

        const doc = await Document.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('current_dept');
        
        if (req.user.role === 'Faculty') {
            const deptAdmins = await User.find({ role: 'Dept_Admin', department: doc.current_dept._id });
            deptAdmins.forEach(admin => sendMail(admin.email, "Faculty Report Submitted", `A report has been submitted for (${doc.tracking_id}).`));
        } else {
            const mainAdmins = await User.find({ role: 'Main_Admin' });
            mainAdmins.forEach(admin => sendMail(admin.email, "Department Report Ready", `Report ready for (${doc.tracking_id}).`));
        }

        res.json({ status: 'Report Submitted' });
    } catch (error) { res.status(500).json({ error: "Failed to submit report" }); }
};

exports.approveFacultyReport = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findByIdAndUpdate(req.params.id, { 
            status: 'Dept_Reported', dept_processed_at: new Date() 
        }, { new: true });

        const mainAdmins = await User.find({ role: 'Main_Admin' });
        mainAdmins.forEach(admin => sendMail(admin.email, "Report Approved", `Dept Admin approved report for (${doc.tracking_id}).`));

        res.json({ status: 'Forwarded to Main Admin' });
    } catch (error) { res.status(500).json({ error: "Failed to forward" }); }
};

// 🔥 REJECT FACULTY REPORT & DELETE FILE FROM SERVER 🔥
exports.rejectFacultyReport = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        
        const doc = await Document.findById(req.params.id).populate('current_faculty');
        const facultyEmail = doc.current_faculty ? doc.current_faculty.email : null;

        // 🗑️ DELETE THE REJECTED REPORT FILE FROM SERVER
        if (doc.dept_report) {
            fs.unlink(doc.dept_report, (err) => {
                if (err) console.error("❌ Failed to delete rejected report:", err);
                else console.log("🗑️ Deleted rejected report file:", doc.dept_report);
            });
        }

        // Reset Status & Clear Fields
        await Document.findByIdAndUpdate(req.params.id, { 
            status: 'In_Progress', 
            dept_report: null, // Remove DB Reference
            faculty_processed_at: null,
            current_faculty: null // Optional: Unassign faculty to allow re-routing to ANYONE
        });

        if (facultyEmail) {
            sendMail(facultyEmail, "Report Rejected", `Your report for document (${doc.tracking_id}) was rejected. The file has been deleted and the task reset.`);
        }

        res.json({ status: 'Report Rejected, File Deleted & Reset' });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Failed to reject report" }); 
    }
};

exports.forwardToClient = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'Completed', final_report_sent_at: new Date() }, { new: true }).populate('user');
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        
        sendMail(doc.user.email, "Verification Complete", `Your document (${doc.tracking_id}) has been verified.`);

        res.json({ status: 'Forwarded' });
    } catch (error) { res.status(500).json({ error: "Failed to forward report" }); }
};

exports.toggleFreeze = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        doc.is_frozen = !doc.is_frozen;
        await doc.save();
        res.json({ status: 'Toggled Freeze' });
    } catch (error) { res.status(500).json({ error: "Failed to toggle freeze" }); }
};

exports.declineDoc = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'Declined' }, { new: true }).populate('user');
        sendMail(doc.user.email, "Document Declined", `Your document (${doc.tracking_id}) was declined.`);
        res.json({ status: 'Declined' });
    } catch (error) { res.status(500).json({ error: "Server error while declining" }); }
};

exports.returnDoc = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (req.user.role === 'Faculty') {
            doc.status = 'In_Progress'; doc.current_faculty = null; await doc.save();
            const deptAdmins = await User.find({ role: 'Dept_Admin', department: doc.current_dept });
            deptAdmins.forEach(admin => sendMail(admin.email, "Returned by Faculty", `Doc (${doc.tracking_id}) returned to you.`));
        } else if (req.user.role === 'Dept_Admin') {
            doc.status = 'Returned_To_Main'; doc.current_dept = null; await doc.save();
            const mainAdmins = await User.find({ role: 'Main_Admin' });
            mainAdmins.forEach(admin => sendMail(admin.email, "Returned by Dept", `Doc (${doc.tracking_id}) returned to you.`));
        }
        res.json({ status: 'Document Returned' });
    } catch (error) { res.status(500).json({ error: "Failed to return" }); }
};