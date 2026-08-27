import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { createErrorResponse } from '../utils/response.js';

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const reqId = request.id;

  // Log the error with request ID context
  request.log.error({ err: error, reqId }, 'Request encountered an error');

  // Handle custom AppError instances
  if (error instanceof AppError) {
    reply.status(error.statusCode).send(
      createErrorResponse(error.code, error.message, error.details)
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
      createErrorResponse('VALIDATION_ERROR', error.message, error.validation)
    );
    return;
  }

  // Handle Fastify 429 Rate Limit
  if ('statusCode' in error && error.statusCode === 429) {
    reply.status(429).send(
      createErrorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests, please slow down')
    );
    return;
  }

  // Handle other Fastify HTTP status codes (e.g. 404, 400 from body parsers)
  const statusCode = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;

  if (statusCode >= 400 && statusCode < 500) {
    reply.status(statusCode).send(
      createErrorResponse('CLIENT_ERROR', error.message)
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
