import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { reviewsService } from './reviews.service.js';
import { createReviewSchema, listReviewsQuerySchema } from './reviews.schemas.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../plugins/validation.js';
import { createSuccessResponse, createPaginatedResponse } from '../../utils/response.js';

export const reviewsRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // Public GET /api/v1/reviews/user/:userId - List reviews for a user
  app.get(
    '/user/:userId',
    {
      preValidation: [validateRequest({ query: listReviewsQuerySchema })],
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const query = request.query as { page?: number; pageSize?: number };
      const result = await reviewsService.getUserReviews(userId, query.page || 1, query.pageSize || 20);

      return reply.status(200).send({
        success: true,
        data: result.items,
        summary: result.summary,
        pagination: result.pagination,
      });
    }
  );

  // Public GET /api/v1/reviews/trip/:tripId - List reviews for a trip
  app.get(
    '/trip/:tripId',
    {
      preValidation: [validateRequest({ query: listReviewsQuerySchema })],
    },
    async (request, reply) => {
      const { tripId } = request.params as { tripId: string };
      const query = request.query as { page?: number; pageSize?: number };
      const result = await reviewsService.getTripReviews(tripId, query.page || 1, query.pageSize || 20);
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // Protected POST /api/v1/reviews - Submit a review
  app.post(
    '/',
    {
      preHandler: [authenticate],
      preValidation: [validateRequest({ body: createReviewSchema })],
    },
    async (request, reply) => {
      const body = request.body as {
        reviewedUserId: string;
        tripId: string;
        rating: number;
        cleanlinessRating?: number;
        punctualityRating?: number;
        communicationRating?: number;
        comment?: string;
        tags?: string[];
      };

      const result = await reviewsService.submitReview({
        reviewerId: request.user!.id,
        ...body,
      });

      return reply.status(201).send(createSuccessResponse(result));
    }
  );
};
