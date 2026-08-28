import { getEnv } from '../../config/env.js';

export interface EmailProvider {
  sendVerificationEmail(to: string, token: string, name?: string): Promise<void>;
  sendPasswordResetEmail(to: string, token: string, name?: string): Promise<void>;
  sendVerificationStatusEmail(to: string, status: 'approved' | 'rejected', reason?: string): Promise<void>;
}

export interface SentEmailRecord {
  to: string;
  type: string;
  token?: string;
  timestamp: Date;
}

export const lastSentEmails: SentEmailRecord[] = [];

export class DevEmailProvider implements EmailProvider {
  // Static alias for test assertions
  public static get lastSentEmails(): SentEmailRecord[] {
    return lastSentEmails;
  }

  async sendVerificationEmail(to: string, token: string, name?: string): Promise<void> {
    const from = getEnv().EMAIL_FROM;
    console.log(`[EMAIL][VERIFY] From: ${from} | To: ${to} (${name || 'Student'}) | OTP: ${token}`);
    lastSentEmails.push({ to, type: 'VERIFICATION', token, timestamp: new Date() });
  }

  async sendPasswordResetEmail(to: string, token: string, name?: string): Promise<void> {
    const from = getEnv().EMAIL_FROM;
    console.log(`[EMAIL][RESET_PASSWORD] From: ${from} | To: ${to} (${name || 'Student'}) | OTP: ${token}`);
    lastSentEmails.push({ to, type: 'PASSWORD_RESET', token, timestamp: new Date() });
  }

  async sendVerificationStatusEmail(to: string, status: 'approved' | 'rejected', reason?: string): Promise<void> {
    const from = getEnv().EMAIL_FROM;
    console.log(`[EMAIL][STATUS] From: ${from} | To: ${to} | Status: ${status} | Reason: ${reason || 'N/A'}`);
    lastSentEmails.push({ to, type: `VERIFICATION_${status.toUpperCase()}`, timestamp: new Date() });
  }
}

import { NodemailerEmailProvider } from './nodemailer.service.js';

let emailProviderInstance: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!emailProviderInstance) {
    emailProviderInstance = new NodemailerEmailProvider();
  }
  return emailProviderInstance;
}

export function setEmailProvider(provider: EmailProvider): void {
  emailProviderInstance = provider;
}
