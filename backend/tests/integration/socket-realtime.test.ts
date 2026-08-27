import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getEnv } from '../../src/config/env.js';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db.js';
import { initSocketIO, closeSocketIO } from '../../src/lib/socket.js';
import { messagingService } from '../../src/modules/messaging/messaging.service.js';

describe('Socket.IO Realtime Layer (Integration)', () => {
  let app: FastifyInstance;
  let serverPort: number;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let conversationId: string;

  const travelDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    const mongoUri = await setupTestDatabase();
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      MONGODB_DB_NAME: 'routemate_test_socket',
      SOCKET_CORS_ORIGIN: '*',
    });
    app = await buildApp({ env });
    await app.ready();

    // Attach Socket.IO to app's server and listen on random available port
    initSocketIO(app.server);
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    serverPort = typeof address === 'object' && address ? address.port : 3000;

    // Register User 1
    const u1Reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'sock.u1@kiet.edu', password: 'Password123!', fullName: 'Socket User One' },
    });
    user1Id = JSON.parse(u1Reg.body).data.userId;
    const u1Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'sock.u1@kiet.edu', password: 'Password123!' },
    });
    user1Token = JSON.parse(u1Log.body).data.accessToken;

    // Register User 2
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'sock.u2@kiet.edu', password: 'Password123!', fullName: 'Socket User Two' },
    });
    const u2Log = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'sock.u2@kiet.edu', password: 'Password123!' },
    });
    user2Token = JSON.parse(u2Log.body).data.accessToken;

    // Create Trip & Connection to get active conversation
    const tripRes = await app.inject({
      method: 'POST',
      url: '/api/v1/trips',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        source: { name: 'Ghaziabad', coordinates: { type: 'Point', coordinates: [77.4304, 28.6692] } },
        destination: { name: 'Lucknow', coordinates: { type: 'Point', coordinates: [80.9234, 26.8322] } },
        travelDate,
        departureTime: '08:00',
        transportType: 'train',
      },
    });
    const tripId = JSON.parse(tripRes.body).data.id;

    const connRes = await app.inject({
      method: 'POST',
      url: '/api/v1/connections',
      headers: { authorization: `Bearer ${user2Token}` },
      payload: { recipientId: user1Id, tripId, message: 'Chat' },
    });
    const connId = JSON.parse(connRes.body).data.id;

    const acceptRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/connections/${connId}`,
      headers: { authorization: `Bearer ${user1Token}` },
      payload: { status: 'accepted' },
    });
    conversationId = JSON.parse(acceptRes.body).data.conversationId;
  });

  afterAll(async () => {
    await closeSocketIO();
    await app.close();
    await teardownTestDatabase();
  });

  it('should reject unauthenticated socket connection attempt', async () => {
    const socket = ioClient(`http://127.0.0.1:${serverPort}`, {
      transports: ['websocket'],
      autoConnect: false,
    });

    const errorPromise = new Promise<string>((resolve) => {
      socket.on('connect_error', (err) => {
        resolve(err.message);
        socket.disconnect();
      });
    });

    socket.connect();
    const errorMsg = await errorPromise;
    expect(errorMsg).toContain('Authentication token required');
  });

  it('should authenticate client with valid JWT and receive gateway:ready', async () => {
    const socket = ioClient(`http://127.0.0.1:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: user1Token },
    });

    const readyPromise = new Promise<{ message: string; userId: string }>((resolve) => {
      socket.on('gateway:ready', (data) => {
        resolve(data);
      });
    });

    const data = await readyPromise;
    expect(data.message).toBe('RouteMate Realtime Gateway Ready');
    expect(data.userId).toBe(user1Id);

    socket.disconnect();
  });

  it('should allow conversation participant to join room and receive broadcast events', async () => {
    const client1: ClientSocket = ioClient(`http://127.0.0.1:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: user1Token },
    });

    const client2: ClientSocket = ioClient(`http://127.0.0.1:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: user2Token },
    });

    // Wait for both clients to connect
    await Promise.all([
      new Promise((resolve) => client1.on('gateway:ready', resolve)),
      new Promise((resolve) => client2.on('gateway:ready', resolve)),
    ]);

    // Both join conversation room
    client1.emit('join_conversation', { conversationId });
    client2.emit('join_conversation', { conversationId });

    await Promise.all([
      new Promise((resolve) => client1.on('joined_conversation', resolve)),
      new Promise((resolve) => client2.on('joined_conversation', resolve)),
    ]);

    // Test typing indicator: Client 1 starts typing -> Client 2 receives user_typing
    const typingPromise = new Promise<{ isTyping: boolean; userId: string }>((resolve) => {
      client2.on('user_typing', (data) => {
        resolve(data);
      });
    });

    client1.emit('typing_start', { conversationId });
    const typingData = await typingPromise;
    expect(typingData.isTyping).toBe(true);
    expect(typingData.userId).toBe(user1Id);

    // Test message broadcast: Service sends message -> both clients receive new_message event
    const messagePromise = new Promise<{ body: string }>((resolve) => {
      client2.on('new_message', (data) => {
        resolve(data);
      });
    });

    await messagingService.sendMessage(user1Id, conversationId, 'Realtime test message');
    const msgData = await messagePromise;
    expect(msgData.body).toBe('Realtime test message');

    client1.disconnect();
    client2.disconnect();
  });
});
