import { adminRepository } from './admin.repository.js';
import { verificationRepository } from '../verification/verification.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { getEmailProvider } from '../../lib/email/email.interface.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { ReviewVerificationInput } from './admin.types.js';

export class AdminService {
  /**
   * List pending verification requests for moderators/admins
   */
  async getPendingVerifications(page = 1, pageSize = 20) {
    const { items, totalCount } = await verificationRepository.findPendingQueue(page, pageSize);
    return {
      items: items.map((doc) => ({
        id: doc._id.toHexString(),
        userId: doc.userId,
        collegeId: doc.collegeId,
        documentMimeType: doc.documentMimeType,
        documentSize: doc.documentSize,
        status: doc.status,
        createdAt: doc.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        hasNextPage: page * pageSize < totalCount,
      },
    };
  }

  /**
   * Review student verification request (approve / reject)
   */
  async reviewVerification(adminUserId: string, verificationId: string, input: ReviewVerificationInput) {
    const doc = await verificationRepository.findById(verificationId);
    if (!doc) {
      throw new NotFoundError('Verification request not found');
    }

    if (input.status === 'rejected' && !input.rejectionReason) {
      throw new ValidationError('A rejection reason is required when rejecting verification');
    }

    const now = new Date();

    // 1. Update verification document
    await verificationRepository.update(verificationId, {
      status: input.status,
      reviewerId: adminUserId,
      reviewedAt: now,
      rejectionReason: input.status === 'rejected' ? input.rejectionReason : null,
    });

    // 2. Update user profile verificationStatus (and boost trustScore upon approval)
    const profileUpdates: Record<string, unknown> = {
      verificationStatus: input.status,
    };
    if (input.status === 'approved') {
      profileUpdates.trustScore = 80;
    }
    await usersRepository.updateProfile(doc.userId, profileUpdates);

    // 3. Log immutable audit action
    await adminRepository.logAction({
      actorUserId: adminUserId,
      actionType: input.status === 'approved' ? 'verification_approved' : 'verification_rejected',
      targetUserId: doc.userId,
      targetResourceId: verificationId,
      metadata: { rejectionReason: input.rejectionReason },
      createdAt: now,
    });

    // 4. Send notification email to user
    const targetUser = await usersRepository.findUserById(doc.userId);
    if (targetUser) {
      const emailProvider = getEmailProvider();
      await emailProvider.sendVerificationStatusEmail(targetUser.email, input.status, input.rejectionReason);
    }

    return {
      id: verificationId,
      status: input.status,
      reviewedAt: now.toISOString(),
      rejectionReason: input.rejectionReason || null,
    };
  }

  /**
   * List users for administration
   */
  async listUsers(page = 1, pageSize = 20, search?: string) {
    const filter: Record<string, unknown> = {};
    if (search && search.trim().length > 0) {
      filter.emailNormalized = { $regex: search.trim().toLowerCase(), $options: 'i' };
    }

    const { items, totalCount } = await adminRepository.findUsers(filter, page, pageSize);

    return {
      items: items.map((u) => ({
        id: u._id.toHexString(),
        email: u.email,
        role: u.role,
        status: u.status,
        emailVerified: u.emailVerifiedAt !== null,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString() || null,
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        hasNextPage: page * pageSize < totalCount,
      },
    };
  }

  /**
   * Suspend a user account and immediately revoke all active sessions
   */
  async suspendUser(adminUserId: string, targetUserId: string, reason: string) {
    const user = await usersRepository.findUserById(targetUserId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role === 'admin') {
      throw new ValidationError('Cannot suspend an administrator account');
    }

    const now = new Date();
    await usersRepository.updateUser(targetUserId, { status: 'suspended' });
    await usersRepository.revokeAllUserSessions(targetUserId);

    await adminRepository.logAction({
      actorUserId: adminUserId,
      actionType: 'user_suspended',
      targetUserId,
      targetResourceId: null,
      metadata: { reason },
      createdAt: now,
    });

    return { message: `User account ${user.email} has been suspended.` };
  }

  /**
   * Unsuspend a previously suspended user account
   */
  async unsuspendUser(adminUserId: string, targetUserId: string) {
    const user = await usersRepository.findUserById(targetUserId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const now = new Date();
    await usersRepository.updateUser(targetUserId, { status: 'active' });

    await adminRepository.logAction({
      actorUserId: adminUserId,
      actionType: 'user_unsuspended',
      targetUserId,
      targetResourceId: null,
      createdAt: now,
    });

    return { message: `User account ${user.email} has been reinstated.` };
  }

  /**
   * Retrieve immutable audit logs
   */
  async getAuditLogs(page = 1, pageSize = 20) {
    const { items, totalCount } = await adminRepository.findAuditLogs(page, pageSize);
    return {
      items: items.map((log) => ({
        id: log._id.toHexString(),
        actorUserId: log.actorUserId,
        actionType: log.actionType,
        targetUserId: log.targetUserId,
        targetResourceId: log.targetResourceId,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        hasNextPage: page * pageSize < totalCount,
      },
    };
  }
}

export const adminService = new AdminService();
