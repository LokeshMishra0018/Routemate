import { hash, verify } from '@node-rs/argon2';
import crypto from 'node:crypto';

/**
 * Argon2id password hashing options conforming to OWASP recommendations
 * (algorithm: 2 represents Argon2id in @node-rs/argon2)
 */
const ARGON2_OPTIONS = {
  algorithm: 2 as const,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * Hash plaintext password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verify plaintext password against Argon2id hash
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * Compute SHA-256 hash of raw tokens (refresh tokens, email tokens, reset tokens)
 * Storing hashes rather than raw tokens prevents offline token compromise.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate cryptographically secure random hex string
 */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
