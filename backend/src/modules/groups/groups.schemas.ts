import { z } from 'zod';
import { paginationQuerySchema } from '../../plugins/validation.js';

export const createGroupSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters').max(100),
  description: z.string().max(500).optional().nullable(),
  tripId: z.string().optional().nullable(),
  maxCapacity: z.number().int().min(2, 'Capacity must be at least 2').max(10, 'Capacity cannot exceed 10').default(4),
  costSharing: z
    .object({
      enabled: z.boolean().default(false),
      estimatedTotalCost: z.number().min(0).default(0),
      currency: z.string().default('INR'),
    })
    .optional()
    .default({ enabled: false, estimatedTotalCost: 0, currency: 'INR' }),
});

export const updateGroupSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  maxCapacity: z.number().int().min(2).max(10).optional(),
  status: z.enum(['open', 'closed', 'completed']).optional(),
  costSharing: z
    .object({
      enabled: z.boolean().optional(),
      estimatedTotalCost: z.number().min(0).optional(),
      currency: z.string().optional(),
    })
    .optional(),
});

export const listGroupsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(['open', 'closed', 'completed']).optional(),
  tripId: z.string().optional(),
});
