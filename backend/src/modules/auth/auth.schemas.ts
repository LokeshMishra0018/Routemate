import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters')
    .trim(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z
  .object({
    token: z.string().optional(),
    otp: z.string().optional(),
    email: z
      .string()
      .email('Invalid email address')
      .optional()
      .transform((val) => (val ? val.toLowerCase().trim() : undefined)),
  })
  .refine((data) => Boolean(data.token || data.otp), {
    message: 'Either a 6-digit OTP or verification token is required',
  });

export const resendOtpSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim()),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim()),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().optional(),
    otp: z.string().optional(),
    email: z
      .string()
      .email('Invalid email address')
      .optional()
      .transform((val) => (val ? val.toLowerCase().trim() : undefined)),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  })
  .refine((data) => Boolean(data.token || data.otp), {
    message: 'Either a 6-digit OTP or reset token is required',
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

export const adminProvisionSchema = z
  .object({
    adminPassword: z.string().optional(),
    adminPasscode: z.string().optional(),
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters')
      .trim(),
    email: z
      .string()
      .email('Invalid email address')
      .max(255)
      .transform((val) => val.toLowerCase().trim()),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  })
  .transform((data) => ({
    ...data,
    adminPassword: (data.adminPassword || data.adminPasscode || '').trim(),
  }))
  .refine((data) => data.adminPassword.length > 0, {
    message: 'Admin security password is required',
    path: ['adminPassword'],
  });

export type AdminProvisionDto = z.infer<typeof adminProvisionSchema>;
