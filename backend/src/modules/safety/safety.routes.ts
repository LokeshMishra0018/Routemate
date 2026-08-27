import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { safetyService } from './safety.service.js';
import { createReportSchema, createEmergencyContactSchema, triggerSosSchema } from './safety.schemas.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../plugins/validation.js';
import { createSuccessResponse } from '../../utils/response.js';
import { ReportCategory } from './safety.types.js';
import { GeoPoint } from '../trips/trips.types.js';

export const safetyRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // All safety endpoints require authentication
  app.addHook('preHandler', authenticate);

  // POST /api/v1/safety/reports - File a report
  app.post(
    '/reports',
    {
      preValidation: [validateRequest({ body: createReportSchema })],
    },
    async (request, reply) => {
      const body = request.body as {
        reportedUserId?: string;
        tripId?: string;
        category: ReportCategory;
        reason: string;
        evidenceUrls?: string[];
      };

      const result = await safetyService.fileReport({
        reporterId: request.user!.id,
        ...body,
      });

      return reply.status(201).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/safety/emergency-contacts - List emergency contacts
  app.get('/emergency-contacts', async (request, reply) => {
    const result = await safetyService.listEmergencyContacts(request.user!.id);
    return reply.status(200).send(createSuccessResponse(result));
  });

  // POST /api/v1/safety/emergency-contacts - Add an emergency contact
  app.post(
    '/emergency-contacts',
    {
      preValidation: [validateRequest({ body: createEmergencyContactSchema })],
    },
    async (request, reply) => {
      const body = request.body as {
        name: string;
        phone: string;
        relationship: string;
        isPrimary?: boolean;
      };

      const result = await safetyService.addEmergencyContact({
        userId: request.user!.id,
        ...body,
      });

      return reply.status(201).send(createSuccessResponse(result));
    }
  );

  // DELETE /api/v1/safety/emergency-contacts/:id - Delete an emergency contact
  app.delete('/emergency-contacts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await safetyService.deleteEmergencyContact(request.user!.id, id);
    return reply.status(200).send(createSuccessResponse({ deleted: true }));
  });

  // POST /api/v1/safety/sos - Trigger emergency SOS alert
  app.post(
    '/sos',
    {
      preValidation: [validateRequest({ body: triggerSosSchema })],
    },
    async (request, reply) => {
      const body = request.body as {
        tripId?: string;
        location?: GeoPoint;
      };

      const result = await safetyService.triggerSos({
        userId: request.user!.id,
        ...body,
      });

      return reply.status(201).send(createSuccessResponse(result));
    }
  );
};
