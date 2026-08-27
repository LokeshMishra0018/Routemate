import { ObjectId } from 'mongodb';
import { PublicProfileDto } from '../users/users.types.js';

export type ConversationType = 'direct' | 'group';
export type MessageType = 'text' | 'system';

export interface LastMessagePreview {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface ConversationDocument {
  _id: ObjectId;
  type: ConversationType;
  participants: string[];
  createdBy: string;
  tripId?: string | null;
  groupId?: string | null;
  lastMessageAt: Date;
  lastMessage?: LastMessagePreview | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageDocument {
  _id: ObjectId;
  conversationId: string;
  senderId: string;
  body: string;
  messageType: MessageType;
  readBy: string[]; // User IDs who have read this message
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface MessageResponseDto {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  messageType: MessageType;
  readBy: string[];
  isRead: boolean;
  sender?: PublicProfileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationResponseDto {
  id: string;
  type: ConversationType;
  participants: string[];
  participantProfiles?: PublicProfileDto[];
  createdBy: string;
  tripId?: string | null;
  groupId?: string | null;
  lastMessageAt: string;
  lastMessage?: LastMessagePreview | null;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}
