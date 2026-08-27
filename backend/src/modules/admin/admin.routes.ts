import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { adminService } from './admin.service.js';
import { reviewVerificationSchema, suspendUserSchema } from './admin.schemas.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateRequest, paginationQuerySchema } from '../../plugins/validation.js';
import { createSuccessResponse, createPaginatedResponse } from '../../utils/response.js';

export const adminRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // GET /api/v1/admin/verifications - List pending verifications
  app.get(
    '/verifications',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
      preValidation: [validateRequest({ query: paginationQuerySchema })],
    },
    async (request, reply) => {
      const query = request.query as { page?: number; pageSize?: number };
      const result = await adminService.getPendingVerifications(query.page || 1, query.pageSize || 20);
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // PATCH /api/v1/admin/verifications/:id - Approve or Reject verification
  app.patch(
    '/verifications/:id',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
      preValidation: [validateRequest({ body: reviewVerificationSchema })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { status: 'approved' | 'rejected'; rejectionReason?: string };
      const result = await adminService.reviewVerification(request.user!.id, id, body);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/users - Search and list users
  app.get(
    '/users',
    {
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const query = request.query as { page?: string; pageSize?: string; search?: string };
      const page = query.page ? parseInt(query.page, 10) : 1;
      const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;

      const result = await adminService.listUsers(page, pageSize, query.search);
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // POST /api/v1/admin/users/:id/suspend - Suspend user account
  app.post(
    '/users/:id/suspend',
    {
      preHandler: [authenticate, requireRole('admin')],
      preValidation: [validateRequest({ body: suspendUserSchema })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason: string };
      const result = await adminService.suspendUser(request.user!.id, id, reason);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // POST /api/v1/admin/users/:id/unsuspend - Unsuspend user account
  app.post(
    '/users/:id/unsuspend',
    {
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await adminService.unsuspendUser(request.user!.id, id);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/audit-logs - View admin audit logs
  app.get(
    '/audit-logs',
    {
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const query = request.query as { page?: string; pageSize?: string };
      const page = query.page ? parseInt(query.page, 10) : 1;
      const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;

      const result = await adminService.getAuditLogs(page, pageSize);
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );
};
