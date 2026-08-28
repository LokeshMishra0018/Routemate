import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { ObjectId } from 'mongodb';
import { getEnv } from '../config/env.js';
import { verifyAccessToken } from './jwt.js';
import { getDb } from '../db/mongo.js';
import { COLLECTIONS } from '../db/collections.js';

let io: SocketIOServer | null = null;

export interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      email: string;
      role: string;
    };
  };
}

/**
 * Initializes the Socket.IO gateway attached to the HTTP server with JWT authentication and room security.
 */
export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  if (io) {
    return io;
  }

  const env = getEnv();
  const allowedOrigins = env.SOCKET_CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const corsOrigin =
    allowedOrigins.includes('*') ? true : allowedOrigins.length > 0 ? allowedOrigins : true;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication Middleware on handshake
  io.use(async (socket: Socket, next) => {
    try {
      const authHeader = socket.handshake.headers.authorization;
      const token =
        socket.handshake.auth?.token ||
        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyAccessToken(token);
      (socket as AuthenticatedSocket).data = {
        user: {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
        },
      };

      return next();
    } catch {
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  // Authenticated Connection Handler
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const userId = authSocket.data.user.id;

    // Join personal user room for direct alerts/notifications
    socket.join(`user:${userId}`);

    socket.emit('gateway:ready', {
      message: 'RouteMate Realtime Gateway Ready',
      userId,
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Event: Join conversation room (verifies membership before joining)
    socket.on('join_conversation', async (data: { conversationId: string }) => {
      try {
        if (!data?.conversationId) return;

        const db = getDb();
        const conv = await db.collection(COLLECTIONS.CONVERSATIONS).findOne({
          _id: new ObjectId(data.conversationId),
          participants: userId,
        });

        if (conv) {
          socket.join(`conversation:${data.conversationId}`);
          socket.emit('joined_conversation', { conversationId: data.conversationId });
        } else {
          socket.emit('error', { message: 'Not authorized to join this conversation' });
        }
      } catch {
        socket.emit('error', { message: 'Failed to join conversation room' });
      }
    });

    // Event: Leave conversation room
    socket.on('leave_conversation', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.leave(`conversation:${data.conversationId}`);
        socket.emit('left_conversation', { conversationId: data.conversationId });
      }
    });

    // Event: User typing indicator
    socket.on('typing_start', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          conversationId: data.conversationId,
          userId,
          isTyping: true,
        });
      }
    });

    socket.on('typing_stop', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          conversationId: data.conversationId,
          userId,
          isTyping: false,
        });
      }
    });

    // Event: Message read receipt broadcast
    socket.on('message_read', (data: { conversationId: string; messageId: string }) => {
      if (data?.conversationId && data?.messageId) {
        socket.to(`conversation:${data.conversationId}`).emit('message_read_receipt', {
          conversationId: data.conversationId,
          messageId: data.messageId,
          userId,
          readAt: new Date().toISOString(),
        });
      }
    });

    socket.on('disconnect', (_reason) => {
      // Room departure handled automatically by socket.io
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

/**
 * Broadcasts an event to a user's private socket room
 */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

/**
 * Broadcasts an event to all participants in a conversation room
 */
export function emitToConversation(conversationId: string, event: string, payload: unknown): void {
  if (io) {
    io.to(`conversation:${conversationId}`).emit(event, payload);
  }
}

export async function closeSocketIO(): Promise<void> {
  if (io) {
    await new Promise<void>((resolve) => {
      io?.close(() => {
        io = null;
        resolve();
      });
    });
  }
}
