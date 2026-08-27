import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { usersService } from './users.service.js';
import { updateProfileSchema } from './users.schemas.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../plugins/validation.js';
import { createSuccessResponse } from '../../utils/response.js';

export const usersRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // GET /api/v1/me - Get current user profile
  app.get(
    '/me',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = await usersService.getCurrentUserProfile(request.user!.id);
      return reply.status(200).send(createSuccessResponse(user));
    }
  );

  // PATCH /api/v1/me - Update current user profile
  app.patch(
    '/me',
    {
      preHandler: [authenticate],
      preValidation: [validateRequest({ body: updateProfileSchema })],
    },
    async (request, reply) => {
      const updated = await usersService.updateCurrentUserProfile(
        request.user!.id,
        request.body as Record<string, unknown>
      );
      return reply.status(200).send(createSuccessResponse(updated));
    }
  );

  // GET /api/v1/users/:id - Get public profile
  app.get(
    '/users/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const publicProfile = await usersService.getPublicProfile(id);
      return reply.status(200).send(createSuccessResponse(publicProfile));
    }
  );
};
