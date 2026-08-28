import { z } from 'zod';
import { paginationQuerySchema } from '../../plugins/validation.js';

export const sendMessageSchema = z
  .object({
    body: z.string().max(2000, 'Message cannot exceed 2000 characters').optional(),
    content: z.string().max(2000, 'Message cannot exceed 2000 characters').optional(),
    messageType: z.enum(['text', 'system']).optional().default('text'),
  })
  .refine((data) => !!(data.body?.trim() || data.content?.trim()), {
    message: 'Message body cannot be empty',
  });

export const listMessagesQuerySchema = paginationQuerySchema.extend({
  cursor: z.string().optional(),
});
