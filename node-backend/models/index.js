const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: [true, 'Username is required'], unique: true, trim: true },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Client', 'Dept_Admin', 'Main_Admin', 'Faculty'], default: 'Client' },
    kyc_status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
    gov_id: { type: String, default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, { timestamps: true });

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    keywords: { type: String, default: "" }
});

const documentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file: { type: String, required: true },
    tracking_id: { type: String, unique: true, required: true },
    status: { 
        type: String, 
        enum: ['Review_Required', 'In_Progress', 'With_Faculty', 'Faculty_Reported', 'Dept_Reported', 'Completed', 'Declined', 'Frozen', 'Returned_To_Main'],
        default: 'Review_Required' 
    },
    // CHANGED: Now arrays to support multiple assignments
    current_dept: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    current_faculty: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dept_report: { type: String, default: null },
    
    // NEW: AI Suggestion Fields
    ai_suggested_dept: { type: String, default: null },
    ai_confidence: { type: Number, default: 0.0, min: 0, max: 100 },
    
    is_frozen: { type: Boolean, default: false },
    notes: [{
        sender: String,
        role: String,
        message: String,
        timestamp: { type: Date, default: Date.now }
    }],
    fee_total: { type: Number, default: 0, min: 0 },
    fee_status: { type: String, enum: ['Not_Applicable', 'Unpaid', 'Partial', 'Paid'], default: 'Not_Applicable' },
    installments: [{
        amount: { type: Number, min: 0 },
        razorpay_order_id: String,
        razorpay_payment_id: { type: String, default: null },
        status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
        created_at: { type: Date, default: Date.now },
        paid_at: { type: Date, default: null }
    }],
    uploaded_at: { type: Date, default: Date.now },
    sent_to_dept_at: { type: Date, default: null },
    assigned_to_faculty_at: { type: Date, default: null }, 
    faculty_processed_at: { type: Date, default: null },   
    dept_processed_at: { type: Date, default: null },
    final_report_sent_at: { type: Date, default: null }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true });

documentSchema.virtual('client_username').get(function() { 
    return this.user ? this.user.username : 'Unknown'; 
});

const activityLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    details: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }
});

activityLogSchema.virtual('user_username').get(function() { 
    return this.user ? this.user.username : 'System'; 
});

module.exports = {
    User: mongoose.model('User', userSchema),
    Department: mongoose.model('Department', departmentSchema),
    Document: mongoose.model('Document', documentSchema),
    ActivityLog: mongoose.model('ActivityLog', activityLogSchema)
};