import { describe, it, expect } from 'vitest';
import { REQUIRED_INDEXES } from '../../src/db/indexes.js';
import { COLLECTIONS } from '../../src/db/collections.js';

describe('MongoDB Required Indexes Specification', () => {
  it('should define indexes for all required core collections', () => {
    const indexedCollections = new Set(REQUIRED_INDEXES.map((idx) => idx.collection));

    expect(indexedCollections.has(COLLECTIONS.USERS)).toBe(true);
    expect(indexedCollections.has(COLLECTIONS.PROFILES)).toBe(true);
    expect(indexedCollections.has(COLLECTIONS.COLLEGES)).toBe(true);
    expect(indexedCollections.has(COLLECTIONS.VERIFICATION_REQUESTS)).toBe(true);
    expect(indexedCollections.has(COLLECTIONS.TRIPS)).toBe(true);
    expect(indexedCollections.has(COLLECTIONS.MATCHES)).toBe(true);
    expect(indexedCollections.has(COLLECTIONS.CONNECTIONS)).toBe(true);
    expect(indexedCollections.has(COLLECTIONS.MESSAGES)).toBe(true);
    expect(indexedCollections.has(COLLECTIONS.NOTIFICATIONS)).toBe(true);
    expect(indexedCollections.has(COLLECTIONS.REPORTS)).toBe(true);
    expect(indexedCollections.has(COLLECTIONS.BLOCKS)).toBe(true);
    expect(indexedCollections.has(COLLECTIONS.SESSIONS)).toBe(true);
  });

  it('should include 2dsphere indexes for trip source and destination coordinates', () => {
    const geoIndexes = REQUIRED_INDEXES.filter(
      (idx) =>
        idx.collection === COLLECTIONS.TRIPS &&
        (idx.indexSpec['source.coordinates'] === '2dsphere' ||
          idx.indexSpec['destination.coordinates'] === '2dsphere')
    );

    expect(geoIndexes.length).toBe(2);
  });

  it('should enforce unique indexes on user email and college domain', () => {
    const userEmailIndex = REQUIRED_INDEXES.find(
      (idx) => idx.collection === COLLECTIONS.USERS && idx.indexSpec.emailNormalized === 1
    );
    expect(userEmailIndex?.options?.unique).toBe(true);

    const collegeDomainIndex = REQUIRED_INDEXES.find(
      (idx) => idx.collection === COLLECTIONS.COLLEGES && idx.indexSpec.domain === 1
    );
    expect(collegeDomainIndex?.options?.unique).toBe(true);
  });
});
