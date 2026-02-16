const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Document, ActivityLog } = require('../models');
const { sendMail } = require('../utils/mailer');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- HELPER: GENERATE DETAILED FINANCIAL EMAIL ---
const generatePaymentEmail = (doc, installment, index, link) => {
    const totalFee = doc.fee_total;
    
    // 1. Calculate Amount Paid So Far (excluding current)
    const paidSoFar = doc.installments
        .filter(i => i.status === 'Paid')
        .reduce((sum, i) => sum + i.amount, 0);
    
    // 2. Calculate Future Remaining Balance (AFTER this payment)
    // Formula: Total - (Paid So Far + Current Request Amount)
    const futureRemaining = totalFee - (paidSoFar + installment.amount);
    
    // 3. Determine Label (Advance vs Installment)
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
                            <td style="padding: 8px 0; color: #94a3b8; font-style: italic;">Remaining Balance (To be paid later):</td>
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

// --- 1. GENERATE PAYMENT REQUEST (Split Logic) ---
exports.requestPayment = async (req, res) => {
    try {
        if (!['Main_Admin', 'Dept_Admin'].includes(req.user.role)) return res.status(403).json({ error: "Unauthorized" });

        const { installments } = req.body; // Expecting array of numbers
        const doc = await Document.findById(req.params.id).populate('user');
        
        if (!doc) return res.status(404).json({ error: "Document not found" });
        if (doc.fee_total > 0) return res.status(400).json({ error: "Fee already estimated." });

        const newInstallments = [];
        let totalAmount = 0;

        for (let i = 0; i < installments.length; i++) {
            const amt = Number(installments[i]);
            totalAmount += amt;
            
            // 🔥 LOGIC: If amount is 0, DO NOT create Razorpay order. Mark as 'Paid' (N/A).
            if (amt > 0) {
                const options = { amount: Math.round(amt * 100), currency: "INR", receipt: `rcpt_${doc.tracking_id}_${i}` };
                const order = await razorpay.orders.create(options);
                newInstallments.push({ amount: amt, razorpay_order_id: order.id, status: 'Pending' });
            } else {
                // Handle 0 Rs Advance case
                newInstallments.push({ amount: 0, razorpay_order_id: "NA", status: 'Paid', paid_at: new Date() });
            }
        }

        doc.fee_total = totalAmount;
        // If total is 0, mark doc as Not_Applicable, else Unpaid
        doc.fee_status = totalAmount === 0 ? 'Not_Applicable' : 'Unpaid';
        doc.installments = newInstallments;
        
        await doc.save();

        // 🔥 EMAIL LOGIC: Only send email if Advance (Index 0) > 0
        const advanceInst = doc.installments[0];
        if (advanceInst.amount > 0) {
            const link = `http://localhost:5173/pay/${doc._id}/${advanceInst._id}`;
            const emailHtml = generatePaymentEmail(doc, advanceInst, 0, link);
            sendMail(doc.user.email, "Action Required: Pay Advance Fee", emailHtml);
        }

        res.json({ status: 'Generated' });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Failed to generate payment" }); 
    }
};

// --- 2. SEND PAYMENT REMINDER (Manual Trigger) ---
exports.sendPaymentReminder = async (req, res) => {
    try {
        const { docId, installmentId } = req.params;
        const doc = await Document.findById(docId).populate('user');
        
        const installment = doc.installments.id(installmentId);
        if (!installment) return res.status(404).json({ error: "Installment not found" });
        if (installment.amount === 0 || installment.status === 'Paid') return res.status(400).json({ error: "Nothing to pay" });

        const index = doc.installments.findIndex(i => i._id.toString() === installmentId);
        const link = `http://localhost:5173/pay/${doc._id}/${installment._id}`;
        
        // Generate Detailed Email
        const emailHtml = generatePaymentEmail(doc, installment, index, link);
        
        const typeLabel = index === 0 ? "Advance" : "Balance";
        await sendMail(doc.user.email, `Payment Reminder: ${typeLabel} Due`, emailHtml);

        // Log the reminder
        doc.notes.push({ sender: req.user.username, role: req.user.role, message: `Sent Reminder for ${typeLabel} (₹${installment.amount})` });
        await doc.save();

        res.json({ status: 'Reminder Sent' });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
};

// --- 3. VERIFY PAYMENT ---
exports.verifyPayment = async (req, res) => {
    try {
        const { doc_id, installment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');

        if (expectedSignature !== razorpay_signature) return res.status(400).json({ error: "Invalid signature" });

        const doc = await Document.findById(doc_id).populate('user');
        const installment = doc.installments.id(installment_id);
        
        installment.status = 'Paid';
        installment.razorpay_payment_id = razorpay_payment_id;
        installment.paid_at = new Date();

        const allPaid = doc.installments.every(inst => inst.status === 'Paid');
        doc.fee_status = allPaid ? 'Paid' : 'Partial';
        
        await doc.save();
        
        const payerId = req.user ? req.user._id : doc.user._id;
        await ActivityLog.create({ user: payerId, action: 'Paid', details: `Paid ₹${installment.amount}` });
        
        res.json({ status: 'Verified' });
    } catch (error) { res.status(500).json({ error: "Verification failed" }); }
};

exports.verifyPublicPayment = async (req, res) => { exports.verifyPayment(req, res); };
exports.getKey = (req, res) => { res.status(200).json({ key: process.env.RAZORPAY_KEY_ID }); };