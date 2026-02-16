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
        
        // Save first so Mongoose generates the _id for installments
        await doc.save();

        // 🔥 FIX: Use 'doc.installments' (which has _id) instead of 'newInstallments' 🔥
        const paymentLink = `http://localhost:5173/pay/${doc._id}/${doc.installments[0]._id}`;
        
        sendMail(doc.user.email, "Payment Request", `
            <h3>Fee Requested: ₹${totalAmount}</h3>
            <p>Please pay the first installment of ₹${doc.installments[0].amount}.</p>
            <p><a href="${paymentLink}" style="background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Pay Now (Quick Link)</a></p>
            <p>Or login to your dashboard to pay.</p>
        `);

        res.json({ status: 'Generated' });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Failed to generate payment" }); 
    }
};

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

exports.verifyPublicPayment = async (req, res) => {
    exports.verifyPayment(req, res);
};

exports.getKey = (req, res) => { res.status(200).json({ key: process.env.RAZORPAY_KEY_ID }); };