import { describe, it, expect } from 'vitest';
import { generateAccessToken, verifyAccessToken, generateRefreshToken } from '../../src/lib/jwt.js';

describe('JWT Utilities', () => {
  it('should sign and verify access token with correct claims', () => {
    const payload = {
      userId: '60d5ec49f1b24b2b8c8b4567',
      email: 'student@kiet.edu',
      role: 'student' as const,
      status: 'active' as const,
    };

    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.status).toBe(payload.status);
  });

  it('should reject invalid or tampered access token', () => {
    const payload = {
      userId: '60d5ec49f1b24b2b8c8b4567',
      email: 'student@kiet.edu',
      role: 'student' as const,
      status: 'active' as const,
    };

    const token = generateAccessToken(payload);
    const tampered = token + 'corrupted';

    expect(() => verifyAccessToken(tampered)).toThrow(/Authentication token error/);
  });

  it('should generate high-entropy refresh tokens with hash and expiry', () => {
    const refresh = generateRefreshToken();
    expect(refresh.rawToken).toBeDefined();
    expect(refresh.tokenHash).toBeDefined();
    expect(refresh.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
