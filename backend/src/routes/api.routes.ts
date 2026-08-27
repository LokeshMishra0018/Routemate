import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createSuccessResponse } from '../utils/response.js';

export const apiV1Routes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // Base /api/v1 information endpoint
  app.get('/', async (_request, reply) => {
    return reply.status(200).send(
      createSuccessResponse({
        version: 'v1',
        name: 'RouteMate API',
        phase: 'PHASE 1 - Backend Foundation',
        documentation: '/docs',
      })
    );
  });
};
