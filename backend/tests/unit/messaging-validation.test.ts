import { describe, it, expect } from 'vitest';
import { sendMessageSchema, listMessagesQuerySchema } from '../../src/modules/messaging/messaging.schemas.js';

describe('Messaging Validation Schemas (Unit)', () => {
  it('should validate correct message payload', () => {
    const valid = {
      body: 'Hello, are you ready for the trip?',
      messageType: 'text',
    };
    const parsed = sendMessageSchema.parse(valid);
    expect(parsed.body).toBe('Hello, are you ready for the trip?');
    expect(parsed.messageType).toBe('text');
  });

  it('should reject empty message body or body exceeding 2000 chars', () => {
    expect(() => sendMessageSchema.parse({ body: '' })).toThrow();
    expect(() => sendMessageSchema.parse({ body: 'a'.repeat(2001) })).toThrow();
  });

  it('should validate list messages query schema', () => {
    const parsed = listMessagesQuerySchema.parse({ page: '2', pageSize: '30' });
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(30);
  });
});
