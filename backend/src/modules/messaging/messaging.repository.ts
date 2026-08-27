import { ObjectId } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { ConversationDocument, MessageDocument, LastMessagePreview } from './messaging.types.js';

export class MessagingRepository {
  private get conversations() {
    return getDb().collection<ConversationDocument>(COLLECTIONS.CONVERSATIONS);
  }

  private get messages() {
    return getDb().collection<MessageDocument>(COLLECTIONS.MESSAGES);
  }

  async findConversationById(id: string): Promise<ConversationDocument | null> {
    try {
      return this.conversations.findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  }

  async findConversationsByUser(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ items: ConversationDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const filter = { participants: userId };

    const [items, totalCount] = await Promise.all([
      this.conversations.find(filter).sort({ lastMessageAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.conversations.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async updateConversationLastMessage(id: string, preview: LastMessagePreview): Promise<void> {
    await this.conversations.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          lastMessage: preview,
          lastMessageAt: new Date(preview.createdAt),
          updatedAt: new Date(),
        },
      }
    );
  }

  // Messages
  async createMessage(data: Omit<MessageDocument, '_id'>): Promise<MessageDocument> {
    const doc: MessageDocument = {
      _id: new ObjectId(),
      ...data,
    };
    await this.messages.insertOne(doc);
    return doc;
  }

  async findMessagesByConversation(
    conversationId: string,
    page = 1,
    pageSize = 50
  ): Promise<{ items: MessageDocument[]; totalCount: number }> {
    const skip = (page - 1) * pageSize;
    const filter = { conversationId, deletedAt: null };

    const [items, totalCount] = await Promise.all([
      this.messages.find(filter).sort({ createdAt: 1 }).skip(skip).limit(pageSize).toArray(),
      this.messages.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<number> {
    const result = await this.messages.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        readBy: { $ne: userId },
      },
      {
        $addToSet: { readBy: userId },
        $set: { updatedAt: new Date() },
      }
    );
    return result.modifiedCount;
  }

  async countUnreadMessages(conversationId: string, userId: string): Promise<number> {
    return this.messages.countDocuments({
      conversationId,
      senderId: { $ne: userId },
      readBy: { $ne: userId },
      deletedAt: null,
    });
  }
}

export const messagingRepository = new MessagingRepository();
