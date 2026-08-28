import { adminRepository } from './admin.repository.js';
import { verificationRepository } from '../verification/verification.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { safetyRepository } from '../safety/safety.repository.js';
import { getEmailProvider } from '../../lib/email/email.interface.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { ReviewVerificationInput } from './admin.types.js';
import type { ReportCategory, ReportStatus, SosStatus, ReportDocument } from '../safety/safety.types.js';
import { collegesService } from '../colleges/colleges.service.js';
import { getStorageProvider } from '../../lib/storage/storage.interface.js';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';

export class AdminService {
  /**
   * List pending verification requests for moderators/admins
   */
  async getPendingVerifications(page = 1, pageSize = 20) {
    const { items, totalCount } = await verificationRepository.findPendingQueue(page, pageSize);

    const enrichedItems = await Promise.all(
      items.map(async (doc) => {
        let userDto: { fullName: string; email: string; avatarUrl: string | null; collegeName: string } = {
          fullName: 'Student',
          email: '',
          avatarUrl: null,
          collegeName: 'KIET Group of Institutions',
        };

        try {
          const user = await usersRepository.findUserById(doc.userId);
          const profile = await usersRepository.findProfileByUserId(doc.userId);
          let collegeName = 'KIET Group of Institutions';

          if (doc.collegeId || profile?.collegeId) {
            try {
              const college = await collegesService.getCollegeById(doc.collegeId || profile?.collegeId || '');
              if (college) collegeName = college.name;
            } catch {
              // ignore
            }
          }

          if (user) {
            userDto = {
              fullName: profile?.fullName || user.email.split('@')[0],
              email: user.email,
              avatarUrl: profile?.avatarUrl || null,
              collegeName,
            };
          }
        } catch {
          // ignore lookup errors
        }

        return {
          id: doc._id.toHexString(),
          userId: doc.userId,
          collegeId: doc.collegeId,
          documentMimeType: doc.documentMimeType,
          documentSize: doc.documentSize,
          documentUrl: `/api/v1/admin/verifications/${doc._id.toHexString()}/document`,
          status: doc.status,
          createdAt: doc.createdAt.toISOString(),
          user: userDto,
        };
      })
    );

    return {
      items: enrichedItems,
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
   * Stream / download private student ID verification document for admin review
   */
  async getVerificationDocument(verificationId: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const doc = await verificationRepository.findById(verificationId);
    if (!doc) {
      throw new NotFoundError('Verification request not found');
    }

    // 1. Direct MongoDB Base64 buffer (cloud/Render persistence)
    if (doc.documentBase64) {
      const buffer = Buffer.from(doc.documentBase64, 'base64');
      return {
        buffer,
        mimeType: doc.documentMimeType || 'image/png',
        filename: `student_id_${doc.userId}_${verificationId}`,
      };
    }

    // 2. Storage provider fallback (local disk / S3)
    const storageProvider = getStorageProvider();
    const fileData = await storageProvider.getPrivateFileBuffer(doc.documentStorageKey);
    if (fileData) {
      return {
        buffer: fileData.buffer,
        mimeType: doc.documentMimeType || fileData.mimeType || 'image/jpeg',
        filename: `student_id_${doc.userId}_${verificationId}`,
      };
    }

    throw new NotFoundError('Verification document file not found');
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

  /**
   * List safety reports
   */
  async listReports(
    page = 1,
    pageSize = 20,
    category?: ReportCategory,
    status?: ReportStatus
  ) {
    const { items, totalCount } = await safetyRepository.findReports(category, status, page, pageSize);

    return {
      items: items.map((r) => ({
        id: r._id.toHexString(),
        reporterId: r.reporterId,
        reportedUserId: r.reportedUserId || null,
        tripId: r.tripId || null,
        category: r.category,
        reason: r.reason,
        evidenceUrls: r.evidenceUrls || null,
        status: r.status,
        resolutionNotes: r.resolutionNotes || null,
        resolvedBy: r.resolvedBy || null,
        resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
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
   * Review and resolve a safety report
   */
  async reviewReport(
    actorUserId: string,
    reportId: string,
    input: { status: 'under_review' | 'resolved' | 'dismissed'; resolutionNotes?: string; actionUser?: 'none' | 'suspend' }
  ) {
    const report = await safetyRepository.findReportById(reportId);
    if (!report) {
      throw new NotFoundError('Report not found');
    }

    const updated = await safetyRepository.updateReportStatus(
      reportId,
      input.status,
      actorUserId,
      input.resolutionNotes
    );

    if (input.actionUser === 'suspend' && report.reportedUserId) {
      await this.suspendUser(actorUserId, report.reportedUserId, `Suspension from report ${reportId}: ${input.resolutionNotes || 'Violations'}`);
    }

    await adminRepository.logAction({
      actorUserId,
      actionType: 'report_resolved',
      targetUserId: report.reportedUserId || null,
      targetResourceId: reportId,
      metadata: { status: input.status, actionUser: input.actionUser },
      createdAt: new Date(),
    });

    return updated;
  }

  /**
   * List SOS events
   */
  async listSosEvents(
    page = 1,
    pageSize = 20,
    status?: SosStatus
  ) {
    const { items, totalCount } = await safetyRepository.findSosEvents(status, page, pageSize);

    return {
      items: items.map((s) => ({
        id: s._id.toHexString(),
        userId: s.userId,
        tripId: s.tripId || null,
        location: s.location || null,
        status: s.status,
        triggeredAt: s.triggeredAt.toISOString(),
        resolvedAt: s.resolvedAt ? s.resolvedAt.toISOString() : null,
        resolvedBy: s.resolvedBy || null,
        resolutionNotes: s.resolutionNotes || null,
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
   * Resolve an SOS event
   */
  async resolveSosEvent(
    actorUserId: string,
    sosId: string,
    input: { status: 'resolved' | 'false_alarm'; resolutionNotes?: string }
  ) {
    const updated = await safetyRepository.resolveSosEvent(
      sosId,
      input.status,
      actorUserId,
      input.resolutionNotes
    );
    if (!updated) {
      throw new NotFoundError('SOS event not found');
    }

    await adminRepository.logAction({
      actorUserId,
      actionType: 'sos_resolved',
      targetUserId: updated.userId,
      targetResourceId: sosId,
      metadata: { status: input.status, resolutionNotes: input.resolutionNotes },
      createdAt: new Date(),
    });

    return updated;
  }

  /**
   * Safety history audit for user
   */
  async getUserSafetyHistory(userId: string) {
    const db = getDb();

    const [user, profile, reportsAgainst, reportsBy, sosEvents] = await Promise.all([
      usersRepository.findUserById(userId),
      db.collection(COLLECTIONS.PROFILES).findOne({ userId }),
      db.collection<ReportDocument>(COLLECTIONS.REPORTS).find({ reportedUserId: userId }).toArray(),
      db.collection<ReportDocument>(COLLECTIONS.REPORTS).find({ reporterId: userId }).toArray(),
      db.collection(COLLECTIONS.SOS_EVENTS).find({ userId }).toArray(),
    ]);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      userId,
      email: user.email,
      status: user.status,
      trustScore: profile?.trustScore || 0,
      verificationStatus: profile?.verification?.status || 'unverified',
      reportsAgainstCount: reportsAgainst.length,
      reportsByCount: reportsBy.length,
      sosEventsCount: sosEvents.length,
      reportsAgainst: reportsAgainst.map((r) => ({
        id: r._id.toHexString(),
        category: r.category,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}

export const adminService = new AdminService();
