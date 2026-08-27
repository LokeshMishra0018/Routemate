import { z } from 'zod';
import { paginationQuerySchema } from '../../plugins/validation.js';

export const matchesQuerySchema = paginationQuerySchema.extend({
  tripId: z.string().optional(),
});
