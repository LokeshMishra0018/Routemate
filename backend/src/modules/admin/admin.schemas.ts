import { z } from 'zod';

export const reviewVerificationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(255).optional(),
});

export const suspendUserSchema = z.object({
  reason: z.string().min(3).max(255),
});

export const reviewReportSchema = z.object({
  status: z.enum(['under_review', 'resolved', 'dismissed']),
  resolutionNotes: z.string().max(1000).optional(),
  actionUser: z.enum(['none', 'suspend']).optional().default('none'),
});

export const resolveSosSchema = z.object({
  status: z.enum(['resolved', 'false_alarm']),
  resolutionNotes: z.string().max(1000).optional(),
});
