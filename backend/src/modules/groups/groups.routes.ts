import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { groupsService } from './groups.service.js';
import { createGroupSchema, updateGroupSchema, listGroupsQuerySchema } from './groups.schemas.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../plugins/validation.js';
import { createSuccessResponse, createPaginatedResponse } from '../../utils/response.js';

export const groupsRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // All group endpoints require authentication
  app.addHook('preHandler', authenticate);

  // POST /api/v1/groups - Create a new travel group
  app.post(
    '/',
    {
      preValidation: [validateRequest({ body: createGroupSchema })],
    },
    async (request, reply) => {
      const result = await groupsService.createGroup(
        request.user!.id,
        request.body as {
          name: string;
          description?: string | null;
          tripId?: string | null;
          maxCapacity: number;
          costSharing: { enabled: boolean; estimatedTotalCost: number; currency: string };
        }
      );
      return reply.status(201).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/groups - Search and list active groups
  app.get(
    '/',
    {
      preValidation: [validateRequest({ query: listGroupsQuerySchema })],
    },
    async (request, reply) => {
      const query = request.query as {
        search?: string;
        status?: 'open' | 'closed' | 'completed';
        tripId?: string;
        page?: number;
        pageSize?: number;
      };

      const result = await groupsService.listGroups(
        query.search,
        query.status,
        query.tripId,
        query.page || 1,
        query.pageSize || 20
      );

      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // GET /api/v1/groups/:id - Get group details and members
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await groupsService.getGroupById(id);
    return reply.status(200).send(createSuccessResponse(result));
  });

  // PATCH /api/v1/groups/:id - Update group settings (owner only)
  app.patch(
    '/:id',
    {
      preValidation: [validateRequest({ body: updateGroupSchema })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await groupsService.updateGroup(request.user!.id, id, request.body as Record<string, unknown>);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // POST /api/v1/groups/:id/join - Join group
  app.post('/:id/join', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await groupsService.joinGroup(request.user!.id, id);
    return reply.status(200).send(createSuccessResponse(result));
  });

  // POST /api/v1/groups/:id/leave - Leave group
  app.post('/:id/leave', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await groupsService.leaveGroup(request.user!.id, id);
    return reply.status(200).send(createSuccessResponse(result));
  });

  // DELETE /api/v1/groups/:id/members/:userId - Remove member (owner only)
  app.delete('/:id/members/:userId', async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const result = await groupsService.removeMember(request.user!.id, id, userId);
    return reply.status(200).send(createSuccessResponse(result));
  });
};
