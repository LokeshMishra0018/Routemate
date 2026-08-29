import { z } from 'zod';

export const geoPointSchema = z
  .preprocess(
    (val) => {
      if (Array.isArray(val) && val.length === 2 && typeof val[0] === 'number' && typeof val[1] === 'number') {
        return { type: 'Point', coordinates: val };
      }
      return val;
    },
    z.object({
      type: z.literal('Point').default('Point'),
      coordinates: z
        .tuple([
          z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
          z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
        ])
        .default([77.4977, 28.7532]),
    })
  )
  .default({ type: 'Point', coordinates: [77.4977, 28.7532] });

export const locationPointSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(150).trim(),
  coordinates: geoPointSchema.optional().default({ type: 'Point', coordinates: [77.4977, 28.7532] }),
});

const tripStopSchema = z.object({
  name: z.string().min(1, 'Stop name is required').max(150).trim(),
  coordinates: geoPointSchema.optional().default({ type: 'Point', coordinates: [77.4977, 28.7532] }),
  sequenceNumber: z.number().int().min(1),
  estimatedArrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:MM').nullable().optional(),
});

const tripPreferencesSchema = z.object({
  genderPreference: z.enum(['any', 'same_gender']).default('any'),
  conversationPreference: z.enum(['quiet', 'moderate', 'talkative']).nullable().optional(),
  smokingPreference: z.enum(['no', 'yes']).nullable().optional(),
  other: z.string().max(255).trim().nullable().optional(),
});

const costSharingSchema = z.object({
  enabled: z.boolean().default(false),
  estimatedTotalCost: z.number().min(0).max(100000).nullable().optional(),
  currency: z.string().max(10).default('INR').optional(),
});

const meetingPointSchema = z.object({
  name: z.string().min(1, 'Meeting point name is required').max(150).trim(),
  coordinates: geoPointSchema,
  notes: z.string().max(300).trim().nullable().optional(),
});

export const createTripSchema = z.preprocess(
  (raw: any) => {
    if (typeof raw !== 'object' || raw === null) return raw;
    const copy = { ...raw };

    // 1. If intermediateStops was sent instead of stops
    if (!copy.stops && Array.isArray(copy.intermediateStops)) {
      copy.stops = copy.intermediateStops;
    }

    // 2. If departureTime is an ISO string like "2026-08-30T09:00:00.000Z", extract travelDate & departureTime
    if (typeof copy.departureTime === 'string' && copy.departureTime.includes('T')) {
      const d = new Date(copy.departureTime);
      if (!isNaN(d.getTime())) {
        if (!copy.travelDate) {
          copy.travelDate = d.toISOString().split('T')[0];
        }
        const hrs = String(d.getUTCHours()).padStart(2, '0');
        const mins = String(d.getUTCMinutes()).padStart(2, '0');
        copy.departureTime = `${hrs}:${mins}`;
      }
    }

    // 3. Fallback travelDate to tomorrow if missing
    if (!copy.travelDate) {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      copy.travelDate = tomorrow.toISOString().split('T')[0];
    }

    // 4. Normalize transportType
    if (copy.transportType === 'carpool') copy.transportType = 'personal_vehicle';
    if (copy.transportType === 'auto') copy.transportType = 'other';
    if (copy.transportType === 'metro_walk') copy.transportType = 'train';

    return copy;
  },
  z.object({
    source: locationPointSchema,
    destination: locationPointSchema,
    travelDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .refine((dateStr) => {
        const today = new Date().toISOString().split('T')[0];
        return dateStr >= today;
      }, 'Travel date cannot be in the past'),
    departureTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in 24-hour HH:MM format'),
    estimatedArrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in 24-hour HH:MM format').nullable().optional(),
    transportType: z.enum(['train', 'bus', 'flight', 'cab', 'personal_vehicle', 'other']),
    stops: z.array(tripStopSchema).default([]),
    preferences: tripPreferencesSchema.default({ genderPreference: 'any' }),
    costSharing: costSharingSchema.default({ enabled: false }),
    availableSeats: z.number().int().min(1).max(20).default(1),
    notes: z.string().max(1000).trim().nullable().optional(),
    meetingPoint: meetingPointSchema.nullable().optional(),
  })
);

export const updateTripSchema = z.object({
  source: locationPointSchema.optional(),
  destination: locationPointSchema.optional(),
  travelDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((dateStr) => {
      const today = new Date().toISOString().split('T')[0];
      return dateStr >= today;
    }, 'Travel date cannot be in the past')
    .optional(),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in 24-hour HH:MM format').optional(),
  estimatedArrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in 24-hour HH:MM format').nullable().optional(),
  transportType: z.enum(['train', 'bus', 'flight', 'cab', 'personal_vehicle', 'other']).optional(),
  stops: z.array(tripStopSchema).optional(),
  preferences: tripPreferencesSchema.optional(),
  costSharing: costSharingSchema.optional(),
  availableSeats: z.number().int().min(1).max(20).optional(),
  notes: z.string().max(1000).trim().nullable().optional(),
  meetingPoint: meetingPointSchema.nullable().optional(),
});

export const updateTripStatusSchema = z.object({
  status: z.enum(['planning', 'confirmed', 'upcoming', 'travelling', 'completed', 'cancelled']),
});

export const searchTripsQuerySchema = z.object({
  q: z.string().max(150).trim().optional(),
  source: z.string().max(150).trim().optional(),
  destination: z.string().max(150).trim().optional(),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  transportType: z.enum(['train', 'bus', 'flight', 'cab', 'personal_vehicle', 'other']).optional(),
  status: z.enum(['planning', 'confirmed', 'upcoming', 'travelling', 'completed', 'cancelled']).optional(),
  genderPreference: z.enum(['any', 'same_gender']).optional(),
  excludeMe: z.coerce.boolean().optional(),
  includeMyTrips: z.coerce.boolean().optional(),
  includeMine: z.coerce.boolean().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(500).default(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createRecurringTripSchema = z.object({
  source: locationPointSchema,
  destination: locationPointSchema,
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1, 'Select at least one day of the week'),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in 24-hour HH:MM format'),
  transportType: z.enum(['train', 'bus', 'flight', 'cab', 'personal_vehicle', 'other']),
  preferences: tripPreferencesSchema.default({ genderPreference: 'any' }),
});
