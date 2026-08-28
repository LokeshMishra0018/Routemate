import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { adminService } from './admin.service.js';
import { reviewVerificationSchema, suspendUserSchema, reviewReportSchema, resolveSosSchema } from './admin.schemas.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateRequest, paginationQuerySchema } from '../../plugins/validation.js';
import { createSuccessResponse, createPaginatedResponse } from '../../utils/response.js';
import type { ReportCategory, ReportStatus, SosStatus } from '../safety/safety.types.js';

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

  // GET /api/v1/admin/verifications/:id/document - Stream student ID document image/PDF
  app.get(
    '/verifications/:id/document',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { buffer, mimeType, filename } = await adminService.getVerificationDocument(id);

      return reply
        .header('Content-Type', mimeType)
        .header('Content-Disposition', `inline; filename="${filename}"`)
        .header('Cache-Control', 'private, max-age=3600')
        .send(buffer);
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

  // PATCH & POST /api/v1/admin/verifications/:id/approve - Direct Approve shortcut
  const handleApprove = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const result = await adminService.reviewVerification(request.user!.id, id, { status: 'approved' });
    return reply.status(200).send(createSuccessResponse(result));
  };
  app.patch('/verifications/:id/approve', { preHandler: [authenticate, requireRole('moderator', 'admin')] }, handleApprove);
  app.post('/verifications/:id/approve', { preHandler: [authenticate, requireRole('moderator', 'admin')] }, handleApprove);

  // PATCH & POST /api/v1/admin/verifications/:id/reject - Direct Reject shortcut
  const handleReject = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const body = (request.body as { reason?: string; rejectionReason?: string }) || {};
    const rejectionReason = body.reason || body.rejectionReason || 'Document could not be verified.';
    const result = await adminService.reviewVerification(request.user!.id, id, {
      status: 'rejected',
      rejectionReason,
    });
    return reply.status(200).send(createSuccessResponse(result));
  };
  app.patch('/verifications/:id/reject', { preHandler: [authenticate, requireRole('moderator', 'admin')] }, handleReject);
  app.post('/verifications/:id/reject', { preHandler: [authenticate, requireRole('moderator', 'admin')] }, handleReject);

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

  // GET /api/v1/admin/reports - List safety reports
  app.get(
    '/reports',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const query = request.query as {
        page?: string;
        pageSize?: string;
        category?: ReportCategory;
        status?: ReportStatus;
      };
      const page = query.page ? parseInt(query.page, 10) : 1;
      const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;

      const result = await adminService.listReports(page, pageSize, query.category, query.status);
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // PATCH /api/v1/admin/reports/:id - Review and resolve report
  app.patch(
    '/reports/:id',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
      preValidation: [validateRequest({ body: reviewReportSchema })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        status: 'under_review' | 'resolved' | 'dismissed';
        resolutionNotes?: string;
        actionUser?: 'none' | 'suspend';
      };

      const result = await adminService.reviewReport(request.user!.id, id, body);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/sos-events - List SOS events
  app.get(
    '/sos-events',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const query = request.query as {
        page?: string;
        pageSize?: string;
        status?: SosStatus;
      };
      const page = query.page ? parseInt(query.page, 10) : 1;
      const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;

      const result = await adminService.listSosEvents(page, pageSize, query.status);
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // PATCH /api/v1/admin/sos-events/:id - Resolve SOS event
  app.patch(
    '/sos-events/:id',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
      preValidation: [validateRequest({ body: resolveSosSchema })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        status: 'resolved' | 'false_alarm';
        resolutionNotes?: string;
      };

      const result = await adminService.resolveSosEvent(request.user!.id, id, body);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/users/:id/safety-history - Complete safety audit trail for user
  app.get(
    '/users/:id/safety-history',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await adminService.getUserSafetyHistory(id);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );
};
