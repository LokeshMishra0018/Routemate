import { describe, it, expect } from 'vitest';
import { createTripSchema, searchTripsQuerySchema } from '../../src/modules/trips/trips.schemas.js';

describe('Trip Validation Schemas (Unit)', () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  it('should accept valid trip creation payload with GeoJSON coordinates', () => {
    const payload = {
      source: {
        name: 'KIET Ghaziabad',
        coordinates: { type: 'Point' as const, coordinates: [77.4977, 28.7532] as [number, number] },
      },
      destination: {
        name: 'New Delhi Railway Station',
        coordinates: { type: 'Point' as const, coordinates: [77.2195, 28.6429] as [number, number] },
      },
      travelDate: tomorrow,
      departureTime: '08:30',
      transportType: 'train' as const,
      stops: [
        {
          name: 'Ghaziabad Junction',
          coordinates: { type: 'Point' as const, coordinates: [77.4304, 28.6692] as [number, number] },
          sequenceNumber: 1,
        },
      ],
      preferences: {
        genderPreference: 'any' as const,
        conversationPreference: 'moderate' as const,
        smokingPreference: 'no' as const,
      },
      availableSeats: 2,
    };

    const parsed = createTripSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('should reject trip with travelDate in the past', () => {
    const payload = {
      source: {
        name: 'KIET Ghaziabad',
        coordinates: { type: 'Point' as const, coordinates: [77.4977, 28.7532] as [number, number] },
      },
      destination: {
        name: 'Anand Vihar',
        coordinates: { type: 'Point' as const, coordinates: [77.3153, 28.6469] as [number, number] },
      },
      travelDate: yesterday,
      departureTime: '10:00',
      transportType: 'bus' as const,
    };

    const parsed = createTripSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain('cannot be in the past');
    }
  });

  it('should reject invalid coordinates outside [-180, 180] longitude and [-90, 90] latitude', () => {
    const payload = {
      source: {
        name: 'Invalid Longitude Location',
        coordinates: { type: 'Point' as const, coordinates: [195.0, 28.7532] as [number, number] },
      },
      destination: {
        name: 'Delhi',
        coordinates: { type: 'Point' as const, coordinates: [77.2195, 28.6429] as [number, number] },
      },
      travelDate: tomorrow,
      departureTime: '09:00',
      transportType: 'cab' as const,
    };

    const parsed = createTripSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it('should reject invalid time format', () => {
    const payload = {
      source: {
        name: 'KIET',
        coordinates: { type: 'Point' as const, coordinates: [77.4977, 28.7532] as [number, number] },
      },
      destination: {
        name: 'Delhi',
        coordinates: { type: 'Point' as const, coordinates: [77.2195, 28.6429] as [number, number] },
      },
      travelDate: tomorrow,
      departureTime: '25:99', // Invalid 24-hr time
      transportType: 'train' as const,
    };

    const parsed = createTripSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it('should parse search query parameters correctly with geospatial radius', () => {
    const query = {
      destination: 'Delhi',
      lat: '28.6429',
      lng: '77.2195',
      radiusKm: '25',
      page: '1',
      pageSize: '10',
    };

    const parsed = searchTripsQuerySchema.safeParse(query);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.lat).toBe(28.6429);
      expect(parsed.data.lng).toBe(77.2195);
      expect(parsed.data.radiusKm).toBe(25);
    }
  });
});
