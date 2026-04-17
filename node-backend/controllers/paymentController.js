const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Document, ActivityLog } = require('../models');
const { sendMail } = require('../utils/mailer');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- CONFIGURATION ---
const GATEWAY_SURCHARGE_PERCENT = 0.03; 

// --- HELPER: GENERATE DETAILED EMAIL WITH HISTORY ---
const generatePaymentEmail = (doc, currentInstallment, index, link) => {
    // 1. Calculate Financials
    const totalFee = doc.fee_total;
    const totalPayable = currentInstallment.amount;
    const baseAmount = Math.round(totalPayable / (1 + GATEWAY_SURCHARGE_PERCENT));
    const surcharge = totalPayable - baseAmount;
    
    const typeLabel = index === 0 ? "Initial Advance" : `Installment #${index}`;

    // 2. Generate History Rows (Previous Paid Transactions)
    // We map through all installments to find paid ones
    let historyHtml = '';
    let paidTotal = 0;

    doc.installments.forEach((inst, idx) => {
        if (inst.status === 'Paid') {
            const label = idx === 0 ? "Initial Advance" : `Installment #${idx}`;
            const date = inst.paid_at ? new Date(inst.paid_at).toLocaleDateString('en-IN') : 'Paid';
            paidTotal += inst.amount;
            
            historyHtml += `
                <tr>
                    <td style="padding: 6px 0; color: #166534; font-size: 13px;">
                        <span style="font-size: 14px;">✔</span> ${label} <span style="color: #94a3b8; font-size: 11px;">(${date})</span>
                    </td>
                    <td style="padding: 6px 0; text-align: right; color: #166534; font-weight: bold; font-size: 13px;">
                        ₹${inst.amount}
                    </td>
                </tr>
            `;
        }
    });

    if (historyHtml === '') {
        historyHtml = `<tr><td colspan="2" style="padding: 8px 0; color: #94a3b8; font-style: italic; text-align: center; font-size: 13px;">No previous payments recorded.</td></tr>`;
    }

    return `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            
            <div style="background-color: #1e3a8a; padding: 25px; text-align: center;">
                <h2 style="color: white; margin: 0; font-size: 24px;">Payment Request</h2>
                <p style="color: #bfdbfe; margin: 5px 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${typeLabel}</p>
            </div>

            <div style="padding: 25px;">
                <p style="margin-top: 0;">Hello,</p>
                <p>Please complete the pending payment for your document (ID: <b>${doc.tracking_id}</b>).</p>
                
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 20px 0;">
                    <h3 style="margin-top: 0; border-bottom: 1px solid #bbf7d0; padding-bottom: 8px; font-size: 14px; color: #166534; text-transform: uppercase;">Transaction History</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        ${historyHtml}
                        <tr style="border-top: 1px dashed #bbf7d0;">
                            <td style="padding-top: 8px; font-weight: bold; color: #14532d; font-size: 13px;">Total Paid So Far:</td>
                            <td style="padding-top: 8px; text-align: right; font-weight: bold; color: #14532d; font-size: 13px;">₹${paidTotal}</td>
                        </tr>
                    </table>
                </div>

                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 20px 0;">
                    <h3 style="margin-top: 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; font-size: 14px; color: #1e40af; text-transform: uppercase;">Current Invoice Breakdown</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Processing Fee (Base):</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: bold;">₹${baseAmount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Gateway Charges (3%):</td>
                            <td style="padding: 6px 0; text-align: right; color: #dc2626;">+ ₹${surcharge}</td>
                        </tr>
                        <tr style="background-color: #eff6ff; border-top: 1px solid #cbd5e1;">
                            <td style="padding: 12px 5px; color: #1d4ed8; font-weight: bold; font-size: 16px;">Total Payable Now:</td>
                            <td style="padding: 12px 5px; text-align: right; color: #1d4ed8; font-weight: bold; font-size: 18px;">₹${totalPayable}</td>
                        </tr>
                    </table>
                </div>

                <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                    <a href="${link}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);">
                        Pay ₹${totalPayable} Securely
                    </a>
                </div>
                
                <p style="text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                    This link is valid for <strong>SmartDoc Connect</strong> payments only.<br/>
                    <a href="${link}" style="color: #2563eb;">${link}</a>
                </p>
            </div>
        </div>
    `;
};

// --- 1. GENERATE PAYMENT REQUEST ---
exports.requestPayment = async (req, res) => {
    try {
        if (!['Main_Admin', 'Dept_Admin'].includes(req.user.role)) return res.status(403).json({ error: "Unauthorized" });

        const { installments } = req.body; 
        const doc = await Document.findById(req.params.id).populate('user');
        
        if (!doc) return res.status(404).json({ error: "Document not found" });
        if (doc.fee_total > 0) return res.status(400).json({ error: "Fee already estimated." });

        const newInstallments = [];
        let totalAmountStored = 0;

        for (let i = 0; i < installments.length; i++) {
            const baseAmt = Number(installments[i]);
            
            if (baseAmt > 0) {
                // Add 3% Surcharge
                const surcharge = Math.ceil(baseAmt * GATEWAY_SURCHARGE_PERCENT);
                const finalAmount = baseAmt + surcharge;
                totalAmountStored += finalAmount;

                const options = { 
                    amount: Math.round(finalAmount * 100), 
                    currency: "INR", 
                    receipt: `rcpt_${doc.tracking_id}_${i}` 
                };
                const order = await razorpay.orders.create(options);
                
                newInstallments.push({ amount: finalAmount, razorpay_order_id: order.id, status: 'Pending' });
            } else {
                newInstallments.push({ amount: 0, razorpay_order_id: "NA", status: 'Paid', paid_at: new Date() });
            }
        }

        doc.fee_total = totalAmountStored;
        doc.fee_status = totalAmountStored === 0 ? 'Not_Applicable' : 'Unpaid';
        doc.installments = newInstallments;
        
        await doc.save();

        // Email only if Advance > 0
        const firstInst = doc.installments[0];
        if (firstInst.amount > 0) {
            const link = `http://localhost:5173/pay/${doc._id}/${firstInst._id}`;
            const emailHtml = generatePaymentEmail(doc, firstInst, 0, link);
            sendMail(doc.user.email, "Action Required: Pay Advance Fee", emailHtml);
        }

        res.json({ status: 'Generated' });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Failed to generate payment" }); 
    }
};

// --- 2. SEND PAYMENT REMINDER ---
exports.sendPaymentReminder = async (req, res) => {
    try {
        const { docId, installmentId } = req.params;
        const doc = await Document.findById(docId).populate('user');
        
        const installment = doc.installments.id(installmentId);
        if (installment.amount === 0 || installment.status === 'Paid') return res.status(400).json({ error: "Nothing to pay" });

        const index = doc.installments.findIndex(i => i._id.toString() === installmentId);
        const link = `http://localhost:5173/pay/${doc._id}/${installment._id}`;
        
        const emailHtml = generatePaymentEmail(doc, installment, index, link);
        
        const typeLabel = index === 0 ? "Advance" : "Balance";
        await sendMail(doc.user.email, `Payment Reminder: ${typeLabel} Due`, emailHtml);

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
        await ActivityLog.create({ user: req.user ? req.user._id : doc.user._id, action: 'Paid', details: `Paid ₹${installment.amount}` });
        
        res.json({ status: 'Verified' });
    } catch (error) { res.status(500).json({ error: "Verification failed" }); }
};

exports.verifyPublicPayment = async (req, res) => { exports.verifyPayment(req, res); };
exports.getKey = (req, res) => { res.status(200).json({ key: process.env.RAZORPAY_KEY_ID }); };