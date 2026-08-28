import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { connectionsService } from './connections.service.js';
import { createConnectionSchema, updateConnectionStatusSchema, listConnectionsQuerySchema } from './connections.schemas.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../plugins/validation.js';
import { createSuccessResponse, createPaginatedResponse } from '../../utils/response.js';
import { ConnectionStatus } from './connections.types.js';

export const connectionsRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // All connection endpoints require authentication
  app.addHook('preHandler', authenticate);

  // POST /api/v1/connections - Create connection request
  app.post(
    '/',
    {
      preValidation: [validateRequest({ body: createConnectionSchema })],
    },
    async (request, reply) => {
      const result = await connectionsService.createConnectionRequest(
        request.user!.id,
        request.body as { recipientId: string; tripId: string; candidateTripId?: string | null; message?: string | null }
      );
      return reply.status(201).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/connections - List connections for current user
  app.get(
    '/',
    {
      preValidation: [validateRequest({ query: listConnectionsQuerySchema })],
    },
    async (request, reply) => {
      const query = request.query as {
        page?: number;
        pageSize?: number;
        status?: ConnectionStatus;
        type?: 'incoming' | 'outgoing' | 'all';
      };

      const result = await connectionsService.listConnections(
        request.user!.id,
        query.type,
        query.status,
        query.page || 1,
        query.pageSize || 20
      );

      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // GET /api/v1/connections/requests - List incoming pending requests
  app.get('/requests', async (request, reply) => {
    const result = await connectionsService.listConnections(
      request.user!.id,
      'incoming',
      'pending',
      1,
      50
    );
    return reply.status(200).send(createSuccessResponse(result.items));
  });

  // GET /api/v1/connections/:id - Get single connection details
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await connectionsService.getConnectionById(request.user!.id, id);
    return reply.status(200).send(createSuccessResponse(result));
  });

  // PATCH /api/v1/connections/:id - Accept, reject, or cancel connection request
  app.patch(
    '/:id',
    {
      preValidation: [validateRequest({ body: updateConnectionStatusSchema })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { status: 'accepted' | 'rejected' | 'cancelled' };
      const result = await connectionsService.updateConnectionStatus(request.user!.id, id, body);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );
};
