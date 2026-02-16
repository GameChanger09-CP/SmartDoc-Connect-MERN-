const { Document, Department, ActivityLog, User } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { sendMail } = require('../utils/mailer');
const fs = require('fs');
const path = require('path');

// Helper to append notes
const addNote = (doc, user, message) => {
    if (message && message.trim() !== "") {
        doc.notes.push({
            sender: user.username,
            role: user.role,
            message: message.trim()
        });
    }
};

// --- 1. GET DOCUMENTS (With Privacy Filter) ---
exports.getDocs = async (req, res) => {
    try {
        let query = {};
        
        if (req.user.role === 'Dept_Admin') {
            query = { current_dept: req.user.department, status: { $ne: 'Declined' } };
        } else if (req.user.role === 'Faculty') {
            query = { current_faculty: req.user._id, status: { $ne: 'Declined' } };
        } else if (req.user.role === 'Client') {
            query = { user: req.user._id };
        } else if (req.user.role === 'Main_Admin') {
            query = {}; 
        }
        
        let docs = await Document.find(query)
            .populate('user', 'username')
            .populate('current_dept')
            .populate('current_faculty', 'username')
            .sort({ uploaded_at: -1 });

        // Privacy Filter: Clients only see Main_Admin notes
        if (req.user.role === 'Client') {
            docs = docs.map(doc => {
                const d = doc.toObject();
                d.notes = d.notes.filter(n => n.role === 'Main_Admin');
                return d;
            });
        }

        res.json(docs);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Failed to fetch documents" }); 
    }
};

// --- 2. UPLOAD DOCUMENT (Supports Admin Upload for Client) ---
exports.uploadDoc = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        
        // Determine Owner: Default to logged-in user
        let userId = req.user._id;
        let uploaderRole = req.user.role;
        
        // If Main Admin is uploading on behalf of someone else
        if (req.user.role === 'Main_Admin' && req.body.target_user_id) {
            userId = req.body.target_user_id; 
        }

        const doc = await Document.create({
            user: userId,
            file: req.file.path,
            tracking_id: uuidv4().slice(0, 8).toUpperCase(),
            status: 'Review_Required',
            current_dept: null,
            ai_confidence: 0,
            sent_to_dept_at: null
        });

        // Add Initial Note
        const noteMsg = uploaderRole === 'Main_Admin' ? "Uploaded by Admin (Offline Mode)." : "Document Uploaded.";
        addNote(doc, req.user, noteMsg);
        await doc.save();

        await ActivityLog.create({ 
            user: req.user._id, 
            action: 'Uploaded', 
            details: `${req.file.originalname} (Tracking: ${doc.tracking_id})` 
        });
        
        // Notify Client
        const clientUser = await User.findById(userId);
        if (clientUser) {
            sendMail(clientUser.email, "Document Received", `Your document (${doc.tracking_id}) has been uploaded to the system.`);
        }
        
        // Notify Admin if Client uploaded
        if (uploaderRole === 'Client') {
            const mainAdmins = await User.find({ role: 'Main_Admin' });
            mainAdmins.forEach(admin => sendMail(admin.email, "New Document", `User uploaded a doc (${doc.tracking_id}).`));
        }

        res.status(201).json(doc);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Upload failed" }); 
    }
};

// --- 3. ROUTE TO DEPARTMENT ---
exports.routeDoc = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        
        const doc = await Document.findById(req.params.id);
        const dept = await Department.findById(req.body.department_id);
        
        if (!dept) return res.status(404).json({ error: "Department not found" });

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

// --- 4. ASSIGN TO FACULTY ---
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

// --- 5. UNASSIGN FACULTY (REVOKE) ---
exports.unassignFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });

        const doc = await Document.findById(req.params.id).populate('current_faculty');
        const oldFaculty = doc.current_faculty;
        
        doc.status = 'In_Progress';
        doc.current_faculty = null;
        
        addNote(doc, req.user, "Assignment Revoked (Taken Back)");
        await doc.save();

        if (oldFaculty) {
            sendMail(oldFaculty.email, "Revoked", `Doc (${doc.tracking_id}) unassigned.`);
        }

        res.json({ status: 'Unassigned' });
    } catch (error) { res.status(500).json({ error: "Failed to unassign" }); }
};

// --- 6. SUBMIT REPORT (Faculty or Dept) ---
exports.submitReport = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Report PDF required" });
        const doc = await Document.findById(req.params.id).populate('current_dept');

        doc.dept_report = req.file.path;
        
        if (req.user.role === 'Faculty') { 
            doc.status = 'Faculty_Reported'; 
            doc.faculty_processed_at = new Date(); 
        } else { 
            doc.status = 'Dept_Reported'; 
            doc.dept_processed_at = new Date(); 
        }

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

