import { ObjectId, Filter } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { NotificationDocument } from './notifications.types.js';

export class NotificationsRepository {
  private get collection() {
    return getDb().collection<NotificationDocument>(COLLECTIONS.NOTIFICATIONS);
  }

  async createNotification(data: Omit<NotificationDocument, '_id'>): Promise<NotificationDocument> {
    const doc: NotificationDocument = {
      _id: new ObjectId(),
      ...data,
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async findNotificationsByUser(
    userId: string,
    unreadOnly = false,
    page = 1,
    pageSize = 20
  ): Promise<{ items: NotificationDocument[]; totalCount: number; unreadCount: number }> {
    const skip = (page - 1) * pageSize;
    const filter: Filter<NotificationDocument> = { userId };
    if (unreadOnly) {
      filter.readAt = null;
    }

    const [items, totalCount, unreadCount] = await Promise.all([
      this.collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(filter),
      this.collection.countDocuments({ userId, readAt: null }),
    ]);

    return { items, totalCount, unreadCount };
  }

  async markAsRead(id: string, userId: string): Promise<NotificationDocument | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id), userId },
      { $set: { readAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result as NotificationDocument | null;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.collection.updateMany(
      { userId, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return result.modifiedCount;
  }
}

export const notificationsRepository = new NotificationsRepository();
