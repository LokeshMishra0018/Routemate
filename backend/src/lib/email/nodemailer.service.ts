import dns from 'node:dns';
import nodemailer from 'nodemailer';
import { EmailProvider, lastSentEmails } from './email.interface.js';
import { getEnv } from '../../config/env.js';

async function resolveDirectIPv4(host: string): Promise<string> {
  // If host is already an IP, return as-is
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return host;
  }
  try {
    const ips = await dns.promises.resolve4(host);
    if (ips && ips.length > 0) {
      return ips[0];
    }
  } catch {
    // If resolve4 fails, fallback to hostname
  }
  return host;
}

export class NodemailerEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter | null = null;

  private async getTransporterAsync(): Promise<nodemailer.Transporter | null> {
    if (this.transporter) {
      return this.transporter;
    }

    const env = getEnv();
    if (env.NODE_ENV === 'test') {
      return null;
    }

    if (env.SMTP_USER && env.SMTP_PASS) {
      const smtpUser = env.SMTP_USER.trim();
      const smtpPass = env.SMTP_PASS.replace(/\s+/g, '').replace(/["']/g, '').trim();
      const originalHost = env.SMTP_HOST || 'smtp.gmail.com';
      const port = env.SMTP_PORT || 587;
      const secure = env.SMTP_SECURE !== undefined ? env.SMTP_SECURE : port === 465;

      const directIpv4Host = await resolveDirectIPv4(originalHost);

      this.transporter = nodemailer.createTransport({
        host: directIpv4Host,
        port,
        secure,
        tls: {
          servername: originalHost,
          rejectUnauthorized: false,
        },
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      } as any);
    }
    return this.transporter;
  }

  async verifyTransport(): Promise<boolean> {
    const env = getEnv();
    if (env.GMAIL_CLIENT_ID && env.GMAIL_REFRESH_TOKEN) {
      console.log('[EMAIL][INIT] ✅ Google Gmail REST API configured (HTTPS Port 443 - Cloud guaranteed).');
      return true;
    }
    if (env.RESEND_API_KEY) {
      console.log('[EMAIL][INIT] ✅ Resend HTTPS API configured (Port 443 - Cloud guaranteed).');
      return true;
    }
    if (env.BREVO_API_KEY) {
      console.log('[EMAIL][INIT] ✅ Brevo HTTPS API configured (Port 443 - Cloud guaranteed).');
      return true;
    }

    const transporter = await this.getTransporterAsync();
    if (!transporter) {
      console.log('[EMAIL][INIT] ℹ️ No live email credentials configured. Emails will be logged to console.');
      return false;
    }

    try {
      await transporter.verify();
      console.log('[EMAIL][INIT] ✅ SMTP IPv4 transport verified successfully and connected to Gmail server.');
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[EMAIL][INIT] ❌ Primary SMTP transport verification note:', message);
      return false;
    }
  }

  private async sendViaResend(to: string, subject: string, html: string, text: string): Promise<boolean> {
    const env = getEnv();
    if (!env.RESEND_API_KEY) return false;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.SMTP_FROM || 'RouteMate <onboarding@resend.dev>',
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[EMAIL][RESEND_ERROR] Status ${response.status}: ${errBody}`);
        return false;
      }

      const resData = (await response.json()) as { id?: string };
      console.log(`[EMAIL][SUCCESS] Sent via Resend HTTPS API to ${to}. ID: ${resData.id}`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EMAIL][RESEND_ERROR] Failed to send via Resend API:', msg);
      return false;
    }
  }

  private async sendViaBrevo(to: string, subject: string, html: string, text: string): Promise<boolean> {
    const env = getEnv();
    if (!env.BREVO_API_KEY) return false;

    try {
      const fromEmail = env.SMTP_USER?.trim() || 'lokesh.2327cs1097@kiet.edu';
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': env.BREVO_API_KEY.trim(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'RouteMate', email: fromEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[EMAIL][BREVO_ERROR] Status ${response.status}: ${errBody}`);
        return false;
      }

      const resData = (await response.json()) as { messageId?: string };
      console.log(`[EMAIL][SUCCESS] Sent via Brevo HTTPS API to ${to}. MessageId: ${resData.messageId}`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EMAIL][BREVO_ERROR] Failed to send via Brevo API:', msg);
      return false;
    }
  }

  async sendVerificationEmail(to: string, otp: string, name?: string): Promise<void> {
    const env = getEnv();
    const studentName = name || 'Student';
    const fromAddress = env.SMTP_USER ? `RouteMate <${env.SMTP_USER.trim()}>` : env.EMAIL_FROM;
    const subject = `RouteMate Verification Code: ${otp}`;
    const textContent = `Hello ${studentName},\n\nYour RouteMate 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nRouteMate Team`;

    // Record in memory for tests/diagnostics
    lastSentEmails.push({ to, type: 'VERIFICATION', token: otp, timestamp: new Date() });
    console.log(`[EMAIL][VERIFY] From: ${fromAddress} | To: ${to} (${studentName}) | 6-Digit OTP: ${otp}`);

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

    // 1. Try Google Gmail HTTPS REST API first (Guaranteed 100% on Render / Cloud)
    if (env.GMAIL_CLIENT_ID && env.GMAIL_REFRESH_TOKEN) {
      const { sendViaGmailRestApi } = await import('./gmail-api.service.js');
      const sent = await sendViaGmailRestApi({ to, subject, html: htmlContent, text: textContent });
      if (sent) return;
    }

    // 2. Try HTTPS API Providers (Resend / Brevo) (guaranteed on Render)
    if (env.RESEND_API_KEY) {
      const sent = await this.sendViaResend(to, subject, htmlContent, textContent);
      if (sent) return;
    }
    if (env.BREVO_API_KEY) {
      const sent = await this.sendViaBrevo(to, subject, htmlContent, textContent);
      if (sent) return;
    }

    // 2. Try Nodemailer SMTP with Direct IPv4
    const transporter = await this.getTransporterAsync();
    if (!transporter) {
      console.warn('[EMAIL][WARN] No SMTP or HTTPS email provider active. Email logged to console.');
      return;
    }

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[EMAIL][SUCCESS] Sent verification email to ${to}. MessageId: ${info.messageId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EMAIL][ERROR] Primary SMTP send failed:', msg);

      // Automatic Fallback to Port 587 STARTTLS with Direct IPv4
      if (env.SMTP_USER && env.SMTP_PASS) {
        try {
          const directIpv4 = await resolveDirectIPv4('smtp.gmail.com');
          const fallbackTransporter = nodemailer.createTransport({
            host: directIpv4,
            port: 587,
            secure: false,
            tls: {
              servername: 'smtp.gmail.com',
              rejectUnauthorized: false,
            },
            auth: {
              user: env.SMTP_USER.trim(),
              pass: env.SMTP_PASS.replace(/\s+/g, '').replace(/["']/g, '').trim(),
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          } as any);
          const fallbackInfo = await fallbackTransporter.sendMail({
            from: fromAddress,
            to,
            subject,
            text: textContent,
            html: htmlContent,
          });
          console.log(`[EMAIL][SUCCESS] Fallback port 587 successfully sent email to ${to}. MessageId: ${fallbackInfo.messageId}`);
        } catch (fallbackErr: unknown) {
          const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          console.error('[EMAIL][ERROR] Fallback port 587 also failed:', fallbackMsg);
        }
      }
    }
  }

  async sendPasswordResetEmail(to: string, otp: string, name?: string): Promise<void> {
    const env = getEnv();
    const studentName = name || 'Student';
    const fromAddress = env.SMTP_USER ? `RouteMate <${env.SMTP_USER.trim()}>` : env.EMAIL_FROM;
    const subject = `RouteMate Password Reset Code: ${otp}`;
    const textContent = `Hello ${studentName},\n\nYour RouteMate 6-digit password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nRouteMate Team`;

    lastSentEmails.push({ to, type: 'PASSWORD_RESET', token: otp, timestamp: new Date() });
    console.log(`[EMAIL][RESET_PASSWORD] From: ${fromAddress} | To: ${to} (${studentName}) | 6-Digit OTP: ${otp}`);

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

    if (env.GMAIL_CLIENT_ID && env.GMAIL_REFRESH_TOKEN) {
      const { sendViaGmailRestApi } = await import('./gmail-api.service.js');
      const sent = await sendViaGmailRestApi({ to, subject, html: htmlContent, text: textContent });
      if (sent) return;
    }

    if (env.RESEND_API_KEY) {
      const sent = await this.sendViaResend(to, subject, htmlContent, textContent);
      if (sent) return;
    }
    if (env.BREVO_API_KEY) {
      const sent = await this.sendViaBrevo(to, subject, htmlContent, textContent);
      if (sent) return;
    }

    const transporter = await this.getTransporterAsync();
    if (!transporter) {
      console.warn('[EMAIL][WARN] No SMTP or HTTPS email provider active.');
      return;
    }

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[EMAIL][SUCCESS] Sent password reset email to ${to}. MessageId: ${info.messageId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EMAIL][ERROR] Primary reset email send failed:', msg);
    }
  }

  async sendVerificationStatusEmail(to: string, status: 'approved' | 'rejected', reason?: string): Promise<void> {
    const env = getEnv();
    const fromAddress = env.SMTP_USER ? `RouteMate <${env.SMTP_USER.trim()}>` : env.EMAIL_FROM;
    lastSentEmails.push({ to, type: `VERIFICATION_${status.toUpperCase()}`, timestamp: new Date() });
    console.log(`[EMAIL][STATUS] From: ${fromAddress} | To: ${to} | Status: ${status} | Reason: ${reason || 'N/A'}`);

    const transporter = await this.getTransporterAsync();
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EMAIL][ERROR] Failed to send verification status email:', msg);
    }
  }
}
