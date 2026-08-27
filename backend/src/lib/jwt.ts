import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import { generateRandomToken, hashToken } from './crypto.js';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: 'student' | 'moderator' | 'admin';
  status: 'active' | 'suspended' | 'deactivated';
}

export interface GeneratedRefreshToken {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Signs a short-lived access JWT token
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRATION as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

/**
 * Verifies and decodes an access JWT token
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const env = getEnv();
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as AccessTokenPayload;
    return decoded;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid token';
    throw new Error(`Authentication token error: ${errorMsg}`);
  }
}

/**
 * Generates a high-entropy random refresh token, its SHA-256 hash, and expiration timestamp
 */
export function generateRefreshToken(): GeneratedRefreshToken {
  const env = getEnv();
  const rawToken = generateRandomToken(48);
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRATION_DAYS);

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}
