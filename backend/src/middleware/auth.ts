import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, AccessTokenPayload } from '../lib/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { getDb } from '../db/mongo.js';
import { COLLECTIONS } from '../db/collections.js';
import { ObjectId } from 'mongodb';

// Augment FastifyRequest to include user context
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: 'student' | 'moderator' | 'admin';
      status: 'active' | 'suspended' | 'deactivated';
    };
  }
}

/**
 * Fastify preHandler hook: verifies JWT access token and attaches user to request
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication token is required');
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new UnauthorizedError('Authentication token is missing');
  }

  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid authentication token';
    throw new UnauthorizedError(msg);
  }

  // Verify user still exists in database and status is active
  const db = getDb();
  let userObjectId: ObjectId;
  try {
    userObjectId = new ObjectId(payload.userId);
  } catch {
    throw new UnauthorizedError('Invalid user ID in authentication token');
  }

  const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: userObjectId });
  if (!user) {
    throw new UnauthorizedError('User account not found or has been removed');
  }

  if (user.status === 'suspended') {
    throw new ForbiddenError('Account is suspended. Please contact support.');
  }

  if (user.status === 'deactivated') {
    throw new ForbiddenError('Account is deactivated.');
  }

  request.user = {
    id: user._id.toHexString(),
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

/**
 * Higher-order preHandler hook to enforce required user role(s)
 */
export function requireRole(...roles: Array<'student' | 'moderator' | 'admin'>) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(request.user.role)) {
      throw new ForbiddenError(`Access forbidden: Requires ${roles.join(' or ')} privilege`);
    }
  };
}

/**
 * PreHandler hook to ensure user has an approved college verification status
 */
export async function requireVerified(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const db = getDb();
  const profile = await db.collection(COLLECTIONS.PROFILES).findOne({ userId: request.user.id });
  if (!profile || profile.verificationStatus !== 'approved') {
    throw new ForbiddenError('Approved college verification required to access this resource');
  }
}
