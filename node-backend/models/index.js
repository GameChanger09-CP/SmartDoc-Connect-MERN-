const mongoose = require('mongoose');

// --- 1. USER MODEL ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // Role-Based Access Control
    role: { 
        type: String, 
        enum: ['Client', 'Dept_Admin', 'Main_Admin', 'Faculty'], 
        default: 'Client' 
    },
    
    // KYC / Verification
    kyc_status: { 
        type: String, 
        enum: ['Pending', 'Verified', 'Rejected'], 
        default: 'Pending' 
    },
    gov_id: { type: String, default: null }, // Path to uploaded ID
    
    // For Staff Only
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    
    // Password Recovery
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, { timestamps: true });

// --- 2. DEPARTMENT MODEL ---
const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    keywords: { type: String, default: "" } // For future AI routing
});

// --- 3. DOCUMENT MODEL (The Heavy Lifter) ---
const documentSchema = new mongoose.Schema({
    // Ownership
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // File Info
    file: { type: String, required: true }, // Path to Client's PDF
    tracking_id: { type: String, unique: true, required: true }, // e.g., "A1B2C3D4"
    
    // Workflow Status
    status: { 
        type: String, 
        enum: [
            'Review_Required',   // Newly uploaded
            'In_Progress',       // At Dept Admin level
            'With_Faculty',      // Assigned to Faculty
            'Faculty_Reported',  // Faculty submitted report
            'Dept_Reported',     // Dept Admin approved report
            'Completed',         // Final report sent to Client
            'Declined',          // Rejected permanently
            'Frozen',            // Paused by Admin
            'Returned_To_Main'   // Sent back to Main Admin
        ],
        default: 'Review_Required' 
    },
    
    // Routing Info
    current_dept: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    current_faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    
    // Reports & AI
    dept_report: { type: String, default: null }, // Path to Final Report PDF
    ai_confidence: { type: Number, default: 0.0 }, // 0-100 score
    is_frozen: { type: Boolean, default: false },

    // 🔥 COMMUNICATION LOG (New Feature) 🔥
    notes: [{
        sender: String, // Username of sender
        role: String,   // Role of sender
        message: String,
        timestamp: { type: Date, default: Date.now }
    }],

    // 💰 PAYMENT SYSTEM (Installments Feature) 💰
    fee_total: { type: Number, default: 0 },
    fee_status: { 
        type: String, 
        enum: ['Not_Applicable', 'Unpaid', 'Partial', 'Paid'], 
        default: 'Not_Applicable' 
    },
    installments: [{
        amount: Number,
        razorpay_order_id: String,
        razorpay_payment_id: { type: String, default: null },
        status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
        created_at: { type: Date, default: Date.now },
        paid_at: { type: Date, default: null }
    }],
    
    // ⏳ TIMELINE TRACKING (For UI Progress Bars) ⏳
    uploaded_at: { type: Date, default: Date.now },
    sent_to_dept_at: { type: Date, default: null },
    assigned_to_faculty_at: { type: Date, default: null }, 
    faculty_processed_at: { type: Date, default: null },   
    dept_processed_at: { type: Date, default: null },
    final_report_sent_at: { type: Date, default: null }

}, { 
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true },
    timestamps: true 
});

// Virtual for easy frontend access
documentSchema.virtual('client_username').get(function() { 
    return this.user ? this.user.username : 'Unknown'; 
});

// --- 4. ACTIVITY LOG MODEL ---
const activityLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // e.g., "Login", "Upload", "Payment"
    details: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }
});

// Virtual to get username directly in logs
activityLogSchema.virtual('user_username').get(function() { 
    return this.user ? this.user.username : 'System'; 
});

// --- EXPORT ALL MODELS ---
module.exports = {
    User: mongoose.model('User', userSchema),
    Department: mongoose.model('Department', departmentSchema),
    Document: mongoose.model('Document', documentSchema),
    ActivityLog: mongoose.model('ActivityLog', activityLogSchema)
};