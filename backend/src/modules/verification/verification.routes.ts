import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { verificationService } from './verification.service.js';
import { authenticate } from '../../middleware/auth.js';
import { createSuccessResponse } from '../../utils/response.js';
import { ValidationError } from '../../utils/errors.js';

export const verificationRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  // POST /api/v1/verification - Submit student college ID document
  app.post(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      let fileBuffer: Buffer | null = null;
      let mimeType = 'image/jpeg';
      let filename = 'college_id.jpg';

      // Support multipart/form-data upload or JSON payload (base64)
      if (request.isMultipart()) {
        const data = await request.file();
        if (!data) {
          throw new ValidationError('Document file is required');
        }
        fileBuffer = await data.toBuffer();
        mimeType = data.mimetype;
        filename = data.filename;
      } else {
        const body = request.body as { documentBase64?: string; mimeType?: string; filename?: string } | undefined;
        if (!body?.documentBase64) {
          throw new ValidationError('Document payload or file is required');
        }
        fileBuffer = Buffer.from(body.documentBase64, 'base64');
        if (body.mimeType) mimeType = body.mimeType;
        if (body.filename) filename = body.filename;
      }

      const result = await verificationService.submitVerification(
        request.user!.id,
        fileBuffer,
        mimeType,
        filename
      );

      return reply.status(201).send(createSuccessResponse(result));
    }
  );

  // GET /api/v1/verification/me - Get own verification request status
  app.get(
    '/me',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await verificationService.getOwnVerification(request.user!.id);
      return reply.status(200).send(createSuccessResponse(result));
    }
  );
};
