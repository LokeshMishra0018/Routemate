import { Filter } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { AdminActionDocument } from './admin.types.js';
import { UserDocument } from '../users/users.types.js';

export class AdminRepository {
  private get adminActionsCollection() {
    return getDb().collection<AdminActionDocument>(COLLECTIONS.ADMIN_ACTIONS);
  }

  private get usersCollection() {
    return getDb().collection<UserDocument>(COLLECTIONS.USERS);
  }

  async logAction(action: Omit<AdminActionDocument, '_id'>): Promise<void> {
    await this.adminActionsCollection.insertOne(action as AdminActionDocument);
  }

  async findAuditLogs(page = 1, pageSize = 20): Promise<{ items: AdminActionDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const [items, totalCount] = await Promise.all([
      this.adminActionsCollection.find().sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.adminActionsCollection.countDocuments(),
    ]);

    return { items, totalCount };
  }

  async findUsers(
    filter: Filter<UserDocument> = {},
    page = 1,
    pageSize = 20
  ): Promise<{ items: UserDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const [items, totalCount] = await Promise.all([
      this.usersCollection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.usersCollection.countDocuments(filter),
    ]);

    return { items, totalCount };
  }
}

export const adminRepository = new AdminRepository();
