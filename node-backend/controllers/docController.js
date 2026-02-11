const { Document, Department, ActivityLog } = require('../models');
// We leave this imported for later, but we won't call it right now
const { analyzeDocumentWithGemini } = require('../utils/gemini');
const { v4: uuidv4 } = require('uuid');

exports.getDocs = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Dept_Admin') {
            query = { current_dept: req.user.department, status: { $ne: 'Declined' } };
        } else if (req.user.role === 'Faculty') {
            query = { current_faculty: req.user._id, status: { $ne: 'Declined' } };
        } else if (req.user.role === 'Client') {
            query = { user: req.user._id };
        }
        const docs = await Document.find(query).populate('user', 'username').populate('current_dept').populate('current_faculty', 'username').sort({ uploaded_at: -1 });
        res.json(docs);
    } catch (error) { res.status(500).json({ error: "Failed to fetch documents" }); }
};

exports.uploadDoc = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const depts = await Department.find();
        
        // --- ⏸️ AI TEMPORARILY DISABLED FOR TESTING MANUAL WORKFLOW ---
        console.log(`📥 File uploaded: ${req.file.path}. Bypassing AI for now.`);
        // const deptNames = depts.map(d => d.name);
        // const aiResult = await analyzeDocumentWithGemini(req.file.path, deptNames);
        const aiResult = null; 
        // --------------------------------------------------------------
        
        let targetDept = null;
        let docStatus = 'Review_Required'; // Forces document to Main Admin manually
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
        
        await doc.populate('user', 'username');
        res.status(201).json(doc);
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: "Failed to process document upload" });
    }
};

exports.routeDoc = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        
        const incomingDept = req.body.department_id;
        
        let dept = await Department.findById(incomingDept).catch(() => null);
        if (!dept) {
            dept = await Department.findOne({ name: incomingDept });
        }
        
        if (!dept) return res.status(400).json({ error: "Department not found." });
        
        // Wipe old dates when re-routing
        await Document.findByIdAndUpdate(req.params.id, { 
            current_dept: dept._id, 
            status: 'In_Progress', 
            sent_to_dept_at: new Date(),
            dept_processed_at: null,       
            final_report_sent_at: null,    
            dept_report: null              
        });
        
        res.json({ status: 'Routed' });
    } catch (error) {
        console.error("Route Error:", error);
        res.status(500).json({ error: "Failed to route document" });
    }
};

exports.assignToFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        
        await Document.findByIdAndUpdate(req.params.id, { 
            current_faculty: req.body.faculty_id, 
            status: 'With_Faculty', 
            assigned_to_faculty_at: new Date() 
        });
        res.json({ status: 'Assigned to Faculty' });
    } catch (error) { res.status(500).json({ error: "Failed to assign" }); }
};

exports.submitReport = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Report PDF required" });
        
        const updateData = { dept_report: req.file.path };
        
        if (req.user.role === 'Faculty') {
            updateData.status = 'Faculty_Reported';
            updateData.faculty_processed_at = new Date();
        } else if (req.user.role === 'Dept_Admin') {
            updateData.status = 'Dept_Reported';
            updateData.dept_processed_at = new Date();
        }

        await Document.findByIdAndUpdate(req.params.id, updateData);
        res.json({ status: 'Report Submitted' });
    } catch (error) { res.status(500).json({ error: "Failed to submit report" }); }
};

exports.approveFacultyReport = async (req, res) => {
    try {
        if (req.user.role !== 'Dept_Admin') return res.status(403).json({ error: 'Unauthorized' });
        await Document.findByIdAndUpdate(req.params.id, { 
            status: 'Dept_Reported', 
            dept_processed_at: new Date() 
        });
        res.json({ status: 'Forwarded to Main Admin' });
    } catch (error) { res.status(500).json({ error: "Failed to forward" }); }
};

exports.forwardToClient = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        
        const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'Completed', final_report_sent_at: new Date() });
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        
        res.json({ status: 'Forwarded' });
    } catch (error) {
        console.error("Forward Error:", error);
        res.status(500).json({ error: "Failed to forward report" });
    }
};

exports.toggleFreeze = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') return res.status(403).json({ error: 'Unauthorized' });
        
        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        
        doc.is_frozen = !doc.is_frozen;
        await doc.save();
        res.json({ status: 'Toggled Freeze' });
    } catch (error) {
        console.error("Freeze Error:", error);
        res.status(500).json({ error: "Failed to toggle freeze" });
    }
};

exports.declineDoc = async (req, res) => {
    try {
        if (req.user.role !== 'Main_Admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'Declined' }, { new: true });
        
        if (!doc) {
            return res.status(404).json({ error: 'Document not found in database' });
        }
        
        res.json({ status: 'Declined' });
        
    } catch (error) {
        console.error("Decline Error Details:", error);
        res.status(500).json({ error: "Server error while declining document" });
    }
};

exports.returnDoc = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        
        if (req.user.role === 'Faculty') {
            // Faculty returns to Dept Admin
            doc.status = 'In_Progress';
            doc.current_faculty = null;
        } else if (req.user.role === 'Dept_Admin') {
            // Dept Admin returns to Main Admin
            doc.status = 'Returned_To_Main';
            doc.current_dept = null;
        }
        
        await doc.save();
        res.json({ status: 'Document Returned' });
    } catch (error) { res.status(500).json({ error: "Failed to return" }); }
};