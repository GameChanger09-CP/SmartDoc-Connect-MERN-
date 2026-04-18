const { Document, Department, ActivityLog, User } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { sendMail } = require('../utils/mailer');
const { analyzeDocumentWithGemini } = require('../utils/gemini');
const mongoose = require('mongoose');
const fs = require('fs');

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const addNote = (doc, user, message) => {
    if (message && message.trim() !== "") {
        doc.notes.push({
            sender: user.username,
            role: user.role,
            message: message.trim()
        });
    }
};

exports.getDocs = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Dept_Admin') {
            query = { current_dept: { $in: [req.user.department] }, status: { $ne: 'Declined' } };
        } else if (req.user.role === 'Faculty') {
            query = { current_faculty: { $in: [req.user._id] }, status: { $ne: 'Declined' } };
        } else if (req.user.role === 'Client') {
            query = { user: req.user._id };
        }
        
        let docs = await Document.find(query)
            .populate('user', 'username email')
            .populate('current_dept')
            .populate('current_faculty', 'username email')
            .sort({ uploaded_at: -1 });

        if (req.user.role === 'Client') {
            docs = docs.map(doc => {
                const d = doc.toObject();
                d.notes = d.notes.filter(n => n.role === 'Main_Admin');
                return d;
            });
        }
        res.json(docs);
    } catch (error) { 
        console.error("Get Docs Error:", error);
        res.status(500).json({ error: "Failed to fetch documents" }); 
    }
};

exports.uploadDoc = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        
        let userId = req.user._id;
        let uploaderRole = req.user.role;
        
        if (req.user.role === 'Main_Admin' && req.body.target_user_id) {
            if (!isValidId(req.body.target_user_id)) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: "Invalid target user ID" });
            }
            userId = req.body.target_user_id; 
        }

        const doc = await Document.create({
            user: userId,
            file: req.file.path,
            tracking_id: uuidv4().slice(0, 8).toUpperCase(),
            status: 'Review_Required'
        });

        addNote(doc, req.user, uploaderRole === 'Main_Admin' ? "Uploaded by Admin (Offline Mode)." : "Document Uploaded.");
        await doc.save();

        // --- AI INTEGRATION: Safe execution ---
        try {
            const departments = await Department.find();
            if (departments.length > 0) {
                const deptNames = departments.map(d => d.name);
                const aiResult = await analyzeDocumentWithGemini(req.file.path, deptNames);
                if (aiResult && aiResult.department) {
                    doc.ai_suggested_dept = aiResult.department;
                    doc.ai_confidence = aiResult.confidence || 0;
                    await doc.save();
                }
            }
        } catch (aiError) {
            console.error("Gemini AI Analysis Error:", aiError.message || aiError);
            // Non-blocking: Document is uploaded even if AI sorting fails
        }

        await ActivityLog.create({ 
            user: req.user._id, 
            action: 'Uploaded', 
            details: `${req.file.originalname} (Tracking: ${doc.tracking_id})` 
        });
        
        const clientUser = await User.findById(userId);
        if (clientUser) {
            sendMail(clientUser.email, "Document Received", `Your document (${doc.tracking_id}) has been uploaded to the system.`);
        }
        
        if (uploaderRole === 'Client') {
            const mainAdmins = await User.find({ role: 'Main_Admin' });
            mainAdmins.forEach(admin => sendMail(admin.email, "New Document", `User uploaded a doc (${doc.tracking_id}).`));
        }

        res.status(201).json(doc);
    } catch (error) { 
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("Upload Error:", error);
        res.status(500).json({ error: "Upload failed" }); 
    }
};

