const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Document, ActivityLog } = require('../models');
const { sendMail } = require('../utils/mailer');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- 1. GENERATE PAYMENT REQUEST (Split/Advance) ---
// Keeps existing logic: Creates orders for ALL installments, but emails only the first (Advance).
exports.requestPayment = async (req, res) => {
    try {
        if (!['Main_Admin', 'Dept_Admin'].includes(req.user.role)) return res.status(403).json({ error: "Unauthorized" });

        const { installments } = req.body; 
        const doc = await Document.findById(req.params.id).populate('user');
        
        if (!doc) return res.status(404).json({ error: "Document not found" });
        if (doc.fee_total > 0) return res.status(400).json({ error: "Fee already estimated." });

        const newInstallments = [];
        let totalAmount = 0;

        for (let i = 0; i < installments.length; i++) {
            const amt = Number(installments[i]);
            if (amt <= 0) continue;
            totalAmount += amt;
            const options = { amount: Math.round(amt * 100), currency: "INR", receipt: `rcpt_${doc.tracking_id}_${i}` };
            const order = await razorpay.orders.create(options);
            newInstallments.push({ amount: amt, razorpay_order_id: order.id, status: 'Pending' });
        }

        doc.fee_total = totalAmount;
        doc.fee_status = 'Unpaid';
        doc.installments = newInstallments;
        
        // Save first to generate Mongoose IDs
        await doc.save();

        // Send email ONLY for the first installment (Advance) initially
        const firstInst = doc.installments[0];
        const paymentLink = `http://localhost:5173/pay/${doc._id}/${firstInst._id}`;
        
        sendMail(doc.user.email, "Payment Request: Advance", `
            <h3>Fee Requested: ₹${totalAmount}</h3>
            <p>Please pay the initial advance of <b>₹${firstInst.amount}</b> to begin processing.</p>
            <p><a href="${paymentLink}" style="background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Pay Advance Now</a></p>
            <p>You will receive separate links for remaining installments later.</p>
        `);

        res.json({ status: 'Generated' });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Failed to generate payment" }); 
    }
};

// --- 2. SEND PAYMENT REMINDER (🔥 NEW FEATURE 🔥) ---
// Allows clicking "Notify" to send a link for a SPECIFIC installment (Advance or Remaining)
exports.sendPaymentReminder = async (req, res) => {
    try {
        if (!['Main_Admin', 'Dept_Admin'].includes(req.user.role)) return res.status(403).json({ error: "Unauthorized" });

        const { docId, installmentId } = req.params;
        const doc = await Document.findById(docId).populate('user');
        
        if (!doc) return res.status(404).json({ error: "Document not found" });

        const installment = doc.installments.id(installmentId);
        if (!installment) return res.status(404).json({ error: "Installment not found" });
        if (installment.status === 'Paid') return res.status(400).json({ error: "Already Paid" });

        const paymentLink = `http://localhost:5173/pay/${doc._id}/${installment._id}`;
        
        // Identify if it's Advance (index 0) or Remaining
        const index = doc.installments.findIndex(i => i._id.toString() === installmentId);
        const type = index === 0 ? "Advance" : "Balance/Remaining";

        await sendMail(doc.user.email, `Payment Reminder: ${type}`, `
            <h3>Payment Pending: ₹${installment.amount}</h3>
            <p>This is a reminder to pay the <b>${type}</b> fee for your document (${doc.tracking_id}).</p>
            <p><a href="${paymentLink}" style="background:#dc2626;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Pay ₹${installment.amount} Now</a></p>
            <p>Ignore if already paid.</p>
        `);

        // Log the reminder in notes so other admins can see
        doc.notes.push({ 
            sender: req.user.username, 
            role: req.user.role, 
            message: `Sent Payment Reminder for ${type} (₹${installment.amount})` 
        });
        await doc.save();

        res.json({ status: 'Reminder Sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to send reminder" });
    }
};

// --- 3. VERIFY PAYMENT (Existing Logic) ---
exports.verifyPayment = async (req, res) => {
    try {
        const { doc_id, installment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');

        if (expectedSignature !== razorpay_signature) return res.status(400).json({ error: "Invalid signature" });

        const doc = await Document.findById(doc_id).populate('user');
        const installment = doc.installments.id(installment_id);
        
        if (!installment) return res.status(404).json({ error: "Installment not found" });

        installment.status = 'Paid';
        installment.razorpay_payment_id = razorpay_payment_id;
        installment.paid_at = new Date();

        const allPaid = doc.installments.every(inst => inst.status === 'Paid');
        doc.fee_status = allPaid ? 'Paid' : 'Partial';
        
        await doc.save();
        
        const payerId = req.user ? req.user._id : doc.user._id;
        await ActivityLog.create({ user: payerId, action: 'Paid', details: `Paid ₹${installment.amount}` });
        
        res.json({ status: 'Verified' });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Verification failed" }); 
    }
};

// --- 4. VERIFY PUBLIC PAYMENT (Existing Logic) ---
exports.verifyPublicPayment = async (req, res) => {
    exports.verifyPayment(req, res);
};

exports.getKey = (req, res) => { res.status(200).json({ key: process.env.RAZORPAY_KEY_ID }); };