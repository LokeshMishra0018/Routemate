import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { getEnv } from '../config/env.js';

let io: SocketIOServer | null = null;

/**
 * Initializes the Socket.IO gateway attached to Fastify's underlying HTTP server.
 * In Phase 1, this establishes the realtime transport foundation without product-level auth/chat.
 * Phase 5 will attach authenticated session middleware (io.use(...)).
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
    allowedOrigins.includes('*') && env.NODE_ENV !== 'production' ? true : allowedOrigins;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Connection lifecycle: baseline connection handler (unauthenticated foundation)
  io.on('connection', (socket: Socket) => {
    socket.emit('gateway:ready', {
      message: 'RouteMate Realtime Gateway Ready',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    socket.on('disconnect', (_reason) => {
      // Future Phase 5: clean up presence / rooms
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO is not initialized. Ensure initSocketIO() has been called.');
  }
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
