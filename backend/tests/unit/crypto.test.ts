import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, hashToken, generateRandomToken } from '../../src/lib/crypto.js';

describe('Cryptographic Utilities (Argon2id & Hashing)', () => {
  it('should hash password with Argon2id and successfully verify it', async () => {
    const password = 'StudentSecurePassword123!';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).toContain('$argon2id$');

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);

    const isWrongValid = await verifyPassword('WrongPassword123!', hash);
    expect(isWrongValid).toBe(false);
  });

  it('should produce deterministic SHA-256 token hashes', () => {
    const token = 'sample-verification-token-string';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // 32 bytes hex
  });

  it('should generate secure random tokens with expected byte lengths', () => {
    const token32 = generateRandomToken(32);
    expect(token32.length).toBe(64);

    const token48 = generateRandomToken(48);
    expect(token48.length).toBe(96);
  });
});
