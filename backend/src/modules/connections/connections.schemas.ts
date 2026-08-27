import { z } from 'zod';
import { paginationQuerySchema } from '../../plugins/validation.js';

export const createConnectionSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  tripId: z.string().min(1, 'Trip ID is required'),
  candidateTripId: z.string().optional().nullable(),
  message: z.string().max(500, 'Message cannot exceed 500 characters').optional().nullable(),
});

export const updateConnectionStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'cancelled']),
});

export const listConnectionsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled', 'blocked']).optional(),
  type: z.enum(['incoming', 'outgoing', 'all']).optional().default('all'),
});
