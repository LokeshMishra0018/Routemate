import { getEnv } from '../../config/env.js';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;

/**
 * Fetch fresh OAuth2 access token from Google OAuth endpoint using Refresh Token over HTTPS (Port 443)
 */
export async function getGmailApiAccessToken(): Promise<string | null> {
  const env = getEnv();
  const clientId = env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = env.GMAIL_CLIENT_SECRET?.trim();
  const refreshToken = env.GMAIL_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.accessToken;
  }

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[GMAIL_API][TOKEN_ERROR] Status ${response.status}: ${errText}`);
      return null;
    }

    const data = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) {
      console.error('[GMAIL_API][TOKEN_ERROR] No access_token returned by Google OAuth');
      return null;
    }

    const expiresIn = data.expires_in || 3600;
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: now + expiresIn * 1000,
    };

    return cachedToken.accessToken;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GMAIL_API][TOKEN_ERROR] Network error fetching access token:', msg);
    return null;
  }
}

/**
 * Send an email directly via Google Gmail REST API (HTTPS Port 443)
 * Completely immune to cloud SMTP port blocks (Render/AWS/etc.)
 */
export async function sendViaGmailRestApi(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const env = getEnv();
  const accessToken = await getGmailApiAccessToken();
  if (!accessToken) {
    return false;
  }

  const senderEmail = env.GMAIL_SENDER || env.SMTP_USER || 'lokesh.2327cs1097@kiet.edu';
  const fromHeader = `RouteMate <${senderEmail.trim()}>`;

  // Encode subject to UTF-8 base64
  const encodedSubject = `=?utf-8?B?${Buffer.from(input.subject).toString('base64')}?=`;

  // Construct RFC 2822 Email format
  const rawMessage = [
    `From: ${fromHeader}`,
    `To: ${input.to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(input.html).toString('base64'),
  ].join('\r\n');

  // Convert raw message to URL-safe base64
  const base64UrlEncoded = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: base64UrlEncoded,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[GMAIL_API][SEND_ERROR] Status ${response.status}: ${errBody}`);
      return false;
    }

    const resData = (await response.json()) as { id?: string; threadId?: string };
    console.log(`[EMAIL][GMAIL_API_SUCCESS] ✅ Sent email to ${input.to} via Gmail REST API (HTTPS). Message ID: ${resData.id}`);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GMAIL_API][SEND_ERROR] Network error sending message:', msg);
    return false;
  }
}
