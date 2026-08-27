import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).trim().optional(),
  academicYear: z.number().int().min(1).max(6).nullable().optional(),
  gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']).nullable().optional(),
  bio: z.string().max(500).trim().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});
