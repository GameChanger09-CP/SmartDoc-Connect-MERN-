const nodemailer = require('nodemailer');

// Initialize safely to prevent server crash if email is misconfigured
let transporter;

if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT || 587,
        secure: process.env.MAIL_PORT == 465, 
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });
} else {
    console.warn("⚠️ Mail configuration is missing. Emails will not be sent.");
}
   
exports.sendMail = async (to, subject, text) => {
    try {
        if (!to || !transporter) return; 
        
        await transporter.sendMail({
            from: `"SmartDoc Connect" <${process.env.MAIL_USER}>`,
            to,
            subject,
            html: `
            <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #1e3a8a; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">SmartDoc Connect</h2>
                </div>
                <div style="padding: 30px; color: #374151; line-height: 1.6;">
                    <h3 style="color: #1f2937; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Notification Update</h3>
                    <p style="font-size: 16px;">${text.replace(/\n/g, '<br/>')}</p>
                    <p style="margin-top: 30px; font-size: 14px;">Please log in to your dashboard to take action or view details.</p>
                </div>
                <div style="background-color: #f9fafb; padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
                    This is an automated message. Please do not reply.
                </div>
            </div>`
        });
        console.log(`✉️ Automated Email sent to: ${to}`);
    } catch (error) {
        console.error(`❌ Email failed to send to ${to}:`, error.message);
    }
};