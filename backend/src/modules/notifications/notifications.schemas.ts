import { z } from 'zod';
import { paginationQuerySchema } from '../../plugins/validation.js';

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === 'true')
    .pipe(z.boolean().optional()),
});
