import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { messagingRepository } from './messaging.repository.js';
import { usersService } from '../users/users.service.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { emitToConversation } from '../../lib/socket.js';
import {
  ConversationDocument,
  MessageDocument,
  ConversationResponseDto,
  MessageResponseDto,
  MessageType,
} from './messaging.types.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';

export class MessagingService {
  private async formatConversationDto(conv: ConversationDocument, userId: string): Promise<ConversationResponseDto> {
    const [profiles, unreadCount] = await Promise.all([
      Promise.all(conv.participants.map((pid) => usersService.getPublicProfile(pid).catch(() => null))),
      messagingRepository.countUnreadMessages(conv._id.toHexString(), userId),
    ]);

    const participantProfiles = profiles.filter((p): p is NonNullable<typeof p> => p !== null);

    return {
      id: conv._id.toHexString(),
      type: conv.type,
      participants: conv.participants,
      participantProfiles,
      createdBy: conv.createdBy,
      tripId: conv.tripId || null,
      groupId: conv.groupId || null,
      lastMessageAt: conv.lastMessageAt.toISOString(),
      lastMessage: conv.lastMessage || null,
      unreadCount,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    };
  }

  private async formatMessageDto(msg: MessageDocument, currentUserId: string): Promise<MessageResponseDto> {
    const sender = await usersService.getPublicProfile(msg.senderId).catch(() => null);

    return {
      id: msg._id.toHexString(),
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      body: msg.body,
      messageType: msg.messageType,
      readBy: msg.readBy,
      isRead: msg.readBy.includes(currentUserId),
      sender,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
    };
  }

  /**
   * List conversations for user
   */
  async listConversations(userId: string, page = 1, pageSize = 20) {
    const { items, totalCount } = await messagingRepository.findConversationsByUser(userId, page, pageSize);
    const formatted = await Promise.all(items.map((c) => this.formatConversationDto(c, userId)));

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

  /**
   * Get single conversation details
   */
  async getConversationById(userId: string, conversationId: string): Promise<ConversationResponseDto> {
    const conv = await messagingRepository.findConversationById(conversationId);
    if (!conv) {
      throw new NotFoundError('Conversation not found');
    }

    if (!conv.participants.includes(userId)) {
      throw new ForbiddenError('You do not have permission to access this conversation');
    }

    return this.formatConversationDto(conv, userId);
  }

  /**
   * List messages in a conversation and mark them read
   */
  async listMessages(userId: string, conversationId: string, page = 1, pageSize = 50) {
    const conv = await messagingRepository.findConversationById(conversationId);
    if (!conv) {
      throw new NotFoundError('Conversation not found');
    }

    if (!conv.participants.includes(userId)) {
      throw new ForbiddenError('You do not have permission to access this conversation');
    }

    // Mark messages as read for this user
    await messagingRepository.markMessagesAsRead(conversationId, userId);

    const { items, totalCount } = await messagingRepository.findMessagesByConversation(
      conversationId,
      page,
      pageSize
    );

    const formatted = await Promise.all(items.map((m) => this.formatMessageDto(m, userId)));

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

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    senderId: string,
    conversationId: string,
    body: string,
    messageType: MessageType = 'text'
  ): Promise<MessageResponseDto> {
    const conv = await messagingRepository.findConversationById(conversationId);
    if (!conv) {
      throw new NotFoundError('Conversation not found');
    }

    if (!conv.participants.includes(senderId)) {
      throw new ForbiddenError('You are not a participant of this conversation');
    }

    const db = getDb();

    // If direct chat, check block status between participants
    if (conv.type === 'direct') {
      const otherParticipantId = conv.participants.find((p) => p !== senderId);
      if (otherParticipantId) {
        const block = await db.collection(COLLECTIONS.BLOCKS).findOne({
          $or: [
            { blockerId: senderId, blockedUserId: otherParticipantId },
            { blockerId: otherParticipantId, blockedUserId: senderId },
          ],
        });
        if (block) {
          throw new ForbiddenError('Cannot send message to blocked user');
        }
      }
    }

    // 1. Create message
    const msg = await messagingRepository.createMessage({
      conversationId,
      senderId,
      body,
      messageType,
      readBy: [senderId], // Sender has automatically read their own message
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    // 2. Update conversation preview
    await messagingRepository.updateConversationLastMessage(conversationId, {
      id: msg._id.toHexString(),
      senderId,
      body,
      createdAt: msg.createdAt.toISOString(),
    });

    const dto = await this.formatMessageDto(msg, senderId);

    // 3. Emit realtime event to conversation room
    emitToConversation(conversationId, 'new_message', dto);

    // 4. Send notification to offline/other participants
    const senderProfile = await usersService.getPublicProfile(senderId).catch(() => null);
    const otherParticipants = conv.participants.filter((p) => p !== senderId);

    for (const recipientId of otherParticipants) {
      await notificationsService.createNotification({
        userId: recipientId,
        type: 'new_message',
        title: senderProfile?.fullName ? `New message from ${senderProfile.fullName}` : 'New Message',
        body: body.length > 80 ? `${body.substring(0, 77)}...` : body,
        data: {
          conversationId,
          messageId: msg._id.toHexString(),
          senderId,
        },
      });
    }

    return dto;
  }

  /**
   * Mark all messages in conversation as read
   */
  async markConversationAsRead(userId: string, conversationId: string): Promise<{ markedCount: number }> {
    const conv = await messagingRepository.findConversationById(conversationId);
    if (!conv) {
      throw new NotFoundError('Conversation not found');
    }

    if (!conv.participants.includes(userId)) {
      throw new ForbiddenError('You are not a participant of this conversation');
    }

    const count = await messagingRepository.markMessagesAsRead(conversationId, userId);
    return { markedCount: count };
  }
}

export const messagingService = new MessagingService();
