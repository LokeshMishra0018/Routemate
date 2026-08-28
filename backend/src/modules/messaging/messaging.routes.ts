import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { messagingService } from './messaging.service.js';
import { sendMessageSchema, listMessagesQuerySchema } from './messaging.schemas.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest, paginationQuerySchema } from '../../plugins/validation.js';
import { createSuccessResponse, createPaginatedResponse } from '../../utils/response.js';
import { BadRequestError } from '../../utils/errors.js';

export const messagingRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // All messaging endpoints require authentication
  app.addHook('preHandler', authenticate);

  // POST /api/v1/conversations (or /api/v1/messaging/conversations) - Get or create direct conversation
  app.post('/', async (request, reply) => {
    const body = request.body as { recipientId?: string; participantId?: string; tripId?: string };
    const targetUserId = body.recipientId || body.participantId;
    if (!targetUserId) {
      throw new BadRequestError('recipientId or participantId is required');
    }
    const result = await messagingService.getOrCreateDirectConversation(
      request.user!.id,
      targetUserId,
      body.tripId
    );
    return reply.status(200).send(createSuccessResponse(result));
  });

  // GET /api/v1/conversations - List conversations
  app.get(
    '/',
    {
      preValidation: [validateRequest({ query: paginationQuerySchema })],
    },
    async (request, reply) => {
      const query = request.query as { page?: number; pageSize?: number };
      const result = await messagingService.listConversations(
        request.user!.id,
        query.page || 1,
        query.pageSize || 20
      );
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // GET /api/v1/conversations/:id - Get single conversation
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await messagingService.getConversationById(request.user!.id, id);
    return reply.status(200).send(createSuccessResponse(result));
  });

  // GET /api/v1/conversations/:id/messages - List messages in conversation
  app.get(
    '/:id/messages',
    {
      preValidation: [validateRequest({ query: listMessagesQuerySchema })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const query = request.query as { page?: number; pageSize?: number };
      const result = await messagingService.listMessages(
        request.user!.id,
        id,
        query.page || 1,
        query.pageSize || 50
      );
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // POST /api/v1/conversations/:id/messages - Send message
  app.post(
    '/:id/messages',
    {
      preValidation: [validateRequest({ body: sendMessageSchema })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { body?: string; content?: string; messageType?: 'text' | 'system' };
      const messageText = (body.body || body.content || '').trim();
      const result = await messagingService.sendMessage(
        request.user!.id,
        id,
        messageText,
        body.messageType || 'text'
      );
      return reply.status(201).send(createSuccessResponse(result));
    }
  );

  // POST /api/v1/conversations/:id/read - Mark conversation messages read
  app.post('/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await messagingService.markConversationAsRead(request.user!.id, id);
    return reply.status(200).send(createSuccessResponse(result));
  });
};
