import { FastifyReply, FastifyRequest } from 'fastify';
import { createErrorResponse } from '../utils/response.js';

export function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
  reply.status(404).send(
    createErrorResponse(
      'NOT_FOUND',
      `Route ${request.method} ${request.url} not found`
    )
  );
}
