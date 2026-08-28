import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { matchingService } from './matching.service.js';
import { matchesQuerySchema } from './matching.schemas.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../plugins/validation.js';
import { createSuccessResponse, createPaginatedResponse } from '../../utils/response.js';

export const matchingRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // All match endpoints require authentication
  app.addHook('preHandler', authenticate);

  // GET /api/v1/matches - List matches (for a specific trip or across all user trips)
  app.get(
    '/',
    {
      preValidation: [validateRequest({ query: matchesQuerySchema })],
    },
    async (request, reply) => {
      const query = request.query as { tripId?: string; page?: number; pageSize?: number };
      const page = query.page || 1;
      const pageSize = query.pageSize || 20;

      if (query.tripId) {
        const result = await matchingService.getMatchesForTrip(request.user!.id, query.tripId, page, pageSize);
        return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
      }

      const result = await matchingService.getMatchesForUser(request.user!.id, page, pageSize);
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // GET /trips/:tripId/matches & /:tripId/matches - Fetch matches for trip
  app.get('/trips/:tripId/matches', async (request, reply) => {
    const { tripId } = request.params as { tripId: string };
    const result = await matchingService.getMatchesForTrip(request.user!.id, tripId);
    return reply.status(200).send(createSuccessResponse(result.items));
  });

  app.get('/:tripId/matches', async (request, reply) => {
    const { tripId } = request.params as { tripId: string };
    const result = await matchingService.getMatchesForTrip(request.user!.id, tripId);
    return reply.status(200).send(createSuccessResponse(result.items));
  });

  // POST /api/v1/matches/generate/:tripId - Trigger on-demand match generation
  app.post('/generate/:tripId', async (request, reply) => {
    const { tripId } = request.params as { tripId: string };
    const result = await matchingService.generateMatchesForTrip(tripId);
    return reply.status(200).send(createSuccessResponse(result));
  });

  // GET /api/v1/matches/:id - Get single match details
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await matchingService.getMatchById(request.user!.id, id);
    return reply.status(200).send(createSuccessResponse(result));
  });

  // POST /api/v1/matches/:id/dismiss - Dismiss match
  app.post('/:id/dismiss', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await matchingService.dismissMatch(request.user!.id, id);
    return reply.status(200).send(createSuccessResponse(result));
  });
};
