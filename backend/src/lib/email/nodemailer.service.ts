import nodemailer from 'nodemailer';
import { EmailProvider, lastSentEmails } from './email.interface.js';
import { getEnv } from '../../config/env.js';

export class NodemailerEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const env = getEnv();
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }

  async sendVerificationEmail(to: string, otp: string, name?: string): Promise<void> {
    const env = getEnv();
    const studentName = name || 'Student';

    // Record in memory for tests/diagnostics
    lastSentEmails.push({ to, type: 'VERIFICATION', token: otp, timestamp: new Date() });
    console.log(`[EMAIL][VERIFY] From: ${env.EMAIL_FROM} | To: ${to} (${studentName}) | 6-Digit OTP: ${otp}`);

    if (!this.transporter) {
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
          .otp-box { background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%); border: 1px solid #4f46e5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
          .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #a5b4fc; font-family: monospace; }
          .expiry { font-size: 12px; color: #64748b; text-align: center; margin-bottom: 24px; }
          .footer { font-size: 11px; color: #475569; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🧭 RouteMate</div>
          <div class="title">Verify Your College Email</div>
          <div class="desc">Hello ${studentName}, welcome to RouteMate! Use the 6-digit verification code below to activate your student account.</div>
          <div class="otp-box">
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
      await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: `RouteMate Verification Code: ${otp}`,
        text: `Hello ${studentName},\n\nYour RouteMate 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nRouteMate Team`,
        html: htmlContent,
      });
    } catch (err) {
      console.error('[EMAIL][ERROR] Failed to send email via SMTP transporter:', err);
    }
  }

  async sendPasswordResetEmail(to: string, otp: string, name?: string): Promise<void> {
    const env = getEnv();
    const studentName = name || 'Student';

    lastSentEmails.push({ to, type: 'PASSWORD_RESET', token: otp, timestamp: new Date() });
    console.log(`[EMAIL][RESET_PASSWORD] From: ${env.EMAIL_FROM} | To: ${to} (${studentName}) | 6-Digit OTP: ${otp}`);

    if (!this.transporter) {
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
          .otp-box { background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%); border: 1px solid #ef4444; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
          .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #fca5a5; font-family: monospace; }
          .expiry { font-size: 12px; color: #64748b; text-align: center; margin-bottom: 24px; }
          .footer { font-size: 11px; color: #475569; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🧭 RouteMate</div>
          <div class="title">Reset Your Password</div>
          <div class="desc">Hello ${studentName}, we received a request to reset your password. Use the 6-digit code below to create a new password.</div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="expiry">⏱️ This reset OTP expires in <strong>10 minutes</strong>. If you did not make this request, please contact security immediately.</div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} RouteMate Campus Carpooling.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: `RouteMate Password Reset Code: ${otp}`,
        text: `Hello ${studentName},\n\nYour RouteMate 6-digit password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nRouteMate Team`,
        html: htmlContent,
      });
    } catch (err) {
      console.error('[EMAIL][ERROR] Failed to send email via SMTP transporter:', err);
    }
  }

  async sendVerificationStatusEmail(to: string, status: 'approved' | 'rejected', reason?: string): Promise<void> {
    const env = getEnv();
    lastSentEmails.push({ to, type: `VERIFICATION_${status.toUpperCase()}`, timestamp: new Date() });
    console.log(`[EMAIL][STATUS] From: ${env.EMAIL_FROM} | To: ${to} | Status: ${status} | Reason: ${reason || 'N/A'}`);

    if (!this.transporter) {
      return;
    }

    try {
      await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: `RouteMate Student ID Verification: ${status.toUpperCase()}`,
        text: `Your college ID verification has been ${status}.${reason ? ` Reason: ${reason}` : ''}`,
      });
    } catch (err) {
      console.error('[EMAIL][ERROR] Failed to send status email:', err);
    }
  }
}
