import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Load .env file into process.env if present
loadDotenv();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .default('4000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535)),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').default('mongodb://127.0.0.1:27017'),
  MONGODB_DB_NAME: z.string().min(1, 'MONGODB_DB_NAME is required').default('routemate_dev'),
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  RATE_LIMIT_TIME_WINDOW_MS: z
    .string()
    .default('60000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  REDIS_URL: z.string().optional(),
  SOCKET_CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(customEnv?: Record<string, string | undefined>): Env {
  if (customEnv) {
    const parsed = envSchema.safeParse(customEnv);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`Environment validation error: ${errorMsg}`);
    }
    return parsed.data;
  }

  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Environment validation error: ${errorMsg}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function resetCachedEnv(): void {
  cachedEnv = null;
}
