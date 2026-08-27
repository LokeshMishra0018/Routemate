import { FastifyRequest, FastifyReply } from 'fastify';
import { z, ZodSchema } from 'zod';

export interface RouteSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

/**
 * Fastify preValidation hook that validates request body, query params, path params, or headers using Zod schemas.
 */
export function validateRequest(schemas: RouteSchemas) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (schemas.body && request.body !== undefined) {
      request.body = await schemas.body.parseAsync(request.body);
    }
    if (schemas.query && request.query !== undefined) {
      request.query = await schemas.query.parseAsync(request.query);
    }
    if (schemas.params && request.params !== undefined) {
      request.params = await schemas.params.parseAsync(request.params);
    }
    if (schemas.headers && request.headers !== undefined) {
      request.headers = await schemas.headers.parseAsync(request.headers);
    }
  };
}

/**
 * Standard pagination query schema
 */
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1)),
  pageSize: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100)),
});
