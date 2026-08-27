import { ObjectId } from 'mongodb';

export type NotificationType =
  | 'new_match'
  | 'connection_request'
  | 'connection_accepted'
  | 'new_message'
  | 'verification_update'
  | 'trip_reminder'
  | 'review_available'
  | 'group_invitation'
  | 'report_update';

export interface NotificationDocument {
  _id: ObjectId;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  readAt?: Date | null;
  createdAt: Date;
}

export interface NotificationResponseDto {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  isRead: boolean;
  createdAt: string;
}
