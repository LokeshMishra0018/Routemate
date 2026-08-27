import { z } from 'zod';

export const reviewVerificationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(255).optional(),
});

export const suspendUserSchema = z.object({
  reason: z.string().min(3).max(255),
});
