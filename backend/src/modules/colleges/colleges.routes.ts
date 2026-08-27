import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { collegesService } from './colleges.service.js';
import { createSuccessResponse } from '../../utils/response.js';

export const collegesRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // GET /api/v1/colleges - List all active colleges
  app.get('/', async (_request, reply) => {
    const colleges = await collegesService.getActiveColleges();
    return reply.status(200).send(createSuccessResponse(colleges));
  });

  // GET /api/v1/colleges/:id - Get specific college details
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const college = await collegesService.getCollegeById(id);
    return reply.status(200).send(createSuccessResponse(college));
  });
};
