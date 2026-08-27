import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.routes.js';
import { apiV1Routes } from './api.routes.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Top-level health and readiness probes
  await app.register(healthRoutes);

  // Versioned API namespace
  await app.register(apiV1Routes, { prefix: '/api/v1' });
}