exports.routeDoc = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        
        const { department_ids, note } = req.body;
        if (!isValidId(req.params.id) || !Array.isArray(department_ids) || department_ids.length === 0) {
            return res.status(400).json({ error: "Invalid ID parameters. Requires array of department_ids" });
        }

        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: "Document not found" });

        const depts = await Department.find({ _id: { $in: department_ids } });
        if (!depts.length) return res.status(404).json({ error: "Departments not found" });

        doc.current_dept = depts.map(d => d._id);
        doc.status = 'In_Progress';
        doc.sent_to_dept_at = new Date();
        
        addNote(doc, req.user, note || "Routed to Department(s)");
        await doc.save();
        
        const deptAdmins = await User.find({ role: 'Dept_Admin', department: { $in: doc.current_dept } });
        deptAdmins.forEach(admin => sendMail(admin.email, "Document Routed", `Doc (${doc.tracking_id}) routed to your department.`));

        res.json({ status: 'Routed' });
    } catch (error) { 
        console.error("Route Error:", error);
        res.status(500).json({ error: "Route failed" }); 
    }
};

exports.assignToFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        
        const { faculty_ids, note } = req.body;
        if (!isValidId(req.params.id) || !Array.isArray(faculty_ids) || faculty_ids.length === 0) {
            return res.status(400).json({ error: "Invalid ID parameters. Requires array of faculty_ids" });
        }
        
        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: "Document not found" });

        doc.current_faculty = faculty_ids;
        doc.status = 'With_Faculty';
        doc.assigned_to_faculty_at = new Date();

        addNote(doc, req.user, note || "Assigned to Faculty");
        await doc.save();
        
        const facultyUsers = await User.find({ _id: { $in: faculty_ids } });
        facultyUsers.forEach(f => sendMail(f.email, "Assigned", `Doc (${doc.tracking_id}) assigned to you for review.`));

        res.json({ status: 'Assigned' });
    } catch (error) { 
        console.error("Assign Error:", error);
        res.status(500).json({ error: "Assign failed" }); 
    }
};

exports.unassignFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid Document ID" });

        const doc = await Document.findById(req.params.id).populate('current_faculty');
        if (!doc) return res.status(404).json({ error: "Document not found" });

        const oldFaculties = doc.current_faculty || [];
        doc.status = 'In_Progress';
        doc.current_faculty = [];
        
        addNote(doc, req.user, "Assignment Revoked (Taken Back)");
        await doc.save();

        oldFaculties.forEach(f => {
            if(f.email) sendMail(f.email, "Revoked", `Doc (${doc.tracking_id}) unassigned from your queue.`);
        });

        res.json({ status: 'Unassigned' });
    } catch (error) { 
        console.error("Unassign Error:", error);
        res.status(500).json({ error: "Failed to unassign" }); 
    }
};

exports.submitReport = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Report PDF required" });
        if (!isValidId(req.params.id)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: "Invalid Document ID" });
        }

        const doc = await Document.findById(req.params.id).populate('current_dept');
        if (!doc) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: "Document not found" });
        }

        if (doc.dept_report && fs.existsSync(doc.dept_report)) {
            fs.unlinkSync(doc.dept_report);
        }

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
            const deptIds = doc.current_dept.map(d => d._id ? d._id : d);
            const deptAdmins = await User.find({ role: 'Dept_Admin', department: { $in: deptIds } });
            deptAdmins.forEach(admin => sendMail(admin.email, "Faculty Report", `Report available for (${doc.tracking_id}).`));
        } else {
            const mainAdmins = await User.find({ role: 'Main_Admin' });
            mainAdmins.forEach(admin => sendMail(admin.email, "Dept Report", `Finalized report ready for (${doc.tracking_id}).`));
        }

        res.json({ status: 'Reported' });
    } catch (error) { 
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("Submit Report Error:", error);
        res.status(500).json({ error: "Report failed" }); 
    }
};

exports.approveFacultyReport = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid Document ID" });

        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: "Document not found" });
        
        doc.status = 'Dept_Reported';
        doc.dept_processed_at = new Date();
        
        addNote(doc, req.user, req.body.note || "Report Approved by Dept");
        await doc.save();

        const mainAdmins = await User.find({ role: 'Main_Admin' });
        mainAdmins.forEach(admin => sendMail(admin.email, "Report Approved", `Dept approved report for (${doc.tracking_id}).`));

        res.json({ status: 'Approved' });
    } catch (error) { 
        console.error("Approve Report Error:", error);
        res.status(500).json({ error: "Approval failed" }); 
    }
};

