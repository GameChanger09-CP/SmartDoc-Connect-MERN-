const mongoose = require('mongoose');

// --- USER MODEL ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Client', 'Dept_Admin', 'Main_Admin', 'Faculty'], default: 'Client' },
    kyc_status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
    gov_id: { type: String, default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    resetPasswordToken: String,
    resetPasswordExpire: Date
});

// --- DEPARTMENT MODEL ---
const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    keywords: { type: String, default: "" }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

// --- DOCUMENT MODEL ---
const documentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file: { type: String, required: true },
    tracking_id: { type: String, unique: true, required: true },
    
    status: { 
        type: String, 
        enum: [
            'Review_Required', 'In_Progress', 'With_Faculty', 
            'Faculty_Reported', 'Dept_Reported', 'Completed', 
            'Declined', 'Frozen', 'Returned_To_Main'
        ],
        default: 'Review_Required' 
    },
    
    current_dept: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    current_faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    
    ai_confidence: { type: Number, default: 0.0 },
    is_frozen: { type: Boolean, default: false },
    dept_report: { type: String, default: null },

    // 🔥 NEW: CURRENT VISIBLE REMARK 🔥
    latest_remark: { type: String, default: "No remarks yet." },

    // HISTORY LOG
    notes: [{
        sender: String,
        role: String,
        message: String,
        timestamp: { type: Date, default: Date.now }
    }],

    // PAYMENTS
    fee_total: { type: Number, default: 0 },
    fee_status: { type: String, enum: ['Not_Applicable', 'Unpaid', 'Partial', 'Paid'], default: 'Not_Applicable' },
    installments: [{
        amount: Number,
        razorpay_order_id: String,
        razorpay_payment_id: { type: String, default: null },
        status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
        created_at: { type: Date, default: Date.now },
        paid_at: { type: Date, default: null }
    }],
    
    // DATES
    uploaded_at: { type: Date, default: Date.now },
    sent_to_dept_at: { type: Date, default: null },
    assigned_to_faculty_at: { type: Date, default: null }, 
    faculty_processed_at: { type: Date, default: null },   
    dept_processed_at: { type: Date, default: null },
    final_report_sent_at: { type: Date, default: null }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

documentSchema.virtual('client_username').get(function() { return this.user ? this.user.username : 'Unknown'; });

// --- ACTIVITY LOG MODEL ---
const activityLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    details: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

activityLogSchema.virtual('user_username').get(function() { return this.user ? this.user.username : 'System'; });

module.exports = {
    User: mongoose.model('User', userSchema),
    Department: mongoose.model('Department', departmentSchema),
    Document: mongoose.model('Document', documentSchema),
    ActivityLog: mongoose.model('ActivityLog', activityLogSchema)
};