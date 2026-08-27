import { getEnv } from '../../config/env.js';

export interface EmailProvider {
  sendVerificationEmail(to: string, token: string, name?: string): Promise<void>;
  sendPasswordResetEmail(to: string, token: string, name?: string): Promise<void>;
  sendVerificationStatusEmail(to: string, status: 'approved' | 'rejected', reason?: string): Promise<void>;
}

export class DevEmailProvider implements EmailProvider {
  // In-memory record of sent emails for automated test assertion
  public static lastSentEmails: Array<{ to: string; type: string; token?: string; timestamp: Date }> = [];

  async sendVerificationEmail(to: string, token: string, name?: string): Promise<void> {
    const from = getEnv().EMAIL_FROM;
    console.log(`[EMAIL][VERIFY] From: ${from} | To: ${to} (${name || 'Student'}) | Token: ${token}`);
    DevEmailProvider.lastSentEmails.push({ to, type: 'VERIFICATION', token, timestamp: new Date() });
  }

  async sendPasswordResetEmail(to: string, token: string, name?: string): Promise<void> {
    const from = getEnv().EMAIL_FROM;
    console.log(`[EMAIL][RESET_PASSWORD] From: ${from} | To: ${to} (${name || 'Student'}) | Token: ${token}`);
    DevEmailProvider.lastSentEmails.push({ to, type: 'PASSWORD_RESET', token, timestamp: new Date() });
  }

  async sendVerificationStatusEmail(to: string, status: 'approved' | 'rejected', reason?: string): Promise<void> {
    const from = getEnv().EMAIL_FROM;
    console.log(`[EMAIL][STATUS] From: ${from} | To: ${to} | Status: ${status} | Reason: ${reason || 'N/A'}`);
    DevEmailProvider.lastSentEmails.push({ to, type: `VERIFICATION_${status.toUpperCase()}`, timestamp: new Date() });
  }
}

let emailProviderInstance: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!emailProviderInstance) {
    // In production or development without external SMTP/Resend API, use DevEmailProvider
    emailProviderInstance = new DevEmailProvider();
  }
  return emailProviderInstance;
}

export function setEmailProvider(provider: EmailProvider): void {
  emailProviderInstance = provider;
}
