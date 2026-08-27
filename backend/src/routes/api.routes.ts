import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { usersRoutes } from '../modules/users/users.routes.js';
import { collegesRoutes } from '../modules/colleges/colleges.routes.js';
import { verificationRoutes } from '../modules/verification/verification.routes.js';
import { adminRoutes } from '../modules/admin/admin.routes.js';
import { tripsRoutes } from '../modules/trips/trips.routes.js';
import { matchingRoutes } from '../modules/matching/matching.routes.js';
import { connectionsRoutes } from '../modules/connections/connections.routes.js';
import { groupsRoutes } from '../modules/groups/groups.routes.js';
import { messagingRoutes } from '../modules/messaging/messaging.routes.js';
import { notificationsRoutes } from '../modules/notifications/notifications.routes.js';
import { reviewsRoutes } from '../modules/reviews/reviews.routes.js';
import { safetyRoutes } from '../modules/safety/safety.routes.js';
import { createSuccessResponse } from '../utils/response.js';

export const apiV1Routes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // Base /api/v1 status metadata
  app.get('/', async (_request, reply) => {
    return reply.status(200).send(
      createSuccessResponse({
        version: 'v1',
        name: 'RouteMate API',
        phase: 'PHASE 7 - Trust, Verification, Safety, Ratings & Moderation',
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
  await app.register(matchingRoutes, { prefix: '/matches' });
  await app.register(connectionsRoutes, { prefix: '/connections' });
  await app.register(groupsRoutes, { prefix: '/groups' });
  await app.register(messagingRoutes, { prefix: '/conversations' });
  await app.register(notificationsRoutes, { prefix: '/notifications' });
  await app.register(reviewsRoutes, { prefix: '/reviews' });
  await app.register(safetyRoutes, { prefix: '/safety' });
};
