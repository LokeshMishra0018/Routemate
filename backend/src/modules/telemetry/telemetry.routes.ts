import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { visitorTrackerStore, VisitorPingPayload } from '../../lib/visitorTracker.js';
import { createSuccessResponse } from '../../utils/response.js';

export const telemetryRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  /**
   * POST /api/v1/telemetry/visitor-ping
   * Public, completely unauthenticated endpoint for silent, zero-permission overview page telemetry.
   */
  app.post('/visitor-ping', async (request, reply) => {
    const body = (request.body as Partial<VisitorPingPayload>) || {};
    
    // Fallback/generate session ID if client didn't supply one
    const sessionId = body.sessionId || `anon-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    const payload: VisitorPingPayload = {
      sessionId,
      currentPath: body.currentPath || '/',
      currentAction: body.currentAction || 'Browsing Overview Page',
      currentSection: body.currentSection,
      referrer: body.referrer,
      deviceCategory: body.deviceCategory || 'desktop',
      browserInfo: body.browserInfo || 'Browser',
      screenResolution: body.screenResolution,
      language: body.language,
      isLeaving: body.isLeaving,
    };

    const clientIp =
      (request.headers['cf-connecting-ip'] as string) ||
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      '127.0.0.1';

    const recordedVisitor = visitorTrackerStore.recordPing(payload, clientIp, request.headers);

    return reply.status(200).send(
      createSuccessResponse({
        recorded: true,
        sessionId: recordedVisitor.sessionId,
        city: recordedVisitor.city,
        region: recordedVisitor.region,
        timestamp: recordedVisitor.lastPingAt,
      })
    );
  });
};
