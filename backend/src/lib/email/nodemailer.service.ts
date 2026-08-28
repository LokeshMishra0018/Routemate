import nodemailer from 'nodemailer';
import { EmailProvider, lastSentEmails } from './email.interface.js';
import { getEnv } from '../../config/env.js';

export class NodemailerEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    const env = getEnv();
    if (env.NODE_ENV === 'test') {
      return null;
    }

    if (env.SMTP_USER && env.SMTP_PASS) {
      const isGmail = env.SMTP_HOST === 'smtp.gmail.com' || !env.SMTP_HOST;
      this.transporter = nodemailer.createTransport(
        isGmail
          ? {
              service: 'gmail',
              auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              },
              connectionTimeout: 8000,
              greetingTimeout: 8000,
              socketTimeout: 10000,
            }
          : {
              host: env.SMTP_HOST,
              port: env.SMTP_PORT || 587,
              secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
              auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              },
              connectionTimeout: 8000,
              greetingTimeout: 8000,
              socketTimeout: 10000,
            }
      );
    }
    return this.transporter;
  }

  async sendVerificationEmail(to: string, otp: string, name?: string): Promise<void> {
    const env = getEnv();
    const studentName = name || 'Student';
    const fromAddress = env.SMTP_USER ? `RouteMate <${env.SMTP_USER}>` : env.EMAIL_FROM;

    // Record in memory for tests/diagnostics
    lastSentEmails.push({ to, type: 'VERIFICATION', token: otp, timestamp: new Date() });
    console.log(`[EMAIL][VERIFY] From: ${fromAddress} | To: ${to} (${studentName}) | 6-Digit OTP: ${otp}`);

    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn('[EMAIL][WARN] No SMTP transporter configured. Email was not dispatched over network.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 20px; }
          .card { max-width: 520px; margin: 0 auto; background-color: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
          .title { font-size: 20px; font-weight: 700; color: #ffffff; text-align: center; margin-bottom: 12px; }
          .desc { font-size: 14px; color: #94a3b8; text-align: center; line-height: 1.6; margin-bottom: 28px; }
          .otp-container { background-color: #1e293b; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 28px; }
          .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #818cf8; font-family: 'Courier New', Courier, monospace; }
          .expiry { font-size: 12px; color: #f59e0b; text-align: center; margin-bottom: 24px; }
          .footer { font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🚗 RouteMate</div>
          <div class="title">Verify Your Campus Email</div>
          <div class="desc">
            Hi <strong>${studentName}</strong>,<br>
            Welcome to RouteMate! Use the 6-digit verification code below to activate your student carpooling account:
          </div>
          <div class="otp-container">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="expiry">⏱️ This OTP expires in <strong>10 minutes</strong>. Do not share this code with anyone.</div>
          <div class="footer">
            If you did not request this email, please disregard it.<br>
            &copy; ${new Date().getFullYear()} RouteMate Campus Carpooling.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject: `RouteMate Verification Code: ${otp}`,
        text: `Hello ${studentName},\n\nYour RouteMate 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nRouteMate Team`,
        html: htmlContent,
      });
      console.log(`[EMAIL][SUCCESS] Sent verification email to ${to}. MessageId: ${info.messageId}`);
    } catch (err) {
      console.error('[EMAIL][ERROR] Failed to send email via SMTP transporter:', err);
    }
  }

  async sendPasswordResetEmail(to: string, otp: string, name?: string): Promise<void> {
    const env = getEnv();
    const studentName = name || 'Student';
    const fromAddress = env.SMTP_USER ? `RouteMate <${env.SMTP_USER}>` : env.EMAIL_FROM;

    lastSentEmails.push({ to, type: 'PASSWORD_RESET', token: otp, timestamp: new Date() });
    console.log(`[EMAIL][RESET_PASSWORD] From: ${fromAddress} | To: ${to} (${studentName}) | 6-Digit OTP: ${otp}`);

    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn('[EMAIL][WARN] No SMTP transporter configured. Email was not dispatched over network.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 20px; }
          .card { max-width: 520px; margin: 0 auto; background-color: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
          .title { font-size: 20px; font-weight: 700; color: #ffffff; text-align: center; margin-bottom: 12px; }
          .desc { font-size: 14px; color: #94a3b8; text-align: center; line-height: 1.6; margin-bottom: 28px; }
          .otp-container { background-color: #1e293b; border: 2px dashed #f43f5e; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 28px; }
          .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #fb7185; font-family: 'Courier New', Courier, monospace; }
          .expiry { font-size: 12px; color: #f59e0b; text-align: center; margin-bottom: 24px; }
          .footer { font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🚗 RouteMate</div>
          <div class="title">Reset Your Password</div>
          <div class="desc">
            Hi <strong>${studentName}</strong>,<br>
            We received a request to reset your password. Use the 6-digit code below to set a new password:
          </div>
          <div class="otp-container">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="expiry">⏱️ This OTP expires in <strong>10 minutes</strong>. If you did not make this request, you can safely ignore this email.</div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} RouteMate Campus Carpooling.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject: `RouteMate Password Reset Code: ${otp}`,
        text: `Hello ${studentName},\n\nYour RouteMate 6-digit password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nRouteMate Team`,
        html: htmlContent,
      });
      console.log(`[EMAIL][SUCCESS] Sent password reset email to ${to}. MessageId: ${info.messageId}`);
    } catch (err) {
      console.error('[EMAIL][ERROR] Failed to send email via SMTP transporter:', err);
    }
  }

  async sendVerificationStatusEmail(to: string, status: 'approved' | 'rejected', reason?: string): Promise<void> {
    const env = getEnv();
    const fromAddress = env.SMTP_USER ? `RouteMate <${env.SMTP_USER}>` : env.EMAIL_FROM;
    lastSentEmails.push({ to, type: `VERIFICATION_${status.toUpperCase()}`, timestamp: new Date() });
    console.log(`[EMAIL][STATUS] From: ${fromAddress} | To: ${to} | Status: ${status} | Reason: ${reason || 'N/A'}`);

    const transporter = this.getTransporter();
    if (!transporter) {
      return;
    }

    try {
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject: `RouteMate ID Verification ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
        text: `Your college ID verification has been ${status}.${reason ? ` Reason: ${reason}` : ''}`,
      });
    } catch (err) {
      console.error('[EMAIL][ERROR] Failed to send verification status email:', err);
    }
  }
}
