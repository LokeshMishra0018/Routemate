import { ObjectId } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { MatchDocument, MatchStatus } from './matching.types.js';

export class MatchingRepository {
  private get collection() {
    return getDb().collection<MatchDocument>(COLLECTIONS.MATCHES);
  }

  async upsertMatch(data: Omit<MatchDocument, '_id'>): Promise<MatchDocument> {
    const filter = {
      tripId: data.tripId,
      candidateTripId: data.candidateTripId,
    };

    const update = {
      $set: {
        userId: data.userId,
        candidateUserId: data.candidateUserId,
        score: data.score,
        routeScore: data.routeScore,
        destinationScore: data.destinationScore,
        dateScore: data.dateScore,
        timeScore: data.timeScore,
        transportScore: data.transportScore,
        preferenceScore: data.preferenceScore,
        explanation: data.explanation,
        status: data.status,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: data.createdAt || new Date(),
      },
    };

    const result = await this.collection.findOneAndUpdate(filter, update, {
      upsert: true,
      returnDocument: 'after',
    });

    return result as MatchDocument;
  }

  async findMatchesByTripId(
    tripId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ items: MatchDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const filter = { tripId, status: { $ne: 'dismissed' as const } };

    const [items, totalCount] = await Promise.all([
      this.collection.find(filter).sort({ score: -1, createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async findMatchesByUserId(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ items: MatchDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const filter = { userId, status: { $ne: 'dismissed' as const } };

    const [items, totalCount] = await Promise.all([
      this.collection.find(filter).sort({ score: -1, createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async findMatchById(id: string): Promise<MatchDocument | null> {
    try {
      return this.collection.findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  }

  async updateMatchStatus(id: string, userId: string, status: MatchStatus): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(id), userId },
      { $set: { status, updatedAt: new Date() } }
    );
  }
}

export const matchingRepository = new MatchingRepository();