// --- 7. APPROVE FACULTY REPORT (Dept Admin) ---
exports.approveFacultyReport = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findById(req.params.id);
        
        doc.status = 'Dept_Reported';
        doc.dept_processed_at = new Date();
        
        addNote(doc, req.user, req.body.note || "Report Approved by Dept");
        await doc.save();

        const mainAdmins = await User.find({ role: 'Main_Admin' });
        mainAdmins.forEach(admin => sendMail(admin.email, "Report Approved", `Dept approved report for (${doc.tracking_id}).`));

        res.json({ status: 'Approved' });
    } catch (error) { res.status(500).json({ error: "Approval failed" }); }
};

// --- 8. REJECT FACULTY REPORT (Delete File + Reset) ---
exports.rejectFacultyReport = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        
        const doc = await Document.findById(req.params.id).populate('current_faculty');
        const facultyEmail = doc.current_faculty ? doc.current_faculty.email : null;

        // Delete the rejected file physically
        if (doc.dept_report) {
            fs.unlink(doc.dept_report, (err) => { 
                if (err) console.error("Del failed:", err); 
                else console.log("Rejected report deleted from server.");
            });
        }

        doc.status = 'In_Progress';
        doc.dept_report = null;
        doc.faculty_processed_at = null;
        doc.current_faculty = null;

        addNote(doc, req.user, req.body.note || "Report Rejected & Reset");
        await doc.save();

        if (facultyEmail) sendMail(facultyEmail, "Report Rejected", `Report for (${doc.tracking_id}) rejected.`);

        res.json({ status: 'Rejected' });
    } catch (error) { res.status(500).json({ error: "Reject failed" }); }
};

// --- 9. FORWARD TO CLIENT (Final Step) ---
exports.forwardToClient = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'Completed', final_report_sent_at: new Date() }, { new: true }).populate('user');
        
        addNote(doc, req.user, "Process Completed. Final Report Forwarded.");
        await doc.save();

        sendMail(doc.user.email, "Verification Complete", `Doc ${doc.tracking_id} verified. You can now download the report.`);
        res.json({ status: 'Forwarded' });
    } catch (error) { res.status(500).json({ error: "Forward failed" }); }
};

// --- 10. TOGGLE FREEZE (Lock Document) ---
exports.toggleFreeze = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findById(req.params.id);
        doc.is_frozen = !doc.is_frozen;
        await doc.save();
        res.json({ status: 'Toggled' });
    } catch (error) { res.status(500).json({ error: "Freeze failed" }); }
};

// --- 11. DECLINE DOCUMENT (Reject application) ---
exports.declineDoc = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        const doc = await Document.findById(req.params.id).populate('user');
        doc.status = 'Declined';
        
        addNote(doc, req.user, req.body.note || "Document Declined/Blocked");
        await doc.save();

        sendMail(doc.user.email, "Document Declined", `Your document (${doc.tracking_id}) was declined.`);
        res.json({ status: 'Declined' });
    } catch (error) { res.status(500).json({ error: "Decline failed" }); }
};

// --- 12. RETURN DOCUMENT (Step Back) ---
exports.returnDoc = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        
        addNote(doc, req.user, req.body.note || "Returned to Previous Step");

        if (req.user.role === 'Faculty') { 
            doc.status = 'In_Progress'; 
            doc.current_faculty = null; 
        } else { 
            doc.status = 'Returned_To_Main'; 
            doc.current_dept = null; 
        }
        await doc.save();
        res.json({ status: 'Returned' });
    } catch (error) { res.status(500).json({ error: "Return failed" }); }
};

// --- 13. PUBLIC PAYMENT INFO (For Email Links) ---
exports.getPublicPaymentInfo = async (req, res) => {
    try {
        const { docId, installmentId } = req.params;
        const doc = await Document.findById(docId);
        
        if (!doc) return res.status(404).json({ error: "Document not found" });
        
        const installment = doc.installments.id(installmentId);
        if (!installment) return res.status(404).json({ error: "Installment not found" });
        if (installment.status === 'Paid') return res.status(400).json({ error: "Installment already Paid" });

        res.json({
            tracking_id: doc.tracking_id,
            amount: installment.amount,
            razorpay_order_id: installment.razorpay_order_id,
            key: process.env.RAZORPAY_KEY_ID // Send key to frontend
        });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Error fetching payment details" }); 
    }
};