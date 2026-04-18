const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { Document, ActivityLog } = require('../models');
const { sendMail } = require('../utils/mailer');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// Initialize safely
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
} else {
    console.warn("⚠️ Razorpay keys are missing in environment variables. Payments will fail.");
}

const generatePaymentEmail = (doc, installment, index, link) => {
    const totalFee = doc.fee_total;
    const paidSoFar = doc.installments
        .filter(i => i.status === 'Paid')
        .reduce((sum, i) => sum + i.amount, 0);
    
    const futureRemaining = totalFee - (paidSoFar + installment.amount);
    const typeLabel = index === 0 ? "Initial Advance" : `Installment #${index}`;
    
    return `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1e3a8a; padding: 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">Payment Request</h2>
            </div>
            <div style="padding: 20px;">
                <p>Hello,</p>
                <p>A payment of <b>₹${installment.amount}</b> is required for your document (ID: <b>${doc.tracking_id}</b>).</p>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 20px 0;">
                    <h3 style="margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 16px; color: #1e40af;">Financial Summary</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">Total Estimated Fee:</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: bold;">₹${totalFee}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #166534;">Previously Paid:</td>
                            <td style="padding: 8px 0; text-align: right; color: #166534;">- ₹${paidSoFar}</td>
                        </tr>
                        <tr style="background-color: #eff6ff; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1;">
                            <td style="padding: 10px; color: #1d4ed8; font-weight: bold;">Current Due (${typeLabel}):</td>
                            <td style="padding: 10px; text-align: right; color: #1d4ed8; font-weight: bold; font-size: 16px;">₹${installment.amount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8; font-style: italic;">Remaining Balance:</td>
                            <td style="padding: 8px 0; text-align: right; color: #94a3b8; font-style: italic;">₹${futureRemaining}</td>
                        </tr>
                    </table>
                </div>

                <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
                    <a href="${link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Pay ₹${installment.amount} Now</a>
                </div>
                <p style="text-align: center; font-size: 11px; color: #94a3b8;">Secure payment powered by Razorpay.<br/>Link: ${link}</p>
            </div>
        </div>
    `;
};

exports.requestPayment = async (req, res) => {
    try {
        if (!razorpay) return res.status(503).json({ error: "Payment gateway is not configured." });
        
        // --- MODIFIED: Only Dept_Admin and Faculty can initiate payments ---
        if (!['Dept_Admin', 'Faculty'].includes(req.user.role)) return res.status(403).json({ error: "Unauthorized: Only Department Admins and Faculty can set fees." });
        
        if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid Document ID" });

        const { installments } = req.body; 
        if (!Array.isArray(installments) || installments.length === 0) return res.status(400).json({ error: "Valid installments array required" });

        const doc = await Document.findById(req.params.id).populate('user');
        if (!doc) return res.status(404).json({ error: "Document not found" });
        
        // --- LOCK: Prevents ANYONE from changing the fee once it is set ---
        if (doc.fee_total > 0) return res.status(400).json({ error: "Fee already estimated and locked." });

        const newInstallments = [];
        let totalAmount = 0;

        for (let i = 0; i < installments.length; i++) {
            const amt = Number(installments[i]);
            if (isNaN(amt) || amt < 0) return res.status(400).json({ error: "Invalid installment amount detected" });
            
            totalAmount += amt;
            
            if (amt > 0) {
                const options = { amount: Math.round(amt * 100), currency: "INR", receipt: `rcpt_${doc.tracking_id}_${i}` };
                const order = await razorpay.orders.create(options);
                newInstallments.push({ amount: amt, razorpay_order_id: order.id, status: 'Pending' });
            } else {
                newInstallments.push({ amount: 0, razorpay_order_id: "NA", status: 'Paid', paid_at: new Date() });
            }
        }

        doc.fee_total = totalAmount;
        doc.fee_status = totalAmount === 0 ? 'Not_Applicable' : 'Unpaid';
        doc.installments = newInstallments;
        
        await doc.save();

        if (doc.installments.length > 0 && doc.installments[0].amount > 0) {
            const advanceInst = doc.installments[0];
            const link = `${frontendUrl}/pay/${doc._id}/${advanceInst._id}`;
            const emailHtml = generatePaymentEmail(doc, advanceInst, 0, link);
            sendMail(doc.user.email, "Action Required: Pay Advance Fee", emailHtml);
        }

        res.json({ status: 'Generated' });
    } catch (error) { 
        console.error("Request Payment Error:", error);
        res.status(500).json({ error: "Failed to generate payment" }); 
    }
};

exports.sendPaymentReminder = async (req, res) => {
    try {
        const { docId, installmentId } = req.params;
        if (!isValidId(docId) || !isValidId(installmentId)) return res.status(400).json({ error: "Invalid IDs" });

        const doc = await Document.findById(docId).populate('user');
        if (!doc) return res.status(404).json({ error: "Document not found" });
        
        const installment = doc.installments.id(installmentId);
        if (!installment) return res.status(404).json({ error: "Installment not found" });
        if (installment.amount === 0 || installment.status === 'Paid') return res.status(400).json({ error: "Nothing to pay or already paid" });

        const index = doc.installments.findIndex(i => i._id.toString() === installmentId);
        const link = `${frontendUrl}/pay/${doc._id}/${installment._id}`;
        
        const emailHtml = generatePaymentEmail(doc, installment, index, link);
        const typeLabel = index === 0 ? "Advance" : "Balance";
        await sendMail(doc.user.email, `Payment Reminder: ${typeLabel} Due`, emailHtml);

        doc.notes.push({ sender: req.user.username, role: req.user.role, message: `Sent Reminder for ${typeLabel} (₹${installment.amount})` });
        await doc.save();

        res.json({ status: 'Reminder Sent' });
    } catch (e) { 
        console.error("Send Reminder Error:", e);
        res.status(500).json({ error: "Failed to send reminder" }); 
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { doc_id, installment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!doc_id || !installment_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: "Missing required payment parameters" });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');

        if (expectedSignature !== razorpay_signature) return res.status(400).json({ error: "Invalid cryptographic signature" });

        const doc = await Document.findById(doc_id).populate('user');
        if (!doc) return res.status(404).json({ error: "Document not found" });

        const installment = doc.installments.id(installment_id);
        if (!installment) return res.status(404).json({ error: "Installment not found" });
        if (installment.status === 'Paid') return res.status(400).json({ error: "Installment already marked as paid" });
        
        installment.status = 'Paid';
        installment.razorpay_payment_id = razorpay_payment_id;
        installment.paid_at = new Date();

        const allPaid = doc.installments.every(inst => inst.status === 'Paid');
        doc.fee_status = allPaid ? 'Paid' : 'Partial';
        
        await doc.save();
        
        const payerId = req.user ? req.user._id : doc.user._id;
        await ActivityLog.create({ user: payerId, action: 'Paid', details: `Paid ₹${installment.amount} via Razorpay` });
        
        res.json({ status: 'Verified' });
    } catch (error) { 
        console.error("Verify Payment Error:", error);
        res.status(500).json({ error: "Verification failed" }); 
    }
};

exports.verifyPublicPayment = async (req, res) => { exports.verifyPayment(req, res); };
exports.getKey = (req, res) => { res.status(200).json({ key: process.env.RAZORPAY_KEY_ID }); }; 