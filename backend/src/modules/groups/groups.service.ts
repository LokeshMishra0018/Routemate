import { ObjectId, Filter } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { groupsRepository } from './groups.repository.js';
import { usersService } from '../users/users.service.js';
import { tripsRepository } from '../trips/trips.repository.js';
import { calculatePerPersonCost } from './cost-calculator.js';
import { GroupDocument, GroupResponseDto, GroupMemberDto } from './groups.types.js';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors.js';

export interface CreateGroupInput {
  name: string;
  description?: string | null;
  tripId?: string | null;
  maxCapacity: number;
  costSharing: {
    enabled: boolean;
    estimatedTotalCost: number;
    currency: string;
  };
}

export interface UpdateGroupInput {
  name?: string;
  description?: string | null;
  maxCapacity?: number;
  status?: 'open' | 'closed' | 'completed';
  costSharing?: {
    enabled?: boolean;
    estimatedTotalCost?: number;
    currency?: string;
  };
}

export class GroupsService {
  private async formatGroupDto(group: GroupDocument): Promise<GroupResponseDto> {
    const [owner, memberDocs] = await Promise.all([
      usersService.getPublicProfile(group.ownerId).catch(() => null),
      groupsRepository.findActiveMembers(group._id.toHexString()),
    ]);

    const members: GroupMemberDto[] = await Promise.all(
      memberDocs.map(async (m) => {
        const user = await usersService.getPublicProfile(m.userId).catch(() => null);
        return {
          id: m._id.toHexString(),
          userId: m.userId,
          role: m.role,
          status: m.status,
          joinedAt: m.joinedAt.toISOString(),
          user,
        };
      })
    );

    return {
      id: group._id.toHexString(),
      name: group.name,
      description: group.description,
      ownerId: group.ownerId,
      tripId: group.tripId,
      conversationId: group.conversationId,
      maxCapacity: group.maxCapacity,
      currentMemberCount: group.currentMemberCount,
      status: group.status,
      costSharing: group.costSharing,
      owner,
      members,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new travel group
   */
  async createGroup(ownerId: string, input: CreateGroupInput): Promise<GroupResponseDto> {
    if (input.tripId) {
      const trip = await tripsRepository.findTripById(input.tripId);
      if (!trip) {
        throw new NotFoundError('Associated trip not found');
      }
    }

    const perPersonCost = input.costSharing.enabled
      ? calculatePerPersonCost(input.costSharing.estimatedTotalCost, 1)
      : 0;

    const db = getDb();

    // 1. Create group conversation
    const conversationId = new ObjectId();
    await db.collection(COLLECTIONS.CONVERSATIONS).insertOne({
      _id: conversationId,
      type: 'group',
      participants: [ownerId],
      createdBy: ownerId,
      tripId: input.tripId || null,
      groupId: null, // Will update below
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Create group document
    const group = await groupsRepository.createGroup({
      name: input.name,
      description: input.description || null,
      ownerId,
      tripId: input.tripId || null,
      conversationId: conversationId.toHexString(),
      maxCapacity: input.maxCapacity,
      currentMemberCount: 1,
      status: 'open',
      costSharing: {
        enabled: input.costSharing.enabled,
        estimatedTotalCost: input.costSharing.estimatedTotalCost,
        currency: input.costSharing.currency || 'INR',
        perPersonCost,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update conversation with groupId
    await db.collection(COLLECTIONS.CONVERSATIONS).updateOne(
      { _id: conversationId },
      { $set: { groupId: group._id.toHexString() } }
    );

    // 3. Add owner as first member
    await groupsRepository.addMember({
      groupId: group._id.toHexString(),
      userId: ownerId,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    });

    return this.formatGroupDto(group);
  }

  /**
   * Join an open group
   */
  async joinGroup(userId: string, groupId: string): Promise<GroupResponseDto> {
    const group = await groupsRepository.findGroupById(groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    if (group.status !== 'open') {
      throw new BadRequestError('Group is closed or completed');
    }

    // Check if user is already a member
    const existing = await groupsRepository.findMember(groupId, userId);
    if (existing) {
      throw new ConflictError('You are already a member of this group');
    }

    const db = getDb();

    // Check bidirectional block with owner
    const block = await db.collection(COLLECTIONS.BLOCKS).findOne({
      $or: [
        { blockerId: userId, blockedUserId: group.ownerId },
        { blockerId: group.ownerId, blockedUserId: userId },
      ],
    });
    if (block) {
      throw new ForbiddenError('You cannot join this group due to user block settings');
    }

    // Calculate new perPersonCost
    const newMemberCount = group.currentMemberCount + 1;
    const newPerPersonCost = group.costSharing.enabled
      ? calculatePerPersonCost(group.costSharing.estimatedTotalCost, newMemberCount)
      : 0;

    // Atomically increment member count with capacity check
    const updatedGroup = await groupsRepository.atomicIncrementMemberCount(groupId, newPerPersonCost);
    if (!updatedGroup) {
      throw new ConflictError('Group has reached maximum capacity or is no longer open');
    }

    // Add member record
    await groupsRepository.addMember({
      groupId,
      userId,
      role: 'member',
      status: 'active',
      joinedAt: new Date(),
    });

    // Add user to group conversation participants
    if (group.conversationId) {
      await db.collection(COLLECTIONS.CONVERSATIONS).updateOne(
        { _id: new ObjectId(group.conversationId) },
        { $addToSet: { participants: userId }, $set: { updatedAt: new Date() } }
      );
    }

    // Notify owner
    await db.collection(COLLECTIONS.NOTIFICATIONS).insertOne({
      userId: group.ownerId,
      type: 'group_invitation',
      title: 'New Group Member',
      body: `A new student joined "${group.name}"`,
      data: { groupId, userId },
      readAt: null,
      createdAt: new Date(),
    });

    return this.formatGroupDto(updatedGroup);
  }

  /**
   * Leave a group
   */
  async leaveGroup(userId: string, groupId: string): Promise<{ message: string }> {
    const group = await groupsRepository.findGroupById(groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    const member = await groupsRepository.findMember(groupId, userId);
    if (!member) {
      throw new BadRequestError('You are not an active member of this group');
    }

    if (member.role === 'owner') {
      throw new BadRequestError('Group owner cannot leave the group. You may close the group instead.');
    }

    // Update member status to left
    await groupsRepository.updateMemberStatus(groupId, userId, 'left');

    // Recalculate cost
    const newMemberCount = Math.max(1, group.currentMemberCount - 1);
    const newPerPersonCost = group.costSharing.enabled
      ? calculatePerPersonCost(group.costSharing.estimatedTotalCost, newMemberCount)
      : 0;

    await groupsRepository.atomicDecrementMemberCount(groupId, newPerPersonCost);

    // Remove from conversation participants
    if (group.conversationId) {
      await getDb()
        .collection(COLLECTIONS.CONVERSATIONS)
        .updateOne(
          { _id: new ObjectId(group.conversationId) },
          { $pull: { participants: userId as never }, $set: { updatedAt: new Date() } }
        );
    }

    return { message: 'Successfully left the group' };
  }

  /**
   * Remove a member (owner only)
   */
  async removeMember(ownerId: string, groupId: string, targetUserId: string): Promise<{ message: string }> {
    const group = await groupsRepository.findGroupById(groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    if (group.ownerId !== ownerId) {
      throw new ForbiddenError('Only the group owner can remove members');
    }

    if (ownerId === targetUserId) {
      throw new BadRequestError('Group owner cannot remove themselves');
    }

    const member = await groupsRepository.findMember(groupId, targetUserId);
    if (!member) {
      throw new NotFoundError('Target user is not an active member of this group');
    }

    await groupsRepository.updateMemberStatus(groupId, targetUserId, 'removed');

    const newMemberCount = Math.max(1, group.currentMemberCount - 1);
    const newPerPersonCost = group.costSharing.enabled
      ? calculatePerPersonCost(group.costSharing.estimatedTotalCost, newMemberCount)
      : 0;

    await groupsRepository.atomicDecrementMemberCount(groupId, newPerPersonCost);

    return { message: 'Member removed successfully' };
  }

  /**
   * Update group settings (owner only)
   */
  async updateGroup(ownerId: string, groupId: string, input: UpdateGroupInput): Promise<GroupResponseDto> {
    const group = await groupsRepository.findGroupById(groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    if (group.ownerId !== ownerId) {
      throw new ForbiddenError('Only the group owner can update group settings');
    }

    const updates: Partial<GroupDocument> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.status !== undefined) updates.status = input.status;
    if (input.maxCapacity !== undefined) {
      if (input.maxCapacity < group.currentMemberCount) {
        throw new BadRequestError('Cannot reduce capacity below current active member count');
      }
      updates.maxCapacity = input.maxCapacity;
    }

    if (input.costSharing !== undefined) {
      const mergedCost = {
        enabled: input.costSharing.enabled ?? group.costSharing.enabled,
        estimatedTotalCost: input.costSharing.estimatedTotalCost ?? group.costSharing.estimatedTotalCost,
        currency: input.costSharing.currency ?? group.costSharing.currency,
      };

      const perPersonCost = mergedCost.enabled
        ? calculatePerPersonCost(mergedCost.estimatedTotalCost, group.currentMemberCount)
        : 0;

      updates.costSharing = {
        ...mergedCost,
        perPersonCost,
      };
    }

    const updated = await groupsRepository.updateGroup(groupId, updates);
    return this.formatGroupDto(updated!);
  }

  /**
   * Get single group details
   */
  async getGroupById(groupId: string): Promise<GroupResponseDto> {
    const group = await groupsRepository.findGroupById(groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }
    return this.formatGroupDto(group);
  }

  /**
   * Search & List groups
   */
  async listGroups(
    search?: string,
    status?: 'open' | 'closed' | 'completed',
    tripId?: string,
    page = 1,
    pageSize = 20
  ) {
    const filter: Filter<GroupDocument> = {};
    if (status) filter.status = status;
    if (tripId) filter.tripId = tripId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const { items, totalCount } = await groupsRepository.findGroups(filter, page, pageSize);
    const formatted = await Promise.all(items.map((g) => this.formatGroupDto(g)));

    return {
      items: formatted,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        hasNextPage: page * pageSize < totalCount,
      },
    };
  }
}

export const groupsService = new GroupsService();
