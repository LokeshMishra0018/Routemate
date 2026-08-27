import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { usersRoutes } from '../modules/users/users.routes.js';
import { collegesRoutes } from '../modules/colleges/colleges.routes.js';
import { verificationRoutes } from '../modules/verification/verification.routes.js';
import { adminRoutes } from '../modules/admin/admin.routes.js';
import { tripsRoutes } from '../modules/trips/trips.routes.js';
import { createSuccessResponse } from '../utils/response.js';

export const apiV1Routes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // Base /api/v1 status metadata
  app.get('/', async (_request, reply) => {
    return reply.status(200).send(
      createSuccessResponse({
        version: 'v1',
        name: 'RouteMate API',
        phase: 'PHASE 3 - Trips + Routes + Geospatial Search',
        documentation: '/docs',
      })
    );
  });

  // Module routes
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(usersRoutes);
  await app.register(collegesRoutes, { prefix: '/colleges' });
  await app.register(verificationRoutes, { prefix: '/verification' });
  await app.register(adminRoutes, { prefix: '/admin' });
  await app.register(tripsRoutes, { prefix: '/trips' });
};
