import { describe, it, expect } from 'vitest';
import { getEnv } from '../../src/config/env.js';

describe('Environment Configuration', () => {
  it('should parse and apply valid default environment variables in test/development mode', () => {
    const env = getEnv({
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017',
      MONGODB_DB_NAME: 'routemate_test',
    });

    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(4000);
    expect(env.MONGODB_URI).toBe('mongodb://127.0.0.1:27017');
    expect(env.MONGODB_DB_NAME).toBe('routemate_test');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.RATE_LIMIT_ALLOW_LIST).toEqual([]);
  });

  it('should parse comma-separated RATE_LIMIT_ALLOW_LIST into array', () => {
    const env = getEnv({
      NODE_ENV: 'test',
      RATE_LIMIT_ALLOW_LIST: '10.0.0.1, 10.0.0.2',
    });
    expect(env.RATE_LIMIT_ALLOW_LIST).toEqual(['10.0.0.1', '10.0.0.2']);
  });

  it('should require explicit MONGODB_URI in production environment', () => {
    expect(() => {
      getEnv({
        NODE_ENV: 'production',
        MONGODB_DB_NAME: 'routemate_prod',
        CORS_ORIGIN: 'https://routemate.app',
      });
    }).toThrow(/MONGODB_URI must be explicitly configured in production environment/);
  });

  it('should require explicit MONGODB_DB_NAME in production environment', () => {
    expect(() => {
      getEnv({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb+srv://user:pass@atlas.mongodb.net',
        CORS_ORIGIN: 'https://routemate.app',
      });
    }).toThrow(/MONGODB_DB_NAME must be explicitly configured in production environment/);
  });

  it('should allow wildcard CORS_ORIGIN "*" or custom origins in production', () => {
    const env = getEnv({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://user:pass@atlas.mongodb.net',
      MONGODB_DB_NAME: 'routemate_prod',
      JWT_ACCESS_SECRET: 'production-super-secret-access-token-key-32chars',
      JWT_REFRESH_SECRET: 'production-super-secret-refresh-token-key-32chars',
      CORS_ORIGIN: '*',
    });
    expect(env.CORS_ORIGIN).toBe('*');
  });

  it('should pass valid production configuration', () => {
    const env = getEnv({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://user:pass@atlas.mongodb.net',
      MONGODB_DB_NAME: 'routemate_prod',
      JWT_ACCESS_SECRET: 'production-super-secret-access-token-key-32chars',
      JWT_REFRESH_SECRET: 'production-super-secret-refresh-token-key-32chars',
      CORS_ORIGIN: 'https://routemate.app',
      SOCKET_CORS_ORIGIN: 'https://routemate.app',
    });

    expect(env.NODE_ENV).toBe('production');
    expect(env.MONGODB_URI).toBe('mongodb+srv://user:pass@atlas.mongodb.net');
    expect(env.MONGODB_DB_NAME).toBe('routemate_prod');
    expect(env.CORS_ORIGIN).toBe('https://routemate.app');
    expect(env.JWT_ACCESS_SECRET).toBe('production-super-secret-access-token-key-32chars');
  });

  it('should throw an error on invalid PORT value', () => {
    expect(() => {
      getEnv({
        PORT: '999999',
      });
    }).toThrow(/Environment validation error/);
  });
});
