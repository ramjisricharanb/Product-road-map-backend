const nodemailer = require("nodemailer");

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  const transporter = getTransporter();

  const mailOptions = {
    from: `"nConnect Admin" <noreply@nconnect.co.in>`, // Replace with verified sender in Brevo
    to: toEmail,
    subject: "Password Reset Request - nConnect",
    text: `You requested a password reset. Please click the link below to reset your password. This link will expire in 15 minutes.\n\n${resetLink}\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2c3e50;">Password Reset Request</h2>
        <p>You requested a password reset for your nConnect dashboard account.</p>
        <p>Please click the button below to set a new password. This link is valid for exactly <strong>15 minutes</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 14px; color: #3b82f6; word-break: break-all;">${resetLink}</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="font-size: 12px; color: #9ca3af;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`Failed to send password reset email to ${toEmail}:`, error);
    return false;
  }
}

module.exports = {
  sendPasswordResetEmail,
};
