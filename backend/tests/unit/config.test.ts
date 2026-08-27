import { describe, it, expect } from 'vitest';
import { getEnv, envSchema } from '../../src/config/env.js';

describe('Environment Configuration', () => {
  it('should parse and apply valid default environment variables', () => {
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://localhost:27017',
      MONGODB_DB_NAME: 'routemate_test',
    });

    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(4000);
    expect(env.MONGODB_URI).toBe('mongodb://localhost:27017');
    expect(env.MONGODB_DB_NAME).toBe('routemate_test');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('should convert PORT string to number', () => {
    const parsed = envSchema.parse({
      PORT: '5000',
      MONGODB_URI: 'mongodb://localhost:27017',
      MONGODB_DB_NAME: 'routemate_test',
    });
    expect(parsed.PORT).toBe(5000);
    expect(typeof parsed.PORT).toBe('number');
  });

  it('should throw an error on invalid PORT value', () => {
    expect(() => {
      getEnv({
        PORT: '999999',
        MONGODB_URI: 'mongodb://localhost:27017',
        MONGODB_DB_NAME: 'routemate_test',
      });
    }).toThrow(/Environment validation error/);
  });

  it('should throw an error when MONGODB_URI is empty', () => {
    expect(() => {
      getEnv({
        MONGODB_URI: '',
        MONGODB_DB_NAME: 'routemate_test',
      });
    }).toThrow(/Environment validation error/);
  });
});
