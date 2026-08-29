import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).trim().optional(),
  branch: z.string().max(100).trim().nullable().optional(),
  rollNumber: z.string().max(50).trim().nullable().optional(),
  studentId: z.string().max(50).trim().nullable().optional(),
  academicYear: z.number().int().min(1).max(6).nullable().optional(),
  gender: z.enum(['male', 'female']).nullable().optional(),
  bio: z.string().max(500).trim().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  phoneNumber: z.string().max(20).trim().nullable().optional(),
});
