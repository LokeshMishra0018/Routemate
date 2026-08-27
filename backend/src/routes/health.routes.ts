import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { checkMongoHealth } from '../db/mongo.js';
import { createSuccessResponse } from '../utils/response.js';

export const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  /**
   * GET /health - Liveness probe
   * Returns immediately if the Fastify process is running and responding.
   */
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send(
      createSuccessResponse({
        status: 'healthy',
        service: 'routemate-backend',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memoryUsage: process.memoryUsage(),
      })
    );
  });

  /**
   * GET /ready - Readiness probe
   * Returns 200 if dependent services (MongoDB) are reachable, 503 Service Unavailable otherwise.
   */
  app.get('/ready', async (_request, reply) => {
    const mongoStatus = await checkMongoHealth();

    const isReady = mongoStatus.connected;
    const statusCode = isReady ? 200 : 503;

    return reply.status(statusCode).send({
      success: isReady,
      data: {
        status: isReady ? 'ready' : 'unhealthy',
        service: 'routemate-backend',
        timestamp: new Date().toISOString(),
        dependencies: {
          mongodb: mongoStatus,
        },
      },
      ...(!isReady
        ? {
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Service is not ready to accept traffic. Dependencies are offline.',
              details: { mongodb: mongoStatus },
            },
          }
        : {}),
    });
  });
};
