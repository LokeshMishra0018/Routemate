import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { getEnv } from '../config/env.js';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  if (io) {
    return io;
  }

  const env = getEnv();
  const allowedOrigins = env.SOCKET_CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins.includes('*') ? true : allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    socket.emit('connected', {
      message: 'RouteMate Realtime Gateway Ready',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    socket.on('disconnect', (_reason) => {
      // Socket disconnect handler
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
