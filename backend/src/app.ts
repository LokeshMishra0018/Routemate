import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import crypto from 'node:crypto';
import { getEnv, Env } from './config/env.js';
import { registerSecurityPlugins } from './plugins/security.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found-handler.js';

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
          transport:
            env.NODE_ENV === 'development'
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

  // Security Plugins (CORS, Helmet, Rate Limiter, Cookies)
  await registerSecurityPlugins(app, env);

  // Application Routes
  await registerRoutes(app);

  return app;
}