exports.rejectFacultyReport = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid Document ID" });
        
        const doc = await Document.findById(req.params.id).populate('current_faculty');
        if (!doc) return res.status(404).json({ error: "Document not found" });

        const facultyEmails = doc.current_faculty ? doc.current_faculty.map(f => f.email) : [];

        if (doc.dept_report && fs.existsSync(doc.dept_report)) {
            try { fs.unlinkSync(doc.dept_report); } catch (err) {}
        }

        doc.status = 'In_Progress';
        doc.dept_report = null;
        doc.faculty_processed_at = null;
        doc.current_faculty = [];

        addNote(doc, req.user, req.body.note || "Report Rejected & Reset");
        await doc.save();

        facultyEmails.forEach(email => {
            if(email) sendMail(email, "Report Rejected", `Your report for (${doc.tracking_id}) was rejected by Dept Admin.`);
        });

        res.json({ status: 'Rejected' });
    } catch (error) { 
        console.error("Reject Report Error:", error);
        res.status(500).json({ error: "Reject failed" }); 
    }
};

exports.forwardToClient = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid Document ID" });

        const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'Completed', final_report_sent_at: new Date() }, { new: true }).populate('user');
        if (!doc) return res.status(404).json({ error: "Document not found" });
        
        addNote(doc, req.user, "Process Completed. Final Report Forwarded.");
        await doc.save();

        sendMail(doc.user.email, "Verification Complete", `Document ${doc.tracking_id} verified. You can now download the report from your dashboard.`);
        res.json({ status: 'Forwarded' });
    } catch (error) { 
        console.error("Forward Error:", error);
        res.status(500).json({ error: "Forward failed" }); 
    }
};

exports.toggleFreeze = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid Document ID" });

        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: "Document not found" });

        doc.is_frozen = !doc.is_frozen;
        await doc.save();
        res.json({ status: 'Toggled', is_frozen: doc.is_frozen });
    } catch (error) { 
        console.error("Freeze Error:", error);
        res.status(500).json({ error: "Freeze failed" }); 
    }
};

exports.declineDoc = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid Document ID" });

        const doc = await Document.findById(req.params.id).populate('user');
        if (!doc) return res.status(404).json({ error: "Document not found" });

        doc.status = 'Declined';
        addNote(doc, req.user, req.body.note || "Document Declined/Blocked");
        await doc.save();

        sendMail(doc.user.email, "Document Declined", `Your document (${doc.tracking_id}) was declined.`);
        res.json({ status: 'Declined' });
    } catch (error) { 
        console.error("Decline Error:", error);
        res.status(500).json({ error: "Decline failed" }); 
    }
};

exports.returnDoc = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid Document ID" });

        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: "Document not found" });
        
        addNote(doc, req.user, req.body.note || "Returned to Previous Step");

        if (req.user.role === 'Faculty') { 
            doc.status = 'In_Progress'; 
            doc.current_faculty = []; 
        } else { 
            doc.status = 'Returned_To_Main'; 
            doc.current_dept = []; 
        }
        await doc.save();
        res.json({ status: 'Returned' });
    } catch (error) { 
        console.error("Return Error:", error);
        res.status(500).json({ error: "Return failed" }); 
    }
};

exports.getPublicPaymentInfo = async (req, res) => {
    try {
        const { docId, installmentId } = req.params;
        if (!isValidId(docId) || !isValidId(installmentId)) return res.status(400).json({ error: "Invalid Identifiers" });

        const doc = await Document.findById(docId);
        if (!doc) return res.status(404).json({ error: "Document not found" });
        
        const installment = doc.installments.id(installmentId);
        if (!installment) return res.status(404).json({ error: "Installment not found" });
        if (installment.status === 'Paid') return res.status(400).json({ error: "Installment already Paid" });

        res.json({
            tracking_id: doc.tracking_id,
            amount: installment.amount,
            razorpay_order_id: installment.razorpay_order_id,
            key: process.env.RAZORPAY_KEY_ID 
        });
    } catch (e) { 
        console.error("Public Payment Info Error:", e);
        res.status(500).json({ error: "Error fetching payment details" }); 
    }
};