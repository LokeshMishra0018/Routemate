import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { validateRequest } from '../../src/plugins/validation.js';

describe('Validation Plugin & Error Formatting (Integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const env = getEnv({
      NODE_ENV: 'test',
      PORT: '4000',
      MONGODB_URI: 'mongodb://localhost:27017',
      MONGODB_DB_NAME: 'routemate_test',
    });
    app = await buildApp({ env });

    // Register a test route with Zod validation
    const testBodySchema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });

    app.post(
      '/test-validation',
      {
        preValidation: [validateRequest({ body: testBodySchema })],
      },
      async (request, reply) => {
        return reply.status(200).send({ success: true, data: request.body });
      }
    );

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should accept valid payload matching Zod schema', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test-validation',
      payload: {
        email: 'student@kiet.edu',
        age: 20,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('student@kiet.edu');
  });

  it('should reject invalid payload with structured VALIDATION_ERROR', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test-validation',
      payload: {
        email: 'not-an-email',
        age: 15,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Input validation failed');
    expect(Array.isArray(body.error.details)).toBe(true);
  });
});
