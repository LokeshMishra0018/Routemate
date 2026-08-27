import { z } from 'zod';
import { geoPointSchema } from '../trips/trips.schemas.js';

export const createReportSchema = z.object({
  reportedUserId: z.string().optional(),
  tripId: z.string().optional(),
  category: z.enum([
    'harassment',
    'fraud',
    'unsafe_driving',
    'no_show',
    'inappropriate_content',
    'other',
  ]),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(2000, 'Reason cannot exceed 2000 characters'),
  evidenceUrls: z.array(z.string().url('Invalid evidence URL')).max(5).optional(),
});

export const createEmergencyContactSchema = z.object({
  name: z.string().min(2, 'Contact name is required').max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number (must be 10 digits starting with 6-9)'),
  relationship: z.string().min(2, 'Relationship is required').max(50),
  isPrimary: z.boolean().optional().default(false),
});

export const triggerSosSchema = z.object({
  tripId: z.string().optional(),
  location: geoPointSchema.optional(),
});
