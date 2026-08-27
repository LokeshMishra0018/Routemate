import { ObjectId, Filter } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { ConnectionDocument, ConnectionStatus } from './connections.types.js';

export class ConnectionsRepository {
  private get collection() {
    return getDb().collection<ConnectionDocument>(COLLECTIONS.CONNECTIONS);
  }

  async createConnection(data: Omit<ConnectionDocument, '_id'>): Promise<ConnectionDocument> {
    const doc: ConnectionDocument = {
      _id: new ObjectId(),
      ...data,
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async findConnectionById(id: string): Promise<ConnectionDocument | null> {
    try {
      return this.collection.findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  }

  async findExistingActiveConnection(
    requesterId: string,
    recipientId: string,
    tripId: string
  ): Promise<ConnectionDocument | null> {
    return this.collection.findOne({
      requesterId,
      recipientId,
      tripId,
      status: { $in: ['pending', 'accepted'] },
    });
  }

  async updateConnectionStatus(
    id: string,
    status: ConnectionStatus,
    conversationId?: string | null
  ): Promise<ConnectionDocument | null> {
    const updateObj: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };
    if (conversationId) {
      updateObj.conversationId = conversationId;
    }

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateObj },
      { returnDocument: 'after' }
    );

    return result as ConnectionDocument | null;
  }

  async findConnectionsByUser(
    userId: string,
    type: 'incoming' | 'outgoing' | 'all' = 'all',
    status?: ConnectionStatus,
    page = 1,
    pageSize = 20
  ): Promise<{ items: ConnectionDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const filter: Filter<ConnectionDocument> = {};

    if (type === 'incoming') {
      filter.recipientId = userId;
    } else if (type === 'outgoing') {
      filter.requesterId = userId;
    } else {
      filter.$or = [{ requesterId: userId }, { recipientId: userId }];
    }

    if (status) {
      filter.status = status;
    }

    const [items, totalCount] = await Promise.all([
      this.collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { items, totalCount };
  }
}

export const connectionsRepository = new ConnectionsRepository();
