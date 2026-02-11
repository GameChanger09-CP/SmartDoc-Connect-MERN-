const { Document, Department, ActivityLog, User } = require('../models');
const { analyzeDocumentWithGemini } = require('../utils/gemini');
const { v4: uuidv4 } = require('uuid');
const { sendMail } = require('../utils/mailer'); // <-- NEW: Import our mailer

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
        
        // ⏸️ AI disabled for manual testing. Set to null.
        console.log(`📥 File uploaded: ${req.file.path}. Bypassing AI.`);
        const aiResult = null; 
        
        let targetDept = null;
        let docStatus = 'Review_Required';
        let confidence = 0;

        if (aiResult && confidence > 80) {
            targetDept = depts.find(d => d.name.toLowerCase() === aiResult.department?.toLowerCase());
            if (targetDept) docStatus = 'In_Progress';
        }

        const doc = await Document.create({
            user: req.user._id,
            file: req.file.path,
            tracking_id: uuidv4().slice(0, 8).toUpperCase(),
            status: docStatus,
            current_dept: targetDept?._id || null,
            ai_confidence: confidence,
            sent_to_dept_at: targetDept ? new Date() : null
        });

        await ActivityLog.create({ user: req.user._id, action: 'Uploaded', details: req.file.originalname });
        await doc.populate('user', 'username email');

        // ✉️ EMAIL 1: Notify the Client
        sendMail(req.user.email, "Document Uploaded Successfully", `Your document (Tracking ID: ${doc.tracking_id}) has been securely uploaded to SmartDoc Connect and is awaiting Admin review.`);
        
        // ✉️ EMAIL 2: Notify all Main Admins
        const mainAdmins = await User.find({ role: 'Main_Admin' });
        mainAdmins.forEach(admin => sendMail(admin.email, "New Document Pending Routing", `Client '${req.user.username}' has uploaded a new document (${doc.tracking_id}). Please log in to route it.`));

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
        
        // ✉️ EMAIL 3: Notify the specific Dept Admins
        const deptAdmins = await User.find({ role: 'Dept_Admin', department: dept._id });
        deptAdmins.forEach(admin => sendMail(admin.email, "New Document Routed to Department", `A new document (${doc.tracking_id}) has been routed to your department by the Main Admin. Please review or assign it to faculty.`));

        res.json({ status: 'Routed' });
    } catch (error) { res.status(500).json({ error: "Failed to route document" }); }
};

exports.assignToFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        
        const doc = await Document.findByIdAndUpdate(req.params.id, { 
            current_faculty: req.body.faculty_id, status: 'With_Faculty', assigned_to_faculty_at: new Date() 
        }, { new: true });
        
        // ✉️ EMAIL 4: Notify the assigned Faculty
        const facultyUser = await User.findById(req.body.faculty_id);
        if (facultyUser) sendMail(facultyUser.email, "New Document Assigned", `You have been assigned document (${doc.tracking_id}) for review. Please log in to process it and upload your report.`);

        res.json({ status: 'Assigned to Faculty' });
    } catch (error) { res.status(500).json({ error: "Failed to assign" }); }
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
        
        // ✉️ EMAIL 5: Notify based on who submitted
        if (req.user.role === 'Faculty') {
            const deptAdmins = await User.find({ role: 'Dept_Admin', department: doc.current_dept._id });
            deptAdmins.forEach(admin => sendMail(admin.email, "Faculty Report Submitted", `A faculty member has submitted a report for document (${doc.tracking_id}). Please log in to approve and forward it.`));
        } else {
            const mainAdmins = await User.find({ role: 'Main_Admin' });
            mainAdmins.forEach(admin => sendMail(admin.email, "Department Report Ready", `The department has finalized the report for document (${doc.tracking_id}). It is ready to be forwarded to the client.`));
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

        // ✉️ EMAIL 6: Notify Main Admin of approval
        const mainAdmins = await User.find({ role: 'Main_Admin' });
        mainAdmins.forEach(admin => sendMail(admin.email, "Department Report Ready", `A Department Admin has approved the faculty report for document (${doc.tracking_id}). It is ready to be forwarded to the client.`));

        res.json({ status: 'Forwarded to Main Admin' });
    } catch (error) { res.status(500).json({ error: "Failed to forward" }); }
};

exports.forwardToClient = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'Completed', final_report_sent_at: new Date() }, { new: true }).populate('user');
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        
        // ✉️ EMAIL 7: Notify Client it is done!
        sendMail(doc.user.email, "Document Verification Completed ✅", `Great news! The verification for your document (${doc.tracking_id}) is completed. Log into your dashboard to download your final report.`);

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
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        
        // ✉️ EMAIL 8: Notify Client it was declined
        sendMail(doc.user.email, "Document Declined", `Unfortunately, your document (${doc.tracking_id}) was declined during the review process. Please review your submission and try again.`);

        res.json({ status: 'Declined' });
    } catch (error) { res.status(500).json({ error: "Server error while declining" }); }
};

exports.returnDoc = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        
        if (req.user.role === 'Faculty') {
            doc.status = 'In_Progress'; doc.current_faculty = null; await doc.save();
            // ✉️ EMAIL 9: Notify Dept Admin it was returned
            const deptAdmins = await User.find({ role: 'Dept_Admin', department: doc.current_dept });
            deptAdmins.forEach(admin => sendMail(admin.email, "Document Returned by Faculty", `Document (${doc.tracking_id}) was returned to your inbox by the assigned faculty member. Please review and re-assign.`));
        } else if (req.user.role === 'Dept_Admin') {
            doc.status = 'Returned_To_Main'; doc.current_dept = null; await doc.save();
            // ✉️ EMAIL 10: Notify Main Admin it was returned
            const mainAdmins = await User.find({ role: 'Main_Admin' });
            mainAdmins.forEach(admin => sendMail(admin.email, "Document Returned by Department", `Document (${doc.tracking_id}) was returned to you by the Department Admin. It needs to be re-routed.`));
        }
        
        res.json({ status: 'Document Returned' });
    } catch (error) { res.status(500).json({ error: "Failed to return" }); }
};