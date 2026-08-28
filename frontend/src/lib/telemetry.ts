import { Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

export function registerTelemetrySocket(socket: Socket | null) {
  globalSocket = socket;
}

export function trackTelemetryEvent(
  eventType: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  if (globalSocket && globalSocket.connected) {
    globalSocket.emit('telemetry:event', {
      eventType,
      description,
      metadata: metadata || {},
    });
  }
}
