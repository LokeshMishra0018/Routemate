import { Filter } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { TripDocument } from '../trips/trips.types.js';

export interface CandidateQueryOptions {
  limit?: number;
}

/**
 * Retrieves a bounded, filtered set of candidate trips for match calculation
 */
export async function retrieveCandidatesForTrip(
  targetTrip: TripDocument,
  options: CandidateQueryOptions = {}
): Promise<TripDocument[]> {
  const db = getDb();
  const limit = options.limit || 50;

  // 1. Fetch blocked user IDs (bidirectional)
  const blocks = await db
    .collection(COLLECTIONS.BLOCKS)
    .find({
      $or: [{ blockerId: targetTrip.userId }, { blockedUserId: targetTrip.userId }],
    })
    .toArray();

  const blockedUserIds = new Set<string>();
  for (const b of blocks) {
    if (b.blockerId === targetTrip.userId) blockedUserIds.add(b.blockedUserId);
    if (b.blockedUserId === targetTrip.userId) blockedUserIds.add(b.blockerId);
  }

  // 2. Fetch suspended user IDs
  const suspendedUsers = await db
    .collection(COLLECTIONS.USERS)
    .find({ status: { $ne: 'active' } }, { projection: { _id: 1 } })
    .toArray();

  for (const u of suspendedUsers) {
    blockedUserIds.add(u._id.toHexString());
  }

  // Exclude target user himself as well
  const excludedUserIds = Array.from(blockedUserIds);
  excludedUserIds.push(targetTrip.userId);

  // 3. Compute date window (target travelDate ± 1 day)
  const targetDateObj = new Date(`${targetTrip.travelDate}T00:00:00Z`);
  const prevDate = new Date(targetDateObj.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextDate = new Date(targetDateObj.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const candidateQuery: Filter<TripDocument> = {
    userId: { $nin: excludedUserIds },
    status: { $in: ['planning', 'confirmed', 'upcoming'] },
    travelDate: { $in: [prevDate, targetTrip.travelDate, nextDate] },
  };

  const candidates = await db
    .collection<TripDocument>(COLLECTIONS.TRIPS)
    .find(candidateQuery)
    .limit(limit)
    .toArray();

  return candidates;
}
