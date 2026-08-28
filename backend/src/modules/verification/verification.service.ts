import { verificationRepository } from './verification.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { getStorageProvider } from '../../lib/storage/storage.interface.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { VerificationResponseDto } from './verification.types.js';

export class VerificationService {
  /**
   * Submit a college ID document for student verification
   */
  async submitVerification(
    userId: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalFilename: string
  ): Promise<VerificationResponseDto> {
    const profile = await usersRepository.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundError('User profile not found');
    }

    if (profile.verificationStatus === 'approved') {
      throw new ValidationError('Your student verification is already approved');
    }

    // Validate MIME types (JPEG, PNG, WebP, PDF)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new ValidationError('Invalid document format. Allowed formats: JPG, PNG, WEBP, PDF');
    }

    // Validate size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (fileBuffer.length > maxSize) {
      throw new ValidationError('Document file size cannot exceed 5MB');
    }

    // Store document in private storage
    const storageProvider = getStorageProvider();
    const { storageKey, size } = await storageProvider.uploadPrivateFile(fileBuffer, mimeType, originalFilename);

    const now = new Date();
    const doc = await verificationRepository.create({
      userId,
      collegeId: profile.collegeId,
      documentStorageKey: storageKey,
      documentMimeType: mimeType,
      documentSize: size,
      documentBase64: fileBuffer.toString('base64'),
      status: 'pending',
      reviewerId: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    });

    // Update profile status to pending
    await usersRepository.updateProfile(userId, { verificationStatus: 'pending' });

    return {
      id: doc._id.toHexString(),
      userId: doc.userId,
      collegeId: doc.collegeId,
      status: doc.status,
      documentMimeType: doc.documentMimeType,
      documentSize: doc.documentSize,
      rejectionReason: doc.rejectionReason,
      createdAt: doc.createdAt.toISOString(),
      reviewedAt: null,
    };
  }

  /**
   * Get the latest verification status for the current user
   */
  async getOwnVerification(userId: string): Promise<VerificationResponseDto | null> {
    const doc = await verificationRepository.findLatestByUserId(userId);
    if (!doc) {
      return null;
    }
    return {
      id: doc._id.toHexString(),
      userId: doc.userId,
      collegeId: doc.collegeId,
      status: doc.status,
      documentMimeType: doc.documentMimeType,
      documentSize: doc.documentSize,
      rejectionReason: doc.rejectionReason,
      createdAt: doc.createdAt.toISOString(),
      reviewedAt: doc.reviewedAt?.toISOString() || null,
    };
  }
}

export const verificationService = new VerificationService();
