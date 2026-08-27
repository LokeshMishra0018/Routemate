import { ObjectId, Filter } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { GroupDocument, GroupMemberDocument, GroupMemberStatus } from './groups.types.js';

export class GroupsRepository {
  private get groups() {
    return getDb().collection<GroupDocument>(COLLECTIONS.GROUPS);
  }

  private get members() {
    return getDb().collection<GroupMemberDocument>(COLLECTIONS.GROUP_MEMBERS);
  }

  async createGroup(data: Omit<GroupDocument, '_id'>): Promise<GroupDocument> {
    const doc: GroupDocument = {
      _id: new ObjectId(),
      ...data,
    };
    await this.groups.insertOne(doc);
    return doc;
  }

  async findGroupById(id: string): Promise<GroupDocument | null> {
    try {
      return this.groups.findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  }

  async updateGroup(id: string, updates: Partial<GroupDocument>): Promise<GroupDocument | null> {
    const result = await this.groups.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result as GroupDocument | null;
  }

  /**
   * Atomically joins group only if capacity is not exceeded and group is open
   */
  async atomicIncrementMemberCount(groupId: string, newPerPersonCost: number): Promise<GroupDocument | null> {
    const result = await this.groups.findOneAndUpdate(
      {
        _id: new ObjectId(groupId),
        status: 'open',
        $expr: { $lt: ['$currentMemberCount', '$maxCapacity'] },
      },
      {
        $inc: { currentMemberCount: 1 },
        $set: { 'costSharing.perPersonCost': newPerPersonCost, updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );
    return result as GroupDocument | null;
  }

  async atomicDecrementMemberCount(groupId: string, newPerPersonCost: number): Promise<GroupDocument | null> {
    const result = await this.groups.findOneAndUpdate(
      {
        _id: new ObjectId(groupId),
        currentMemberCount: { $gt: 1 },
      },
      {
        $inc: { currentMemberCount: -1 },
        $set: { 'costSharing.perPersonCost': newPerPersonCost, updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );
    return result as GroupDocument | null;
  }

  async findGroups(
    filter: Filter<GroupDocument>,
    page = 1,
    pageSize = 20
  ): Promise<{ items: GroupDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const [items, totalCount] = await Promise.all([
      this.groups.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.groups.countDocuments(filter),
    ]);
    return { items, totalCount };
  }

  // Group Members operations
  async addMember(data: Omit<GroupMemberDocument, '_id'>): Promise<GroupMemberDocument> {
    const doc: GroupMemberDocument = {
      _id: new ObjectId(),
      ...data,
    };
    await this.members.insertOne(doc);
    return doc;
  }

  async findMember(groupId: string, userId: string): Promise<GroupMemberDocument | null> {
    return this.members.findOne({ groupId, userId, status: 'active' });
  }

  async findActiveMembers(groupId: string): Promise<GroupMemberDocument[]> {
    return this.members.find({ groupId, status: 'active' }).toArray();
  }

  async updateMemberStatus(
    groupId: string,
    userId: string,
    status: GroupMemberStatus
  ): Promise<GroupMemberDocument | null> {
    const result = await this.members.findOneAndUpdate(
      { groupId, userId, status: 'active' },
      { $set: { status, leftAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result as GroupMemberDocument | null;
  }
}

export const groupsRepository = new GroupsRepository();
