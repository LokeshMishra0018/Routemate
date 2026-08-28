import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authService } from './auth.service.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  googleAuthSchema,
} from './auth.schemas.js';
import { validateRequest } from '../../plugins/validation.js';
import { createSuccessResponse } from '../../utils/response.js';

export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // POST /api/v1/auth/google - Institutional Google Sign-In (@kiet.edu)
  app.post(
    '/google',
    {
      preValidation: [validateRequest({ body: googleAuthSchema })],
    },
    async (request, reply) => {
      const { idToken } = request.body as { idToken: string };
      const result = await authService.loginWithGoogle(idToken);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // POST /api/v1/auth/register
  app.post(
    '/register',
    {
      preValidation: [validateRequest({ body: registerSchema })],
    },
    async (request, reply) => {
      const result = await authService.register(request.body as { email: string; password: string; fullName: string });
      return reply.status(201).send(createSuccessResponse(result));
    }
  );

  // POST /api/v1/auth/verify-email
  app.post(
    '/verify-email',
    {
      preValidation: [validateRequest({ body: verifyEmailSchema })],
    },
    async (request, reply) => {
      const { token } = request.body as { token: string };
      const result = await authService.verifyEmail(token);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // POST /api/v1/auth/login
  app.post(
    '/login',
    {
      preValidation: [validateRequest({ body: loginSchema })],
    },
    async (request, reply) => {
      const { email, password } = request.body as { email: string; password: string };
      const userAgent = request.headers['user-agent'];
      const ip = request.ip;

      const result = await authService.login({
        email,
        password,
        deviceInfo: typeof userAgent === 'string' ? userAgent : undefined,
        ipMetadata: ip,
      });

      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // POST /api/v1/auth/refresh
  app.post(
    '/refresh',
    {
      preValidation: [validateRequest({ body: refreshTokenSchema })],
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };
      const userAgent = request.headers['user-agent'];
      const ip = request.ip;

      const result = await authService.refresh(refreshToken, {
        deviceInfo: typeof userAgent === 'string' ? userAgent : undefined,
        ipMetadata: ip,
      });

      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // POST /api/v1/auth/logout
  app.post('/logout', async (request, reply) => {
    const body = request.body as { refreshToken?: string } | undefined;
    const result = await authService.logout(body?.refreshToken);
    return reply.status(200).send(createSuccessResponse(result));
  });

  // POST /api/v1/auth/forgot-password
  app.post(
    '/forgot-password',
    {
      preValidation: [validateRequest({ body: forgotPasswordSchema })],
    },
    async (request, reply) => {
      const { email } = request.body as { email: string };
      const result = await authService.forgotPassword(email);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // POST /api/v1/auth/reset-password
  app.post(
    '/reset-password',
    {
      preValidation: [validateRequest({ body: resetPasswordSchema })],
    },
    async (request, reply) => {
      const { token, password } = request.body as { token: string; password: string };
      const result = await authService.resetPassword(token, password);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );
};
