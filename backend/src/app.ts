import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import crypto from 'node:crypto';
import { getEnv, Env } from './config/env.js';
import { registerSecurityPlugins } from './plugins/security.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found-handler.js';
import { connectMongo, isMongoConnected } from './db/mongo.js';

export interface AppOptions {
  env?: Env;
  fastifyOptions?: FastifyServerOptions;
}

/**
 * Builds and configures the Fastify application instance.
 * Testable without starting a network listener.
 */
export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const env = options.env || getEnv();

  const isTest = env.NODE_ENV === 'test';
  const isDev = env.NODE_ENV === 'development';

  const app = Fastify({
    logger: isTest
      ? false
      : {
          level: env.LOG_LEVEL,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'body.password',
              'body.passwordHash',
              'body.token',
              'body.refreshToken',
            ],
            censor: '[REDACTED]',
          },
          transport: isDev
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'HH:MM:ss Z',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
        },
    genReqId: (req) => {
      const headerReqId = req.headers['x-request-id'];
      if (typeof headerReqId === 'string' && headerReqId.trim().length > 0) {
        return headerReqId;
      }
      return crypto.randomUUID();
    },
    bodyLimit: 10 * 1024 * 1024, // 10MB limit
    ...options.fastifyOptions,
  });

  // Global Error & 404 Handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Guarantee X-Request-ID response header on all outgoing HTTP responses
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  // Ensure MongoDB connection is established before servicing API routes (skip for probes)
  app.addHook('onRequest', async (request) => {
    const path = request.url.split('?')[0];
    if (
      path === '/' ||
      path === '/health' ||
      path === '/healthz' ||
      path === '/ready' ||
      path.startsWith('/api/v1/health')
    ) {
      return;
    }
    if (!isMongoConnected() && env.NODE_ENV !== 'test') {
      try {
        await connectMongo();
      } catch (dbErr) {
        request.log.warn({ err: dbErr }, 'On-demand MongoDB connection attempt failed');
      }
    }
  });

  // Security Plugins (CORS, Helmet, Rate Limiter, Cookies)
  await registerSecurityPlugins(app, env);

  // Observability & Request Metrics Hook
  const { registerMetricsHook } = await import('./middleware/metrics.js');
  await registerMetricsHook(app);

  // Multipart parser for private document uploads
  const multipart = (await import('@fastify/multipart')).default;
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
      files: 1,
    },
  });

  // Application Routes
  await registerRoutes(app);

  return app;
}
