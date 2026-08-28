import { usersRepository } from './users.repository.js';
import { collegesService } from '../colleges/colleges.service.js';
import { NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { UserProfileDto, PublicProfileDto } from './users.types.js';

export class UsersService {
  /**
   * Get authenticated user's full private profile
   */
  async getCurrentUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await usersRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    const profile = await usersRepository.findProfileByUserId(userId);
    let collegeName = undefined;
    let collegeDomain = undefined;

    if (profile?.collegeId) {
      try {
        const college = await collegesService.getCollegeById(profile.collegeId);
        collegeName = college.name;
        collegeDomain = college.domain;
      } catch {
        // ignore if college lookup fails
      }
    }

    const verificationStatus = profile?.verificationStatus || 'unverified';
    const emailVerified = user.emailVerifiedAt !== null;
    const { computeVerificationTier } = await import('./users.types.js');
    const verificationTier = computeVerificationTier(emailVerified, verificationStatus);

    return {
      id: user._id.toHexString(),
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified,
      profile: {
        fullName: profile?.fullName || '',
        collegeId: profile?.collegeId || '',
        collegeName,
        collegeDomain,
        academicYear: profile?.academicYear || null,
        gender: profile?.gender || null,
        bio: profile?.bio || null,
        avatarUrl: profile?.avatarUrl || null,
        verificationStatus,
        verificationTier,
        trustScore: profile?.trustScore || 50,
        averageRating: profile?.averageRating || 5.0,
        completedTripCount: profile?.completedTripCount || 0,
        connectionCount: profile?.connectionCount || 0,
        createdAt: profile?.createdAt?.toISOString() || user.createdAt.toISOString(),
      },
    };
  }

  /**
   * Update current user's profile information
   * Strictly disallows altering role, verificationStatus, or trustScore.
   */
  async updateCurrentUserProfile(
    userId: string,
    data: {
      fullName?: string;
      academicYear?: number | null;
      gender?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
    }
  ): Promise<UserProfileDto> {
    const profile = await usersRepository.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const updates: Record<string, unknown> = {};
    if (data.fullName !== undefined) updates.fullName = data.fullName.trim();
    if (data.academicYear !== undefined) updates.academicYear = data.academicYear;
    if (data.gender !== undefined) updates.gender = data.gender;
    if (data.bio !== undefined) updates.bio = data.bio?.trim() ?? null;
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;

    if (Object.keys(updates).length > 0) {
      await usersRepository.updateProfile(userId, updates);
    }

    return this.getCurrentUserProfile(userId);
  }

  /**
   * Get public profile projection for discovery & companions
   */
  async getPublicProfile(userId: string): Promise<PublicProfileDto> {
    const user = await usersRepository.findUserById(userId);
    if (!user || user.status !== 'active') {
      throw new NotFoundError('User not found');
    }

    const profile = await usersRepository.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    let collegeName = undefined;
    if (profile.collegeId) {
      try {
        const college = await collegesService.getCollegeById(profile.collegeId);
        collegeName = college.name;
      } catch {
        // ignore
      }
    }

    const { computeVerificationTier } = await import('./users.types.js');
    const verificationTier = computeVerificationTier(user.emailVerifiedAt !== null, profile.verificationStatus);

    return {
      id: user._id.toHexString(),
      fullName: profile.fullName,
      collegeId: profile.collegeId,
      collegeName,
      academicYear: profile.academicYear,
      gender: profile.gender,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      verificationStatus: profile.verificationStatus,
      verificationTier,
      trustScore: profile.trustScore,
      averageRating: profile.averageRating,
      completedTripCount: profile.completedTripCount,
      connectionCount: profile.connectionCount,
    };
  }
}

export const usersService = new UsersService();
