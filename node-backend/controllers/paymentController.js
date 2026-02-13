const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Document, ActivityLog } = require('../models');
const { sendMail } = require('../utils/mailer');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.requestPayment = async (req, res) => {
    try {
        if (!['Main_Admin', 'Dept_Admin'].includes(req.user.role)) return res.status(403).json({ error: "Unauthorized" });

        const { installments } = req.body; // Now expects an array of numbers: [200, 300]
        const doc = await Document.findById(req.params.id).populate('user');
        
        if (!doc) return res.status(404).json({ error: "Document not found" });
        
        // 🔒 SECURITY LOCK: Prevent re-estimation if fee is already set
        if (doc.fee_total > 0) {
            return res.status(400).json({ error: "Fee has already been estimated for this document." });
        }

        const newInstallments = [];
        let totalAmount = 0;

        // Generate an order for each custom installment amount
        for (let i = 0; i < installments.length; i++) {
            const amt = Number(installments[i]);
            if (amt <= 0) continue; // Skip invalid amounts
            
            totalAmount += amt;
            // Razorpay needs amount in paise (Integer)
            const options = { amount: Math.round(amt * 100), currency: "INR", receipt: `rcpt_${doc.tracking_id}_${i}` };
            const order = await razorpay.orders.create(options);
            
            newInstallments.push({ amount: amt, razorpay_order_id: order.id, status: 'Pending' });
        }

        if (totalAmount === 0) return res.status(400).json({ error: "Total amount must be greater than 0" });

        doc.fee_total = totalAmount;
        doc.fee_status = 'Unpaid';
        doc.installments = newInstallments;
        await doc.save();

        await ActivityLog.create({ user: req.user._id, action: 'Payment Requested', details: `Requested ₹${totalAmount} in ${newInstallments.length} parts for ${doc.tracking_id}` });

        sendMail(doc.user.email, "Payment Required for Document Verification", 
            `An administrative fee of ₹${totalAmount} has been requested for your document (${doc.tracking_id}). Log into your SmartDoc dashboard to complete the payment securely.`
        );

        res.json({ status: 'Payment requests generated successfully' });
    } catch (error) {
        console.error("Payment Request Error:", error);
        res.status(500).json({ error: "Failed to generate payment orders" });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { doc_id, installment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');

        if (expectedSignature !== razorpay_signature) return res.status(400).json({ error: "Invalid payment signature" });

        const doc = await Document.findById(doc_id).populate('user');
        const installment = doc.installments.id(installment_id);
        
        installment.status = 'Paid';
        installment.razorpay_payment_id = razorpay_payment_id;
        installment.paid_at = new Date();

        const allPaid = doc.installments.every(inst => inst.status === 'Paid');
        doc.fee_status = allPaid ? 'Paid' : 'Partial';
        
        await doc.save();
        await ActivityLog.create({ user: req.user._id, action: 'Installment Paid', details: `Paid ₹${installment.amount} for ${doc.tracking_id}` });

        sendMail(doc.user.email, "Payment Received ✅", `We received your payment of ₹${installment.amount} for document (${doc.tracking_id}). Status: ${doc.fee_status}.`);

        res.json({ status: 'Payment verified successfully' });
    } catch (error) {
        console.error("Payment Verification Error:", error);
        res.status(500).json({ error: "Payment verification failed" });
    }
};

exports.getKey = (req, res) => {
    res.status(200).json({ key: process.env.RAZORPAY_KEY_ID });
};