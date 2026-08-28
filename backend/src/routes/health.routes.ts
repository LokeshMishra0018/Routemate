import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { checkMongoHealth } from '../db/mongo.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';

export const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  /**
   * GET /health - Liveness probe
   * Returns 200 immediately if the Fastify process is running and responding.
   * Does NOT depend on MongoDB or external services.
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

  app.get('/healthz', async (_request, reply) => {
    return reply.status(200).send(
      createSuccessResponse({
        status: 'healthy',
        service: 'routemate-backend',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      })
    );
  });

  /**
   * GET /ready - Readiness probe
   * Returns 200 only when MongoDB is connected and ping succeeds.
   * Returns 503 Service Unavailable with standard error payload when MongoDB is offline.
   */
  app.get('/ready', async (_request, reply) => {
    const mongoStatus = await checkMongoHealth();

    if (!mongoStatus.connected) {
      return reply.status(503).send(
        createErrorResponse(
          'SERVICE_UNAVAILABLE',
          'Service is not ready to accept traffic. Database dependency is offline.',
          {
            dependencies: {
              mongodb: {
                connected: false,
                ...(mongoStatus.error ? { error: mongoStatus.error } : {}),
              },
            },
          }
        )
      );
    }

    return reply.status(200).send(
      createSuccessResponse({
        status: 'ready',
        service: 'routemate-backend',
        timestamp: new Date().toISOString(),
        dependencies: {
          mongodb: {
            connected: true,
            databaseName: mongoStatus.databaseName,
            pingMs: mongoStatus.pingMs,
          },
        },
      })
    );
  });
};
