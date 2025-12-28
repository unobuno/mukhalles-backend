import nodemailer from "nodemailer";
import logger from "../utils/logger";

// Gmail SMTP configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD, // Gmail App Password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify email configuration on startup
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    logger.info("✅ Email service connected successfully (Gmail SMTP)");
    return true;
  } catch (error) {
    logger.error("❌ Email service connection failed:", error);
    return false;
  }
};

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email using Gmail SMTP
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || "Mukhalis"}" <${
        process.env.EMAIL_USER
      }>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error("Failed to send email:", error);
    return false;
  }
};

/**
 * Send OTP verification email
 */
export const sendOTPEmail = async (
  email: string,
  otp: string
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">Mukhalis</h1>
        <p style="color: #6b7280; margin-top: 5px;">منصة التخليص الجمركي</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 12px; padding: 30px; text-align: center; color: white;">
        <h2 style="margin: 0 0 20px 0;">رمز التحقق الخاص بك</h2>
        <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 20px; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px;">${otp}</span>
        </div>
        <p style="margin: 0; font-size: 14px; opacity: 0.9;">صالح لمدة 10 دقائق</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
        <p>إذا لم تطلب هذا الرمز، يرجى تجاهل هذا البريد الإلكتروني.</p>
        <p style="margin-top: 20px;">© ${new Date().getFullYear()} Mukhalis. جميع الحقوق محفوظة.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "رمز التحقق - Mukhalis",
    html,
    text: `رمز التحقق الخاص بك هو: ${otp}. صالح لمدة 10 دقائق.`,
  });
};

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = async (
  email: string,
  name: string
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">Mukhalis</h1>
        <p style="color: #6b7280; margin-top: 5px;">منصة التخليص الجمركي</p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 30px; text-align: center;">
        <h2 style="color: #1e293b; margin: 0 0 15px 0;">مرحباً ${name}! 👋</h2>
        <p style="color: #475569; margin: 0; line-height: 1.6;">
          شكراً لانضمامك إلى منصة مخلص. نحن سعداء بوجودك معنا!
        </p>
        <p style="color: #475569; margin-top: 15px; line-height: 1.6;">
          يمكنك الآن البدء في استخدام خدماتنا للتخليص الجمركي.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
        <p style="margin-top: 20px;">© ${new Date().getFullYear()} Mukhalis. جميع الحقوق محفوظة.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "مرحباً بك في مخلص! 🎉",
    html,
    text: `مرحباً ${name}! شكراً لانضمامك إلى منصة مخلص.`,
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
): Promise<boolean> => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">Mukhalis</h1>
        <p style="color: #6b7280; margin-top: 5px;">منصة التخليص الجمركي</p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 30px; text-align: center;">
        <h2 style="color: #1e293b; margin: 0 0 15px 0;">إعادة تعيين كلمة المرور</h2>
        <p style="color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
          لقد طلبت إعادة تعيين كلمة المرور. اضغط على الزر أدناه للمتابعة:
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold;">
          إعادة تعيين كلمة المرور
        </a>
        <p style="color: #94a3b8; margin-top: 20px; font-size: 12px;">
          هذا الرابط صالح لمدة ساعة واحدة فقط.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
        <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد الإلكتروني.</p>
        <p style="margin-top: 20px;">© ${new Date().getFullYear()} Mukhalis. جميع الحقوق محفوظة.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "إعادة تعيين كلمة المرور - Mukhalis",
    html,
    text: `لإعادة تعيين كلمة المرور، قم بزيارة الرابط التالي: ${resetUrl}`,
  });
};

export default {
  verifyEmailConfig,
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
};
