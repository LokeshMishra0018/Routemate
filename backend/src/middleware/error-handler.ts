import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { createErrorResponse } from '../utils/response.js';

export function errorHandler(
  error: FastifyError | Error | Record<string, unknown>,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const reqId = request.id;

  // Set X-Request-ID response header if not already set
  reply.header('x-request-id', reqId);

  // Log the error with request ID context (redacting sensitive fields)
  request.log.error({ err: error, reqId }, 'Request encountered an error');

  // Handle custom AppError instances
  if (error instanceof AppError) {
    reply.status(error.statusCode).send(
      createErrorResponse(error.code, error.message, error.details)
    );
    return;
  }

  // Handle CORS rejection errors (preventing 500)
  if (
    (typeof error.message === 'string' && error.message.includes('CORS')) ||
    ('name' in error && error.name === 'FastifyCorsError') ||
    ('statusCode' in error && error.statusCode === 403)
  ) {
    reply.status(403).send(
      createErrorResponse('FORBIDDEN', 'CORS request rejected: Origin not allowed')
    );
    return;
  }

  // Handle Fastify 429 Rate Limit (both Error objects and rate-limit payload objects)
  if (
    ('error' in error && typeof error.error === 'object' && error.error !== null && (error.error as Record<string, unknown>).code === 'RATE_LIMIT_EXCEEDED') ||
    ('statusCode' in error && error.statusCode === 429) ||
    ('name' in error && error.name === 'RateLimitError')
  ) {
    reply.status(429).send(
      createErrorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests, please slow down and try again later.')
    );
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    reply.status(400).send(
      createErrorResponse('VALIDATION_ERROR', 'Input validation failed', details)
    );
    return;
  }

  // Handle Fastify built-in schema validation errors
  if ('validation' in error && error.validation) {
    reply.status(400).send(
      createErrorResponse('VALIDATION_ERROR', typeof error.message === 'string' ? error.message : 'Validation error', error.validation)
    );
    return;
  }

  // Handle other Fastify HTTP status codes (e.g. 404, 400 from body parsers)
  const statusCode = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;

  if (statusCode >= 400 && statusCode < 500) {
    reply.status(statusCode).send(
      createErrorResponse('CLIENT_ERROR', typeof error.message === 'string' ? error.message : 'Client error')
    );
    return;
  }

  // Production safe fallback for unexpected 500 Internal Server Errors
  reply.status(500).send(
    createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected internal server error occurred'
    )
  );
}
