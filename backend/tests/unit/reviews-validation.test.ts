import { describe, it, expect } from 'vitest';
import { createReviewSchema } from '../../src/modules/reviews/reviews.schemas.js';
import { createReportSchema, createEmergencyContactSchema, triggerSosSchema } from '../../src/modules/safety/safety.schemas.js';

describe('Phase 7 Validation Schemas (Unit)', () => {
  it('should validate a valid review schema', () => {
    const valid = {
      reviewedUserId: '6a9068d1ba7f4e33f8121c3e',
      tripId: '6a9068d1ba7f4e33f8121c3f',
      rating: 5,
      cleanlinessRating: 5,
      punctualityRating: 4,
      communicationRating: 5,
      comment: 'Great commuter companion!',
      tags: ['punctual', 'friendly'],
    };
    const parsed = createReviewSchema.parse(valid);
    expect(parsed.rating).toBe(5);
  });

  it('should reject invalid review rating boundaries (e.g. 0 or 6)', () => {
    expect(() =>
      createReviewSchema.parse({
        reviewedUserId: '6a9068d1ba7f4e33f8121c3e',
        tripId: '6a9068d1ba7f4e33f8121c3f',
        rating: 6,
      })
    ).toThrow();

    expect(() =>
      createReviewSchema.parse({
        reviewedUserId: '6a9068d1ba7f4e33f8121c3e',
        tripId: '6a9068d1ba7f4e33f8121c3f',
        rating: 0,
      })
    ).toThrow();
  });

  it('should validate emergency contact and reject invalid phone number', () => {
    const valid = {
      name: 'Priya Sharma',
      phone: '9876543210',
      relationship: 'Mother',
      isPrimary: true,
    };
    expect(createEmergencyContactSchema.parse(valid).phone).toBe('9876543210');

    // Invalid phone numbers
    expect(() => createEmergencyContactSchema.parse({ ...valid, phone: '12345' })).toThrow();
    expect(() => createEmergencyContactSchema.parse({ ...valid, phone: '5123456789' })).toThrow();
  });

  it('should validate safety report schema', () => {
    const valid = {
      category: 'harassment',
      reason: 'User behaved aggressively during the ride.',
    };
    expect(createReportSchema.parse(valid).category).toBe('harassment');

    // Reason too short
    expect(() => createReportSchema.parse({ category: 'harassment', reason: 'bad' })).toThrow();
  });

  it('should validate SOS trigger schema', () => {
    const valid = {
      tripId: '6a9068d1ba7f4e33f8121c3f',
      location: {
        type: 'Point' as const,
        coordinates: [77.4304, 28.6692] as [number, number],
      },
    };
    expect(triggerSosSchema.parse(valid).location?.type).toBe('Point');
  });
});
