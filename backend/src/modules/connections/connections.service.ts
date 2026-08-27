import { ObjectId } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import { COLLECTIONS } from '../../db/collections.js';
import { connectionsRepository } from './connections.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { usersService } from '../users/users.service.js';
import { tripsRepository } from '../trips/trips.repository.js';
import {
  ConnectionDocument,
  ConnectionResponseDto,
  CreateConnectionDto,
  UpdateConnectionStatusDto,
  ConnectionStatus,
} from './connections.types.js';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors.js';

export class ConnectionsService {
  private async formatConnectionDto(conn: ConnectionDocument): Promise<ConnectionResponseDto> {
    const [requester, recipient] = await Promise.all([
      usersService.getPublicProfile(conn.requesterId).catch(() => null),
      usersService.getPublicProfile(conn.recipientId).catch(() => null),
    ]);

    return {
      id: conn._id.toHexString(),
      requesterId: conn.requesterId,
      recipientId: conn.recipientId,
      tripId: conn.tripId,
      candidateTripId: conn.candidateTripId,
      status: conn.status,
      message: conn.message,
      conversationId: conn.conversationId,
      requester,
      recipient,
      createdAt: conn.createdAt.toISOString(),
      updatedAt: conn.updatedAt.toISOString(),
    };
  }

  /**
   * Sends a connection / travel join request
   */
  async createConnectionRequest(requesterId: string, dto: CreateConnectionDto): Promise<ConnectionResponseDto> {
    if (requesterId === dto.recipientId) {
      throw new BadRequestError('You cannot send a connection request to yourself');
    }

    const db = getDb();

    // 1. Verify recipient user exists and is active
    const recipientUser = await usersRepository.findUserById(dto.recipientId);
    if (!recipientUser || recipientUser.status !== 'active') {
      throw new NotFoundError('Recipient student not found or account inactive');
    }

    // 2. Check bidirectional block
    const block = await db.collection(COLLECTIONS.BLOCKS).findOne({
      $or: [
        { blockerId: requesterId, blockedUserId: dto.recipientId },
        { blockerId: dto.recipientId, blockedUserId: requesterId },
      ],
    });
    if (block) {
      throw new ForbiddenError('Unable to send connection request to this user');
    }

    // 3. Verify trip exists
    const trip = await tripsRepository.findTripById(dto.tripId);
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    // 4. Check for duplicate pending/active connection
    const existing = await connectionsRepository.findExistingActiveConnection(
      requesterId,
      dto.recipientId,
      dto.tripId
    );
    if (existing) {
      throw new ConflictError('A pending or active connection request already exists for this trip');
    }

    // 5. Create connection
    const doc = await connectionsRepository.createConnection({
      requesterId,
      recipientId: dto.recipientId,
      tripId: dto.tripId,
      candidateTripId: dto.candidateTripId || null,
      status: 'pending',
      message: dto.message || null,
      conversationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 6. Create notification for recipient
    await db.collection(COLLECTIONS.NOTIFICATIONS).insertOne({
      userId: dto.recipientId,
      type: 'connection_request',
      title: 'New Travel Request',
      body: 'A student has requested to travel with you',
      data: {
        connectionId: doc._id.toHexString(),
        requesterId,
        tripId: dto.tripId,
      },
      readAt: null,
      createdAt: new Date(),
    });

    return this.formatConnectionDto(doc);
  }

  /**
   * Updates connection status (accept, reject, cancel)
   */
  async updateConnectionStatus(
    userId: string,
    connectionId: string,
    dto: UpdateConnectionStatusDto
  ): Promise<ConnectionResponseDto> {
    const conn = await connectionsRepository.findConnectionById(connectionId);
    if (!conn) {
      throw new NotFoundError('Connection request not found');
    }

    if (conn.status !== 'pending') {
      throw new BadRequestError(`Cannot change status of a connection that is already ${conn.status}`);
    }

    const db = getDb();
    let conversationId: string | null = null;

    if (dto.status === 'accepted') {
      if (conn.recipientId !== userId) {
        throw new ForbiddenError('Only the recipient can accept a connection request');
      }

      // Check if direct conversation already exists between both users
      let conv = await db.collection(COLLECTIONS.CONVERSATIONS).findOne({
        type: 'direct',
        participants: { $all: [conn.requesterId, conn.recipientId] },
      });

      if (!conv) {
        const newConv = {
          _id: new ObjectId(),
          type: 'direct',
          participants: [conn.requesterId, conn.recipientId],
          createdBy: userId,
          tripId: conn.tripId,
          groupId: null,
          lastMessageAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await db.collection(COLLECTIONS.CONVERSATIONS).insertOne(newConv);
        conv = newConv;
      }
      conversationId = conv._id.toHexString();

      // Create notification for requester
      await db.collection(COLLECTIONS.NOTIFICATIONS).insertOne({
        userId: conn.requesterId,
        type: 'connection_accepted',
        title: 'Connection Accepted',
        body: 'Your travel request was accepted! You can now chat and coordinate.',
        data: {
          connectionId: conn._id.toHexString(),
          conversationId,
          tripId: conn.tripId,
        },
        readAt: null,
        createdAt: new Date(),
      });

      // Update match status to 'connected' if present
      await db.collection(COLLECTIONS.MATCHES).updateMany(
        {
          $or: [
            { tripId: conn.tripId, candidateUserId: conn.requesterId },
            { tripId: conn.tripId, userId: conn.requesterId },
          ],
        },
        { $set: { status: 'connected', updatedAt: new Date() } }
      );
    } else if (dto.status === 'rejected') {
      if (conn.recipientId !== userId) {
        throw new ForbiddenError('Only the recipient can reject a connection request');
      }
    } else if (dto.status === 'cancelled') {
      if (conn.requesterId !== userId) {
        throw new ForbiddenError('Only the requester can cancel a connection request');
      }
    }

    const updated = await connectionsRepository.updateConnectionStatus(connectionId, dto.status, conversationId);
    if (!updated) {
      throw new NotFoundError('Connection not found after update');
    }

    return this.formatConnectionDto(updated);
  }

  /**
   * Retrieves single connection details
   */
  async getConnectionById(userId: string, connectionId: string): Promise<ConnectionResponseDto> {
    const conn = await connectionsRepository.findConnectionById(connectionId);
    if (!conn) {
      throw new NotFoundError('Connection request not found');
    }

    if (conn.requesterId !== userId && conn.recipientId !== userId) {
      throw new ForbiddenError('You do not have permission to view this connection');
    }

    return this.formatConnectionDto(conn);
  }

  /**
   * List connections for user
   */
  async listConnections(
    userId: string,
    type: 'incoming' | 'outgoing' | 'all' = 'all',
    status?: ConnectionStatus,
    page = 1,
    pageSize = 20
  ) {
    const { items, totalCount } = await connectionsRepository.findConnectionsByUser(
      userId,
      type,
      status,
      page,
      pageSize
    );

    const formatted = await Promise.all(items.map((c) => this.formatConnectionDto(c)));

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

export const connectionsService = new ConnectionsService();
