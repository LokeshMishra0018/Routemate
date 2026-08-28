import { ObjectId } from 'mongodb';

export type UserRole = 'student' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deactivated';
export type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';
export type VerificationTier = 'unverified' | 'partially_verified' | 'fully_verified';

export function computeVerificationTier(
  emailVerified: boolean | Date | null | undefined,
  verificationStatus: VerificationStatus | string | null | undefined
): VerificationTier {
  const isEmailVerified = Boolean(emailVerified);
  if (!isEmailVerified) {
    return 'unverified';
  }
  if (verificationStatus === 'approved') {
    return 'fully_verified';
  }
  return 'partially_verified';
}

export interface UserDocument {
  _id: ObjectId;
  email: string;
  emailNormalized: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  emailVerificationTokenHash: string | null;
  emailVerificationExpiresAt: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileDocument {
  _id: ObjectId;
  userId: string; // references users._id as string
  fullName: string;
  collegeId: string; // references colleges._id
  academicYear: number | null;
  gender: string | null;
  bio: string | null;
  avatarUrl: string | null;
  verificationStatus: VerificationStatus;
  trustScore: number;
  averageRating: number;
  completedTripCount: number;
  connectionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDocument {
  _id: ObjectId;
  userId: string;
  refreshTokenHash: string;
  deviceInfo?: string;
  ipMetadata?: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface UserProfileDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  profile: {
    fullName: string;
    collegeId: string;
    collegeName?: string;
    collegeDomain?: string;
    academicYear: number | null;
    gender: string | null;
    bio: string | null;
    avatarUrl: string | null;
    verificationStatus: VerificationStatus;
    verificationTier: VerificationTier;
    trustScore: number;
    averageRating: number;
    completedTripCount: number;
    connectionCount: number;
    createdAt: string;
  };
}

export interface PublicProfileDto {
  id: string;
  fullName: string;
  collegeId: string;
  collegeName?: string;
  academicYear: number | null;
  gender: string | null;
  bio: string | null;
  avatarUrl: string | null;
  verificationStatus: VerificationStatus;
  verificationTier: VerificationTier;
  trustScore: number;
  averageRating: number;
  completedTripCount: number;
  connectionCount: number;
}
