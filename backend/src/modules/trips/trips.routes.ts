import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { tripsService } from './trips.service.js';
import {
  createTripSchema,
  updateTripSchema,
  updateTripStatusSchema,
  searchTripsQuerySchema,
  createRecurringTripSchema,
} from './trips.schemas.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest, paginationQuerySchema } from '../../plugins/validation.js';
import { createSuccessResponse, createPaginatedResponse } from '../../utils/response.js';
import { TransportType, TripStatus, GenderPreference } from './trips.types.js';

export const tripsRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // All trip endpoints require authentication
  app.addHook('preHandler', authenticate);

  // POST /api/v1/trips - Create new trip
  app.post(
    '/',
    {
      preValidation: [validateRequest({ body: createTripSchema })],
    },
    async (request, reply) => {
      const result = await tripsService.createTrip(
        request.user!.id,
        request.body as Parameters<typeof tripsService.createTrip>[1]
      );
      return reply.status(201).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/trips - Search and list trips
  app.get(
    '/',
    {
      preValidation: [validateRequest({ query: searchTripsQuerySchema })],
    },
    async (request, reply) => {
      const query = request.query as {
        q?: string;
        source?: string;
        destination?: string;
        travelDate?: string;
        date?: string;
        startDate?: string;
        endDate?: string;
        transportType?: TransportType;
        status?: TripStatus;
        genderPreference?: GenderPreference;
        excludeMe?: boolean;
        includeMyTrips?: boolean;
        includeMine?: boolean;
        lat?: number;
        lng?: number;
        radiusKm?: number;
        page?: number;
        pageSize?: number;
      };

      const isIncludingMine =
        query.includeMyTrips === true ||
        query.includeMine === true ||
        query.excludeMe === false ||
        String(query.includeMyTrips) === 'true' ||
        String(query.includeMine) === 'true' ||
        String(query.excludeMe) === 'false';

      const filters = {
        q: query.q,
        sourceName: query.source,
        destinationName: query.destination,
        travelDate: query.travelDate || query.date,
        startDate: query.startDate,
        endDate: query.endDate,
        transportType: query.transportType,
        status: query.status,
        genderPreference: query.genderPreference,
        sourceNear:
          query.lat !== undefined && query.lng !== undefined
            ? {
                latitude: query.lat,
                longitude: query.lng,
                maxDistanceMeters: (query.radiusKm || 50) * 1000,
              }
            : undefined,
        excludeUserId: isIncludingMine ? undefined : request.user!.id,
        page: query.page || 1,
        pageSize: query.pageSize || 20,
      };

      const result = await tripsService.searchTrips(filters);
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // GET /api/v1/trips/me - Get current user's trips
  app.get(
    '/me',
    {
      preValidation: [validateRequest({ query: paginationQuerySchema })],
    },
    async (request, reply) => {
      const query = request.query as { page?: number; pageSize?: number };
      const result = await tripsService.getUserTrips(request.user!.id, query.page || 1, query.pageSize || 20);
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // POST /api/v1/trips/recurring - Create recurring trip schedule
  app.post(
    '/recurring',
    {
      preValidation: [validateRequest({ body: createRecurringTripSchema })],
    },
    async (request, reply) => {
      const result = await tripsService.createRecurringTrip(
        request.user!.id,
        request.body as Parameters<typeof tripsService.createRecurringTrip>[1]
      );
      return reply.status(201).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/trips/recurring - Get user's recurring trips
  app.get('/recurring', async (request, reply) => {
    const result = await tripsService.getUserRecurringTrips(request.user!.id);
    return reply.status(200).send(createSuccessResponse(result));
  });

  // GET /api/v1/trips/:id - Get trip details by ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await tripsService.getTripById(id);
    return reply.status(200).send(createSuccessResponse(result));
  });

  // PATCH /api/v1/trips/:id - Update trip (owner only)
  app.patch(
    '/:id',
    {
      preValidation: [validateRequest({ body: updateTripSchema })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await tripsService.updateTrip(
        request.user!.id,
        id,
        request.body as Parameters<typeof tripsService.updateTrip>[2]
      );
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // POST /api/v1/trips/:id/status - Update trip status (owner or admin)
  app.post(
    '/:id/status',
    {
      preValidation: [validateRequest({ body: updateTripStatusSchema })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: TripStatus };
      const result = await tripsService.updateTripStatus(request.user!.id, id, status, request.user!.role);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // DELETE /api/v1/trips/:id - Delete or cancel trip
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await tripsService.deleteTrip(request.user!.id, id, request.user!.role);
    return reply.status(200).send(createSuccessResponse(result));
  });
};
