import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { adminService } from './admin.service.js';
import { reviewVerificationSchema, reviewReportSchema, resolveSosSchema } from './admin.schemas.js';
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

  // POST & PATCH /api/v1/admin/users/:id/suspend - Suspend user account
  const handleSuspend = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const body = (request.body as { reason?: string }) || {};
    const reason = body.reason || 'Moderator discretionary suspension.';
    const result = await adminService.suspendUser(request.user!.id, id, reason);
    return reply.status(200).send(createSuccessResponse(result));
  };
  app.post('/users/:id/suspend', { preHandler: [authenticate, requireRole('admin')] }, handleSuspend);
  app.patch('/users/:id/suspend', { preHandler: [authenticate, requireRole('admin')] }, handleSuspend);

  // POST & PATCH /api/v1/admin/users/:id/unsuspend - Unsuspend user account
  const handleUnsuspend = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const result = await adminService.unsuspendUser(request.user!.id, id);
    return reply.status(200).send(createSuccessResponse(result));
  };
  app.post('/users/:id/unsuspend', { preHandler: [authenticate, requireRole('admin')] }, handleUnsuspend);
  app.patch('/users/:id/unsuspend', { preHandler: [authenticate, requireRole('admin')] }, handleUnsuspend);

  // POST & PATCH /api/v1/admin/users/:id/role - Update user role (student <-> admin)
  const handleRoleChange = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const body = (request.body as { role: 'student' | 'admin' }) || {};
    if (!body.role || (body.role !== 'student' && body.role !== 'admin')) {
      return reply.status(400).send({ error: { message: "Role must be 'student' or 'admin'" } });
    }
    const result = await adminService.updateUserRole(request.user!.id, id, body.role);
    return reply.status(200).send(createSuccessResponse(result));
  };
  app.post('/users/:id/role', { preHandler: [authenticate, requireRole('admin')] }, handleRoleChange);
  app.patch('/users/:id/role', { preHandler: [authenticate, requireRole('admin')] }, handleRoleChange);

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

  // ==========================================
  // COMMAND CENTER: REALTIME & ANALYTICS APIs
  // ==========================================

  // GET /api/v1/admin/live/users - Real-time active users & current action telemetry
  app.get(
    '/live/users',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (_request, reply) => {
      const result = await adminService.getLivePresence();
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/live/events - Real-time chronological platform action stream
  app.get(
    '/live/events',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const query = request.query as { limit?: string };
      const limit = query.limit ? parseInt(query.limit, 10) : 50;
      const result = await adminService.getLiveEventStream(limit);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/stats/overview - High-level Executive & Mobility KPI overview
  app.get(
    '/stats/overview',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (_request, reply) => {
      const result = await adminService.getOverviewAnalytics();
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/analytics/funnel - 6-stage user onboarding and retention funnel
  app.get(
    '/analytics/funnel',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (_request, reply) => {
      const result = await adminService.getUserFunnelAnalytics();
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/analytics/demand - Search volume & unmet route demand
  app.get(
    '/analytics/demand',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (_request, reply) => {
      const result = await adminService.getSearchDemandAnalytics();
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/analytics/system - Real-time system health, RPM, and latency
  app.get(
    '/analytics/system',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (_request, reply) => {
      const result = await adminService.getSystemHealth();
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/trips - Master trip registry with filters & seat occupancy
  app.get(
    '/trips',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const query = request.query as {
        page?: string;
        pageSize?: string;
        status?: string;
        vehicleType?: string;
        search?: string;
      };
      const page = query.page ? parseInt(query.page, 10) : 1;
      const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;

      const result = await adminService.listAdminTrips(page, pageSize, {
        status: query.status,
        vehicleType: query.vehicleType,
        search: query.search,
      });
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // POST /api/v1/admin/trips/:id/cancel - Force cancel trip (soft cancel)
  app.post(
    '/trips/:id/cancel',
    {
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body as { reason?: string }) || {};
      const result = await adminService.cancelTripByAdmin(
        request.user!.id,
        id,
        body.reason || 'Administrative policy cancellation'
      );
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // DELETE /api/v1/admin/trips/:id - Permanently hard-delete & purge trip from database
  app.delete(
    '/trips/:id',
    {
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await adminService.deleteTripByAdmin(request.user!.id, id);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // PATCH & POST /api/v1/admin/trips/:id/visibility - Toggle trip search discovery
  const handleVisibility = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const body = (request.body as { isHidden: boolean }) || {};
    const result = await adminService.toggleTripVisibility(request.user!.id, id, body.isHidden ?? true);
    return reply.status(200).send(createSuccessResponse(result));
  };
  app.patch('/trips/:id/visibility', { preHandler: [authenticate, requireRole('moderator', 'admin')] }, handleVisibility);
  app.post('/trips/:id/visibility', { preHandler: [authenticate, requireRole('moderator', 'admin')] }, handleVisibility);

  // POST /api/v1/admin/trips/:id/request-changes - Send revision advisory to host
  app.post(
    '/trips/:id/request-changes',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body as { notes: string }) || {};
      if (!body.notes || !body.notes.trim()) {
        return reply.status(400).send({ error: { message: 'Revision notes are required' } });
      }
      const result = await adminService.requestTripChanges(request.user!.id, id, body.notes.trim());
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // POST /api/v1/admin/trips/:id/force-complete - Administrative force-complete
  app.post(
    '/trips/:id/force-complete',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await adminService.forceCompleteTrip(request.user!.id, id);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/trips/:id/inspect - Deep trip manifest details
  app.get(
    '/trips/:id/inspect',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await adminService.getTripDetailsForAdmin(id);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/matching/stats - Matching engine analytics & conversion rates
  app.get(
    '/matching/stats',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (_request, reply) => {
      const result = await adminService.getMatchingAnalytics();
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/groups - Commute circles directory
  app.get(
    '/groups',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const query = request.query as { page?: string; pageSize?: string; search?: string };
      const page = query.page ? parseInt(query.page, 10) : 1;
      const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;

      const result = await adminService.listAdminGroups(page, pageSize, query.search);
      return reply.status(200).send(createPaginatedResponse(result.items, result.pagination));
    }
  );

  // ==========================================
  // SECURITY & ACCESS CONTROLS
  // ==========================================

  // GET /api/v1/admin/security/password - Get current active admin security password
  app.get(
    '/security/password',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (_request, reply) => {
      const result = await adminService.getAdminSecurityPassword();
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // PUT /api/v1/admin/security/password - Update active admin security password
  app.put(
    '/security/password',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const body = request.body as { newPassword: string };
      const result = await adminService.updateAdminSecurityPassword(body.newPassword, request.user!.id);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/security/accounts - List recently provisioned / registered accounts
  app.get(
    '/security/accounts',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const query = request.query as { limit?: string };
      const limit = query.limit ? parseInt(query.limit, 10) : 10;
      const result = await adminService.getProvisionedAccounts(limit);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/admin/recent-logins - Real-time stream of latest logins & active user sessions
  app.get(
    '/recent-logins',
    {
      preHandler: [authenticate, requireRole('moderator', 'admin')],
    },
    async (request, reply) => {
      const query = request.query as { limit?: string };
      const limit = query.limit ? parseInt(query.limit, 10) : 25;
      const result = await adminService.getRecentLogins(limit);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );
};
