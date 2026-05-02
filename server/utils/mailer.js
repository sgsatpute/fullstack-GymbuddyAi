import nodemailer from "nodemailer";
import config from "../config.js";

let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (config.smtpHost && config.smtpUser && config.smtpPass) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
  return transporter;
}

export async function sendPasswordResetOtpEmail({ to, name, otp }) {
  const info = await getTransporter().sendMail({
    from: config.smtpFrom,
    to,
    subject: "Your GymBuddy AI password reset code",
    text: `Hi ${name || "there"}, your GymBuddy AI password reset code is ${otp}. It expires in ${config.passwordResetOtpTtlMinutes} minutes.`,
    html: `
      <p>Hi ${name || "there"},</p>
      <p>Your GymBuddy AI password reset code is <strong>${otp}</strong>.</p>
      <p>It expires in ${config.passwordResetOtpTtlMinutes} minutes.</p>
    `,
  });

  if (!(config.smtpHost && config.smtpUser && config.smtpPass)) {
    console.log("Password reset email preview:", info.message);
  }
}
