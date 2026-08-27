import { ObjectId } from 'mongodb';
import { PublicProfileDto } from '../users/users.types.js';

export type GroupStatus = 'open' | 'closed' | 'completed';
export type GroupMemberRole = 'owner' | 'member';
export type GroupMemberStatus = 'active' | 'left' | 'removed';

export interface CostSharingInfo {
  enabled: boolean;
  estimatedTotalCost: number;
  currency: string;
  perPersonCost: number;
}

export interface GroupDocument {
  _id: ObjectId;
  name: string;
  description?: string | null;
  ownerId: string;
  tripId?: string | null;
  conversationId?: string | null;
  maxCapacity: number;
  currentMemberCount: number;
  status: GroupStatus;
  costSharing: CostSharingInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMemberDocument {
  _id: ObjectId;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  joinedAt: Date;
  leftAt?: Date | null;
}

export interface GroupMemberDto {
  id: string;
  userId: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  joinedAt: string;
  user?: PublicProfileDto | null;
}

export interface GroupResponseDto {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  tripId?: string | null;
  conversationId?: string | null;
  maxCapacity: number;
  currentMemberCount: number;
  status: GroupStatus;
  costSharing: CostSharingInfo;
  owner?: PublicProfileDto | null;
  members?: GroupMemberDto[];
  createdAt: string;
  updatedAt: string;
}
