import { ObjectId } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { VerificationRequestDocument } from './verification.types.js';

export class VerificationRepository {
  private get collection() {
    return getDb().collection<VerificationRequestDocument>(COLLECTIONS.VERIFICATION_REQUESTS);
  }

  async create(data: Omit<VerificationRequestDocument, '_id'>): Promise<VerificationRequestDocument> {
    const res = await this.collection.insertOne(data as VerificationRequestDocument);
    return { ...data, _id: res.insertedId };
  }

  async findById(id: string): Promise<VerificationRequestDocument | null> {
    try {
      return this.collection.findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  }

  async findLatestByUserId(userId: string): Promise<VerificationRequestDocument | null> {
    return this.collection.findOne({ userId }, { sort: { createdAt: -1 } });
  }

  async findPendingQueue(page = 1, pageSize = 20): Promise<{ items: VerificationRequestDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const filter = { status: 'pending' as const };

    const [items, totalCount] = await Promise.all([
      this.collection.find(filter).sort({ createdAt: 1 }).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async update(id: string, update: Partial<VerificationRequestDocument>): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...update, updatedAt: new Date() } }
    );
  }
}

export const verificationRepository = new VerificationRepository();
