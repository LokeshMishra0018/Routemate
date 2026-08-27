import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { notificationsService } from './notifications.service.js';
import { listNotificationsQuerySchema } from './notifications.schemas.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../plugins/validation.js';
import { createSuccessResponse } from '../../utils/response.js';

export const notificationsRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // All notification endpoints require authentication
  app.addHook('preHandler', authenticate);

  // GET /api/v1/notifications - List user notifications
  app.get(
    '/',
    {
      preValidation: [validateRequest({ query: listNotificationsQuerySchema })],
    },
    async (request, reply) => {
      const query = request.query as { page?: number; pageSize?: number; unreadOnly?: boolean };
      const result = await notificationsService.listNotifications(
        request.user!.id,
        query.unreadOnly,
        query.page || 1,
        query.pageSize || 20
      );

      return reply.status(200).send({
        success: true,
        data: result.items,
        unreadCount: result.unreadCount,
        pagination: result.pagination,
      });
    }
  );

  // PATCH /api/v1/notifications/:id/read - Mark notification as read
  app.patch('/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await notificationsService.markAsRead(request.user!.id, id);
    return reply.status(200).send(createSuccessResponse(result));
  });

  // POST /api/v1/notifications/read-all - Mark all as read
  app.post('/read-all', async (request, reply) => {
    const result = await notificationsService.markAllAsRead(request.user!.id);
    return reply.status(200).send(createSuccessResponse(result));
  });
};
