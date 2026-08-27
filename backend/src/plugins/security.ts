import { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import sensible from '@fastify/sensible';
import { Env } from '../config/env.js';
import { ForbiddenError } from '../utils/errors.js';

export async function registerSecurityPlugins(app: FastifyInstance, env: Env): Promise<void> {
  // 1. Register fastify-sensible for standard HTTP utility methods
  await app.register(sensible);

  // 2. Register Cookie parser
  await app.register(cookie, {
    hook: 'onRequest',
  });

  // 3. Security Headers via Helmet
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
    hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
  });

  // 4. CORS Configuration
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, unit tests)
      if (!origin) {
        cb(null, true);
        return;
      }

      // Check against allowed origins list
      if (allowedOrigins.includes(origin) || (allowedOrigins.includes('*') && env.NODE_ENV !== 'production')) {
        cb(null, true);
        return;
      }

      // Reject disallowed origins with custom ForbiddenError (returns 403, not 500)
      cb(new ForbiddenError('CORS request rejected: Origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Request-ID'],
  });

  // 5. Global Rate Limiting
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW_MS,
    allowList: env.RATE_LIMIT_ALLOW_LIST, // configurable allowlist (empty array by default)
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please slow down and try again later.',
      },
    }),
  });
}
