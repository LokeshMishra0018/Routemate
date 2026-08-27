import { ObjectId } from 'mongodb';
import { PublicProfileDto } from '../users/users.types.js';

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'blocked';

export interface ConnectionDocument {
  _id: ObjectId;
  requesterId: string;
  recipientId: string;
  tripId: string;
  candidateTripId?: string | null;
  status: ConnectionStatus;
  message?: string | null;
  conversationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConnectionDto {
  recipientId: string;
  tripId: string;
  candidateTripId?: string | null;
  message?: string | null;
}

export interface UpdateConnectionStatusDto {
  status: 'accepted' | 'rejected' | 'cancelled';
}

export interface ConnectionResponseDto {
  id: string;
  requesterId: string;
  recipientId: string;
  tripId: string;
  candidateTripId?: string | null;
  status: ConnectionStatus;
  message?: string | null;
  conversationId?: string | null;
  requester?: PublicProfileDto | null;
  recipient?: PublicProfileDto | null;
  createdAt: string;
  updatedAt: string;
}
