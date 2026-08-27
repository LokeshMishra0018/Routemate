import { z } from 'zod';
import { paginationQuerySchema } from '../../plugins/validation.js';

export const createReviewSchema = z.object({
  reviewedUserId: z.string().min(1, 'Reviewed user ID is required'),
  tripId: z.string().min(1, 'Trip ID is required'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  cleanlinessRating: z.number().int().min(1).max(5).optional(),
  punctualityRating: z.number().int().min(1).max(5).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

export const listReviewsQuerySchema = paginationQuerySchema;
