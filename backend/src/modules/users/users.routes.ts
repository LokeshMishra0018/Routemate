import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { usersService } from './users.service.js';
import { updateProfileSchema } from './users.schemas.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../plugins/validation.js';
import { createSuccessResponse } from '../../utils/response.js';

export const usersRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // GET /api/v1/me & /api/v1/users/me - Get current user profile
  const handleGetMe = async (request: any, reply: any) => {
    const userProfile = await usersService.getCurrentUserProfile(request.user!.id);
    return reply.status(200).send(
      createSuccessResponse({
        id: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        status: userProfile.status,
        emailVerified: userProfile.emailVerified,
        user: {
          id: userProfile.id,
          email: userProfile.email,
          role: userProfile.role,
          status: userProfile.status,
          emailVerified: userProfile.emailVerified,
          fullName: userProfile.profile.fullName,
          avatarUrl: userProfile.profile.avatarUrl,
          collegeId: userProfile.profile.collegeId,
          collegeName: userProfile.profile.collegeName,
          trustScore: userProfile.profile.trustScore,
          verificationStatus: userProfile.profile.verificationStatus,
        },
        profile: userProfile.profile,
      })
    );
  };
  app.get('/me', { preHandler: [authenticate] }, handleGetMe);
  app.get('/users/me', { preHandler: [authenticate] }, handleGetMe);

  // PATCH /api/v1/me & /api/v1/users/me & /api/v1/users/me/profile - Update current user profile
  const handleUpdateMe = async (request: any, reply: any) => {
    const updated = await usersService.updateCurrentUserProfile(
      request.user!.id,
      request.body as Record<string, unknown>
    );
    return reply.status(200).send(createSuccessResponse(updated));
  };
  app.patch('/me', { preHandler: [authenticate], preValidation: [validateRequest({ body: updateProfileSchema })] }, handleUpdateMe);
  app.patch('/users/me', { preHandler: [authenticate], preValidation: [validateRequest({ body: updateProfileSchema })] }, handleUpdateMe);
  app.patch('/users/me/profile', { preHandler: [authenticate], preValidation: [validateRequest({ body: updateProfileSchema })] }, handleUpdateMe);

  // GET /api/v1/users/:id - Get public profile
  app.get(
    '/users/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (id === 'me') {
        const user = await usersService.getCurrentUserProfile(request.user!.id);
        return reply.status(200).send(createSuccessResponse(user));
      }
      const publicProfile = await usersService.getPublicProfile(id);
      return reply.status(200).send(createSuccessResponse(publicProfile));
    }
  );
};
