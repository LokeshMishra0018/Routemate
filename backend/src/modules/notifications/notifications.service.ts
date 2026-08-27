import { notificationsRepository } from './notifications.repository.js';
import { NotificationDocument, NotificationResponseDto, NotificationType } from './notifications.types.js';
import { emitToUser } from '../../lib/socket.js';
import { NotFoundError } from '../../utils/errors.js';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
}

export class NotificationsService {
  private formatNotificationDto(doc: NotificationDocument): NotificationResponseDto {
    return {
      id: doc._id.toHexString(),
      userId: doc.userId,
      type: doc.type,
      title: doc.title,
      body: doc.body,
      data: doc.data || null,
      readAt: doc.readAt ? doc.readAt.toISOString() : null,
      isRead: !!doc.readAt,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  /**
   * Create and deliver a notification
   */
  async createNotification(input: CreateNotificationInput): Promise<NotificationResponseDto> {
    const doc = await notificationsRepository.createNotification({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data || null,
      readAt: null,
      createdAt: new Date(),
    });

    const dto = this.formatNotificationDto(doc);

    // Emit live event via Socket.IO
    emitToUser(input.userId, 'notification:new', dto);

    return dto;
  }

  /**
   * List user notifications with unread count
   */
  async listNotifications(userId: string, unreadOnly = false, page = 1, pageSize = 20) {
    const { items, totalCount, unreadCount } = await notificationsRepository.findNotificationsByUser(
      userId,
      unreadOnly,
      page,
      pageSize
    );

    const formatted = items.map((n) => this.formatNotificationDto(n));

    return {
      items: formatted,
      unreadCount,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        hasNextPage: page * pageSize < totalCount,
      },
    };
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<NotificationResponseDto> {
    const updated = await notificationsRepository.markAsRead(notificationId, userId);
    if (!updated) {
      throw new NotFoundError('Notification not found');
    }
    return this.formatNotificationDto(updated);
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<{ markedCount: number }> {
    const count = await notificationsRepository.markAllAsRead(userId);
    return { markedCount: count };
  }
}

export const notificationsService = new NotificationsService();
