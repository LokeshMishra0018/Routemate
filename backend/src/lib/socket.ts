import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { ObjectId } from 'mongodb';
import { getEnv } from '../config/env.js';
import { verifyAccessToken } from './jwt.js';
import { getDb } from '../db/mongo.js';
import { COLLECTIONS } from '../db/collections.js';
import { presenceStore, LivePresence } from './presence.js';
import { telemetryManager, TelemetryEventType } from './telemetry.js';

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
 * Initializes the Socket.IO gateway attached to the HTTP server with JWT authentication, presence tracking, and telemetry.
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
  io.on('connection', async (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const userId = authSocket.data.user.id;
    const userRole = authSocket.data.user.role;
    const userEmail = authSocket.data.user.email;

    // Join personal user room for direct alerts/notifications
    socket.join(`user:${userId}`);

    // If admin or moderator, join the admin telemetry broadcast room
    if (userRole === 'admin' || userRole === 'moderator') {
      socket.join('room:admin:telemetry');
    }

    // Fetch user profile to initialize presence details
    let fullName = userEmail.split('@')[0];
    let avatarUrl: string | null = null;
    let collegeName = 'KIET Group of Institutions';

    try {
      const db = getDb();
      if (db) {
        const profile = await db.collection(COLLECTIONS.PROFILES).findOne({ userId });
        if (profile) {
          fullName = profile.fullName || fullName;
          avatarUrl = profile.avatarUrl || null;
        }
      }
    } catch {
      // ignore lookup error
    }

    // Parse user-agent for client device info
    const userAgent = socket.handshake.headers['user-agent'] || '';
    let deviceCategory: 'mobile' | 'desktop' | 'tablet' | 'unknown' = 'desktop';
    if (/mobile/i.test(userAgent)) deviceCategory = 'mobile';
    else if (/tablet|ipad/i.test(userAgent)) deviceCategory = 'tablet';

    let browserInfo = 'Browser';
    if (/chrome/i.test(userAgent)) browserInfo = 'Chrome';
    else if (/firefox/i.test(userAgent)) browserInfo = 'Firefox';
    else if (/safari/i.test(userAgent)) browserInfo = 'Safari';
    else if (/edge/i.test(userAgent)) browserInfo = 'Edge';

    const initialPresence: LivePresence = {
      socketId: socket.id,
      userId,
      name: fullName,
      email: userEmail,
      avatarUrl,
      college: collegeName,
      role: userRole,
      currentPath: '/dashboard',
      currentAction: 'Viewing Dashboard',
      deviceCategory,
      browserInfo,
      connectedAt: new Date().toISOString(),
      lastPingAt: new Date().toISOString(),
      isIdle: false,
      sessionDurationSeconds: 0,
    };

    presenceStore.setPresence(socket.id, initialPresence);

    // Notify admin telemetry room
    io?.to('room:admin:telemetry').emit('admin:presence_updated', {
      type: 'connected',
      presence: initialPresence,
      liveCount: presenceStore.getAllPresence().length,
    });

    socket.emit('gateway:ready', {
      message: 'RouteMate Realtime Gateway Ready',
      userId,
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Event: Heartbeat Presence Updates from Client
    socket.on(
      'presence:heartbeat',
      (data: {
        currentPath?: string;
        currentAction?: string;
        isIdle?: boolean;
        deviceCategory?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
        browserInfo?: string;
      }) => {
        const updates: Partial<LivePresence> = {
          lastPingAt: new Date().toISOString(),
        };
        if (data.currentPath) updates.currentPath = data.currentPath;
        if (data.currentAction) updates.currentAction = data.currentAction;
        if (typeof data.isIdle === 'boolean') updates.isIdle = data.isIdle;
        if (data.deviceCategory) updates.deviceCategory = data.deviceCategory;
        if (data.browserInfo) updates.browserInfo = data.browserInfo;

        presenceStore.updatePresence(socket.id, updates);

        const updated = presenceStore.getPresence(socket.id);
        if (updated) {
          io?.to('room:admin:telemetry').emit('admin:presence_updated', {
            type: 'heartbeat',
            presence: updated,
            liveCount: presenceStore.getAllPresence().length,
          });
        }
      }
    );

    // Event: Telemetry Action Event from Client
    socket.on(
      'telemetry:event',
      async (data: {
        eventType: TelemetryEventType;
        description: string;
        metadata?: Record<string, unknown>;
      }) => {
        if (!data?.eventType || !data?.description) return;

        const event = await telemetryManager.recordEvent(
          userId,
          fullName,
          data.eventType,
          data.description,
          data.metadata
        );

        // Stream event in real-time to admin listeners
        io?.to('room:admin:telemetry').emit('admin:telemetry_event', event);
      }
    );

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

    // Disconnect handler
    socket.on('disconnect', (_reason) => {
      presenceStore.removePresence(socket.id);
      io?.to('room:admin:telemetry').emit('admin:presence_updated', {
        type: 'disconnected',
        socketId: socket.id,
        userId,
        liveCount: presenceStore.getAllPresence().length,
      });
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

/**
 * Broadcasts an event to all admin telemetry listeners
 */
export function emitToAdminTelemetry(event: string, payload: unknown): void {
  if (io) {
    io.to('room:admin:telemetry').emit(event, payload);
  }
}

export function getIO(): SocketIOServer | null {
  return io;
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
