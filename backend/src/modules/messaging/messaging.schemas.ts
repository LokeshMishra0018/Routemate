import { z } from 'zod';
import { paginationQuerySchema } from '../../plugins/validation.js';

export const sendMessageSchema = z.object({
  body: z.string().min(1, 'Message body cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  messageType: z.enum(['text', 'system']).optional().default('text'),
});

export const listMessagesQuerySchema = paginationQuerySchema.extend({
  cursor: z.string().optional(),
});
