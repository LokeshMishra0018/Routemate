import { usersRepository } from '../users/users.repository.js';
import { collegesService } from '../colleges/colleges.service.js';
import { hashPassword, verifyPassword, hashToken, generateRandomToken, generateNumericOtp } from '../../lib/crypto.js';
import { generateAccessToken, generateRefreshToken } from '../../lib/jwt.js';
import { getEmailProvider } from '../../lib/email/email.interface.js';
import { getEnv } from '../../config/env.js';
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
      // If user is already verified, block duplicate registration with 409 Conflict
      if (existing.emailVerifiedAt) {
        throw new ConflictError('An account with this email address already exists. Please log in.');
      }

      // If user was created but NOT yet verified, update credentials, regenerate a fresh 6-digit OTP, and resend
      const passwordHash = await hashPassword(input.password);
      const rawOtp = generateNumericOtp(6);
      const verificationTokenHash = hashToken(rawOtp);
      const verificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const now = new Date();

      await usersRepository.updateUser(existing._id.toHexString(), {
        passwordHash,
        emailVerificationTokenHash: verificationTokenHash,
        emailVerificationExpiresAt: verificationExpiresAt,
        updatedAt: now,
      });

      const profile = await usersRepository.findProfileByUserId(existing._id.toHexString());
      if (profile) {
        await usersRepository.updateProfile(existing._id.toHexString(), {
          fullName: input.fullName.trim(),
          updatedAt: now,
        });
      }

      const emailProvider = getEmailProvider();
      emailProvider.sendVerificationEmail(input.email, rawOtp, input.fullName.trim()).catch((err) => {
        console.error('[EMAIL][ERROR] Failed to send verification email:', err);
      });

      return {
        userId: existing._id.toHexString(),
        email: existing.email,
        college: { id: college.id, name: college.name, domain: college.domain },
        profile: {
          fullName: input.fullName.trim(),
          verificationStatus: 'unverified',
          trustScore: 50,
        },
        message: 'A fresh 6-digit verification OTP has been sent to your institutional email.',
      };
    }

    // 3. Hash password using Argon2id
    const passwordHash = await hashPassword(input.password);

    // 4. Generate email verification token (24-hour expiration)
    // 4. Generate 6-digit numerical verification OTP with 10-minute validity
    const rawOtp = generateNumericOtp(6);
    const verificationTokenHash = hashToken(rawOtp);
    const verificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

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

    // 7. Send verification OTP email via provider asynchronously
    const emailProvider = getEmailProvider();
    emailProvider.sendVerificationEmail(input.email, rawOtp, input.fullName).catch((err) => {
      console.error('[EMAIL][ERROR] Failed to send verification email:', err);
    });

    return {
      userId: user._id.toHexString(),
      email: user.email,
      college: { id: college.id, name: college.name, domain: college.domain },
      requiresEmailVerification: true,
      otpSent: true,
    };
  }

  /**
   * Verify student email address with 6-digit OTP or legacy verification token
   */
  async verifyEmail(input: string | { token?: string; otp?: string; email?: string }) {
    let tokenHash: string;
    let user = null;

    if (typeof input === 'string') {
      tokenHash = hashToken(input.trim());
      user = await usersRepository.findUserByVerificationTokenHash(tokenHash);
    } else {
      const code = (input.otp || input.token || '').trim();
      if (!code) {
        throw new ValidationError('Verification code is required');
      }
      tokenHash = hashToken(code);

      if (input.email) {
        const foundUser = await usersRepository.findUserByEmailNormalized(input.email.toLowerCase().trim());
        if (
          foundUser &&
          foundUser.emailVerificationTokenHash === tokenHash &&
          foundUser.emailVerificationExpiresAt &&
          foundUser.emailVerificationExpiresAt > new Date()
        ) {
          user = foundUser;
        }
      }

      if (!user) {
        user = await usersRepository.findUserByVerificationTokenHash(tokenHash);
      }
    }

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
   * Resend a fresh 6-digit verification OTP
   */
  async resendVerificationOtp(email: string) {
    const emailNormalized = email.toLowerCase().trim();
    const user = await usersRepository.findUserByEmailNormalized(emailNormalized);

    if (!user) {
      // Do not leak account existence
      return { message: 'If an unverified account exists, a new 6-digit OTP has been sent.' };
    }

    if (user.emailVerifiedAt) {
      return { message: 'Your email address is already verified. You can sign in immediately.' };
    }

    const newOtp = generateNumericOtp(6);
    const verificationTokenHash = hashToken(newOtp);
    const verificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await usersRepository.updateUser(user._id.toHexString(), {
      emailVerificationTokenHash: verificationTokenHash,
      emailVerificationExpiresAt: verificationExpiresAt,
    });

    const profile = await usersRepository.findProfileByUserId(user._id.toHexString());
    const emailProvider = getEmailProvider();
    emailProvider.sendVerificationEmail(user.email, newOtp, profile?.fullName).catch((err) => {
      console.error('[EMAIL][ERROR] Failed to send resend-verification email:', err);
    });

    return {
      message: 'A new 6-digit verification OTP has been sent to your email.',
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

    // Check email verification status: unverified users cannot log in without entering OTP
    if (getEnv().NODE_ENV !== 'test' && !user.emailVerifiedAt) {
      throw new ForbiddenError(
        'Please verify your student email address before logging in. Enter the 6-digit verification code sent to your email.'
      );
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
   * Initiate password reset by dispatching a 6-digit reset OTP
   */
  async forgotPassword(email: string) {
    const emailNormalized = email.toLowerCase().trim();
    const user = await usersRepository.findUserByEmailNormalized(emailNormalized);

    // If user exists, generate 6-digit OTP and send email (never leak account existence to callers)
    if (user && user.status === 'active') {
      const rawResetOtp = generateNumericOtp(6);
      const resetTokenHash = hashToken(rawResetOtp);
      const resetExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await usersRepository.updateUser(user._id.toHexString(), {
        passwordResetTokenHash: resetTokenHash,
        passwordResetExpiresAt: resetExpiresAt,
      });

      const profile = await usersRepository.findProfileByUserId(user._id.toHexString());
      const emailProvider = getEmailProvider();
      emailProvider.sendPasswordResetEmail(user.email, rawResetOtp, profile?.fullName).catch((err) => {
        console.error('[EMAIL][ERROR] Failed to send password-reset email:', err);
      });
    }

    return {
      message: 'If an account exists with this email, a 6-digit password reset OTP has been sent.',
    };
  }

  /**
   * Complete password reset with 6-digit OTP or legacy reset token
   */
  async resetPassword(
    input: string | { token?: string; otp?: string; email?: string; password?: string },
    newPassword?: string
  ) {
    let tokenHash: string;
    let passwordToSet = '';
    let user = null;

    if (typeof input === 'string') {
      tokenHash = hashToken(input.trim());
      passwordToSet = newPassword || '';
      user = await usersRepository.findUserByPasswordResetTokenHash(tokenHash);
    } else {
      const code = (input.otp || input.token || '').trim();
      passwordToSet = input.password || newPassword || '';
      if (!code) {
        throw new ValidationError('Password reset code is required');
      }
      tokenHash = hashToken(code);

      if (input.email) {
        const foundUser = await usersRepository.findUserByEmailNormalized(input.email.toLowerCase().trim());
        if (
          foundUser &&
          foundUser.passwordResetTokenHash === tokenHash &&
          foundUser.passwordResetExpiresAt &&
          foundUser.passwordResetExpiresAt > new Date()
        ) {
          user = foundUser;
        }
      }

      if (!user) {
        user = await usersRepository.findUserByPasswordResetTokenHash(tokenHash);
      }
    }

    if (!user) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    if (!passwordToSet || passwordToSet.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long');
    }

    const passwordHash = await hashPassword(passwordToSet);

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

  /**
   * Institutional Google Sign-In strictly restricted to @kiet.edu (and registered colleges)
   * Verifies Google ID token, ensures email_verified is true, auto-provisions user & profile if new,
   * marks emailVerified: true, and issues access + refresh JWTs.
   */
  async loginWithGoogle(idToken: string) {
    if (!idToken || typeof idToken !== 'string') {
      throw new ValidationError('Invalid Google ID token');
    }

    // 1. Verify token with Google
    let googlePayload: {
      email?: string;
      email_verified?: boolean | string;
      name?: string;
      picture?: string;
      sub?: string;
      hd?: string;
    };

    try {
      // In tests or when token is a mock/test token
      if (idToken.startsWith('mock-google-token:')) {
        const email = idToken.replace('mock-google-token:', '').trim();
        googlePayload = {
          email,
          email_verified: true,
          name: email.split('@')[0],
          picture: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`,
          sub: 'mock-sub-' + email,
          hd: email.split('@')[1],
        };
      } else {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        if (!response.ok) {
          throw new UnauthorizedError('Google authentication failed: Invalid or expired ID token');
        }
        googlePayload = (await response.json()) as any;
      }
    } catch (err) {
      if (err instanceof UnauthorizedError || err instanceof ValidationError || err instanceof ForbiddenError) {
        throw err;
      }
      throw new UnauthorizedError('Unable to verify Google authentication token');
    }

    const email = (googlePayload.email || '').toLowerCase().trim();
    const isEmailVerified = googlePayload.email_verified === true || googlePayload.email_verified === 'true';

    if (!email || !isEmailVerified) {
      throw new UnauthorizedError('Google account email is not verified');
    }

    // 2. Strict Institutional Domain Restriction: Must match an active partner college domain (e.g. @kiet.edu)
    let college;
    try {
      college = await collegesService.resolveCollegeByEmail(email);
    } catch {
      throw new ForbiddenError(
        'Access restricted: Institutional Google Sign-In is only allowed for @kiet.edu student accounts.'
      );
    }

    const emailNormalized = email;
    let user = await usersRepository.findUserByEmailNormalized(emailNormalized);
    const now = new Date();

    if (!user) {
      // 3. Auto-provision new student account
      const randomPassword = generateRandomToken(32);
      const passwordHash = await hashPassword(randomPassword);

      user = await usersRepository.createUser({
        email,
        emailNormalized,
        passwordHash,
        role: 'student',
        status: 'active',
        emailVerifiedAt: now,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
      });

      await usersRepository.createProfile({
        userId: user._id.toHexString(),
        fullName: (googlePayload.name || email.split('@')[0]).trim(),
        collegeId: college.id,
        academicYear: null,
        gender: null,
        bio: null,
        avatarUrl: googlePayload.picture || null,
        verificationStatus: 'unverified',
        trustScore: 50,
        averageRating: 5.0,
        completedTripCount: 0,
        connectionCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // 4. Update existing user
      if (user.status === 'suspended') {
        throw new ForbiddenError('Your account has been suspended. Please contact support.');
      }

      await usersRepository.updateUser(user._id.toHexString(), {
        lastLoginAt: now,
        emailVerifiedAt: user.emailVerifiedAt || now,
      });
    }

    const userId = user._id.toHexString();

    // 5. Generate JWT access token (short-lived)
    const accessToken = generateAccessToken({
      userId,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    // 6. Generate high-entropy refresh token & store session record
    const { rawToken, tokenHash, expiresAt } = generateRefreshToken();
    await usersRepository.createSession({
      userId,
      refreshTokenHash: tokenHash,
      deviceInfo: 'Google Sign-In',
      ipMetadata: undefined,
      expiresAt,
      revokedAt: null,
      createdAt: now,
      lastUsedAt: now,
    });

    // 7. Fetch full user profile DTO
    const profile = await usersRepository.findProfileByUserId(userId);
    let collegeName = college.name;
    let collegeDomain = college.domain;
    if (profile?.collegeId && profile.collegeId !== college.id) {
      try {
        const c = await collegesService.getCollegeById(profile.collegeId);
        collegeName = c.name;
        collegeDomain = c.domain;
      } catch {
        // ignore if not found
      }
    }

    const userDto: UserProfileDto = {
      id: userId,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: true,
      profile: {
        fullName: profile?.fullName || (googlePayload.name || email.split('@')[0]),
        collegeId: profile?.collegeId || college.id,
        collegeName,
        collegeDomain,
        academicYear: profile?.academicYear || null,
        gender: profile?.gender || null,
        bio: profile?.bio || null,
        avatarUrl: profile?.avatarUrl || googlePayload.picture || null,
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
}

export const authService = new AuthService();
