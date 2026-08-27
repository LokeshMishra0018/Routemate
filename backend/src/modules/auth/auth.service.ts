import { usersRepository } from '../users/users.repository.js';
import { collegesService } from '../colleges/colleges.service.js';
import { hashPassword, verifyPassword, hashToken, generateRandomToken } from '../../lib/crypto.js';
import { generateAccessToken, generateRefreshToken } from '../../lib/jwt.js';
import { getEmailProvider } from '../../lib/email/email.interface.js';
import { ConflictError, UnauthorizedError, ValidationError, ForbiddenError } from '../../utils/errors.js';
import { UserProfileDto } from '../users/users.types.js';

export class AuthService {
  /**
   * Register a new student user
   * Validates institutional email domain, hashes password, creates user + profile, and sends verification email.
   */
  async register(input: { email: string; password: string; fullName: string }) {
    const emailNormalized = input.email.toLowerCase().trim();

    // 1. Validate institutional domain matches an active college
    const college = await collegesService.resolveCollegeByEmail(emailNormalized);

    // 2. Check if user already exists
    const existing = await usersRepository.findUserByEmailNormalized(emailNormalized);
    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    // 3. Hash password using Argon2id
    const passwordHash = await hashPassword(input.password);

    // 4. Generate email verification token (24-hour expiration)
    const rawVerificationToken = generateRandomToken(32);
    const verificationTokenHash = hashToken(rawVerificationToken);
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const now = new Date();

    // 5. Create user document
    const user = await usersRepository.createUser({
      email: input.email,
      emailNormalized,
      passwordHash,
      role: 'student',
      status: 'active',
      emailVerifiedAt: null,
      emailVerificationTokenHash: verificationTokenHash,
      emailVerificationExpiresAt: verificationExpiresAt,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // 6. Create associated profile document
    await usersRepository.createProfile({
      userId: user._id.toHexString(),
      fullName: input.fullName.trim(),
      collegeId: college.id,
      academicYear: null,
      gender: null,
      bio: null,
      avatarUrl: null,
      verificationStatus: 'unverified',
      trustScore: 50,
      averageRating: 5.0,
      completedTripCount: 0,
      connectionCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // 7. Send verification email via provider
    const emailProvider = getEmailProvider();
    await emailProvider.sendVerificationEmail(input.email, rawVerificationToken, input.fullName);

    return {
      userId: user._id.toHexString(),
      email: user.email,
      college: { id: college.id, name: college.name, domain: college.domain },
      requiresEmailVerification: true,
    };
  }

  /**
   * Verify student email address with verification token
   */
  async verifyEmail(token: string) {
    const tokenHash = hashToken(token.trim());
    const user = await usersRepository.findUserByVerificationTokenHash(tokenHash);

    if (!user) {
      throw new ValidationError('Invalid or expired email verification token');
    }

    await usersRepository.updateUser(user._id.toHexString(), {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    });

    return {
      message: 'Email address verified successfully. You may now log in.',
    };
  }

  /**
   * Log in user with credentials and create server-side session
   */
  async login(input: { email: string; password: string; deviceInfo?: string; ipMetadata?: string }) {
    const emailNormalized = input.email.toLowerCase().trim();
    const user = await usersRepository.findUserByEmailNormalized(emailNormalized);

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password with Argon2id
    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check account status
    if (user.status === 'suspended') {
      throw new ForbiddenError('Account is suspended. Please contact support.');
    }
    if (user.status === 'deactivated') {
      throw new ForbiddenError('Account is deactivated.');
    }

    const userId = user._id.toHexString();

    // Generate JWT access token (short-lived)
    const accessToken = generateAccessToken({
      userId,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    // Generate high-entropy refresh token & store session record
    const { rawToken, tokenHash, expiresAt } = generateRefreshToken();
    const now = new Date();

    await usersRepository.createSession({
      userId,
      refreshTokenHash: tokenHash,
      deviceInfo: input.deviceInfo,
      ipMetadata: input.ipMetadata,
      expiresAt,
      revokedAt: null,
      createdAt: now,
      lastUsedAt: now,
    });

    // Update lastLoginAt
    await usersRepository.updateUser(userId, { lastLoginAt: now });

    // Fetch profile and college
    const profile = await usersRepository.findProfileByUserId(userId);
    let collegeName = undefined;
    let collegeDomain = undefined;
    if (profile?.collegeId) {
      try {
        const college = await collegesService.getCollegeById(profile.collegeId);
        collegeName = college.name;
        collegeDomain = college.domain;
      } catch {
        // ignore if not found
      }
    }

    const userDto: UserProfileDto = {
      id: userId,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerifiedAt !== null,
      profile: {
        fullName: profile?.fullName || '',
        collegeId: profile?.collegeId || '',
        collegeName,
        collegeDomain,
        academicYear: profile?.academicYear || null,
        gender: profile?.gender || null,
        bio: profile?.bio || null,
        avatarUrl: profile?.avatarUrl || null,
        verificationStatus: profile?.verificationStatus || 'unverified',
        trustScore: profile?.trustScore || 50,
        averageRating: profile?.averageRating || 5.0,
        completedTripCount: profile?.completedTripCount || 0,
        connectionCount: profile?.connectionCount || 0,
        createdAt: profile?.createdAt?.toISOString() || now.toISOString(),
      },
    };

    return {
      accessToken,
      refreshToken: rawToken,
      user: userDto,
    };
  }

  /**
   * Refresh session with rotation and reuse prevention
   */
  async refresh(refreshToken: string, meta?: { deviceInfo?: string; ipMetadata?: string }) {
    const rawToken = refreshToken.trim();
    const tokenHash = hashToken(rawToken);

    const session = await usersRepository.findActiveSessionByTokenHash(tokenHash);
    if (!session) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // 1. Immediately revoke the consumed refresh token (token rotation)
    await usersRepository.revokeSession(session._id);

    // 2. Fetch user to verify account is still active
    const user = await usersRepository.findUserById(session.userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('User account is invalid or no longer active');
    }

    // 3. Issue new access token
    const newAccessToken = generateAccessToken({
      userId: user._id.toHexString(),
      email: user.email,
      role: user.role,
      status: user.status,
    });

    // 4. Issue new refresh token & create new session record
    const { rawToken: newRawRefreshToken, tokenHash: newTokenHash, expiresAt } = generateRefreshToken();
    const now = new Date();

    await usersRepository.createSession({
      userId: user._id.toHexString(),
      refreshTokenHash: newTokenHash,
      deviceInfo: meta?.deviceInfo || session.deviceInfo,
      ipMetadata: meta?.ipMetadata || session.ipMetadata,
      expiresAt,
      revokedAt: null,
      createdAt: now,
      lastUsedAt: now,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  /**
   * Log out session by revoking the refresh token
   */
  async logout(refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken.trim());
      const session = await usersRepository.findActiveSessionByTokenHash(tokenHash);
      if (session) {
        await usersRepository.revokeSession(session._id);
      }
    }
    return { message: 'Logged out successfully' };
  }

  /**
   * Initiate password reset
   */
  async forgotPassword(email: string) {
    const emailNormalized = email.toLowerCase().trim();
    const user = await usersRepository.findUserByEmailNormalized(emailNormalized);

    // If user exists, generate token and send email (never leak account existence to callers)
    if (user && user.status === 'active') {
      const rawResetToken = generateRandomToken(32);
      const resetTokenHash = hashToken(rawResetToken);
      const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await usersRepository.updateUser(user._id.toHexString(), {
        passwordResetTokenHash: resetTokenHash,
        passwordResetExpiresAt: resetExpiresAt,
      });

      const profile = await usersRepository.findProfileByUserId(user._id.toHexString());
      const emailProvider = getEmailProvider();
      await emailProvider.sendPasswordResetEmail(user.email, rawResetToken, profile?.fullName);
    }

    return {
      message: 'If an account exists with this email, password reset instructions have been sent.',
    };
  }

  /**
   * Complete password reset
   */
  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token.trim());
    const user = await usersRepository.findUserByPasswordResetTokenHash(tokenHash);

    if (!user) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await usersRepository.updateUser(user._id.toHexString(), {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });

    // Revoke all existing active sessions for security
    await usersRepository.revokeAllUserSessions(user._id.toHexString());

    return {
      message: 'Password reset successfully. Please log in with your new password.',
    };
  }
}

export const authService = new AuthService();
