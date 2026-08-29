import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Load .env file into process.env if present
loadDotenv();

const rawEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z
      .string()
      .default('4000')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(65535)),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    CORS_ORIGIN: z.string().optional(),
    MONGODB_URI: z.string().optional(),
    MONGODB_DB_NAME: z.string().optional(),
    JWT_ACCESS_SECRET: z.string().optional(),
    JWT_REFRESH_SECRET: z.string().optional(),
    JWT_ACCESS_EXPIRATION: z.string().default('15m'),
    JWT_REFRESH_EXPIRATION_DAYS: z
      .string()
      .default('7')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().positive()),
    EMAIL_FROM: z.string().default('noreply@routemate.app'),
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_DIR: z.string().default('./uploads/private'),
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
    RATE_LIMIT_ALLOW_LIST: z.string().optional().default(''),
    REDIS_URL: z.string().optional(),
    SOCKET_CORS_ORIGIN: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GMAIL_CLIENT_ID: z.string().optional(),
    GMAIL_CLIENT_SECRET: z.string().optional(),
    GMAIL_REFRESH_TOKEN: z.string().optional(),
    GMAIL_SENDER: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    BREVO_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 587)),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z
      .string()
      .optional()
      .transform((val) => val === 'true' || val === '1'),
    ADMIN_PROVISION_PASSWORD: z.string().default('routemate2026'),
  })
  .superRefine((data, ctx) => {
    const isProd = data.NODE_ENV === 'production';

    // Production checks for MongoDB Atlas
    if (isProd) {
      if (!data.MONGODB_URI || data.MONGODB_URI.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MONGODB_URI'],
          message: 'MONGODB_URI must be explicitly configured in production environment',
        });
      }

      if (!data.MONGODB_DB_NAME || data.MONGODB_DB_NAME.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MONGODB_DB_NAME'],
          message: 'MONGODB_DB_NAME must be explicitly configured in production environment',
        });
      }

      if (!data.JWT_ACCESS_SECRET || data.JWT_ACCESS_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message: 'JWT_ACCESS_SECRET must be at least 32 characters long in production',
        });
      }

      if (!data.JWT_REFRESH_SECRET || data.JWT_REFRESH_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message: 'JWT_REFRESH_SECRET must be at least 32 characters long in production',
        });
      }
    }
  })
  .transform((data) => {
    const isProd = data.NODE_ENV === 'production';
    const isTest = data.NODE_ENV === 'test';

    const defaultMongoUri = 'mongodb://127.0.0.1:27017';
    const defaultMongoDbName = isTest ? 'routemate_test' : 'routemate_dev';
    const defaultCors = isProd ? '' : 'http://localhost:5173,http://localhost:3000';
    const defaultJwtAccess = isProd ? '' : 'development-jwt-access-secret-minimum-32-chars!!';
    const defaultJwtRefresh = isProd ? '' : 'development-jwt-refresh-secret-minimum-32-chars!';

    return {
      NODE_ENV: data.NODE_ENV,
      PORT: data.PORT,
      HOST: data.HOST,
      LOG_LEVEL: data.LOG_LEVEL,
      CORS_ORIGIN: data.CORS_ORIGIN && data.CORS_ORIGIN.trim().length > 0 ? data.CORS_ORIGIN : defaultCors,
      MONGODB_URI: data.MONGODB_URI && data.MONGODB_URI.trim().length > 0 ? data.MONGODB_URI : defaultMongoUri,
      MONGODB_DB_NAME:
        data.MONGODB_DB_NAME && data.MONGODB_DB_NAME.trim().length > 0 ? data.MONGODB_DB_NAME : defaultMongoDbName,
      JWT_ACCESS_SECRET:
        data.JWT_ACCESS_SECRET && data.JWT_ACCESS_SECRET.trim().length > 0 ? data.JWT_ACCESS_SECRET : defaultJwtAccess,
      JWT_REFRESH_SECRET:
        data.JWT_REFRESH_SECRET && data.JWT_REFRESH_SECRET.trim().length > 0 ? data.JWT_REFRESH_SECRET : defaultJwtRefresh,
      JWT_ACCESS_EXPIRATION: data.JWT_ACCESS_EXPIRATION,
      JWT_REFRESH_EXPIRATION_DAYS: data.JWT_REFRESH_EXPIRATION_DAYS,
      EMAIL_FROM: data.SMTP_FROM || data.EMAIL_FROM,
      STORAGE_DRIVER: data.STORAGE_DRIVER,
      STORAGE_LOCAL_DIR: data.STORAGE_LOCAL_DIR,
      RATE_LIMIT_MAX: data.RATE_LIMIT_MAX,
      RATE_LIMIT_TIME_WINDOW_MS: data.RATE_LIMIT_TIME_WINDOW_MS,
      RATE_LIMIT_ALLOW_LIST: data.RATE_LIMIT_ALLOW_LIST
        ? data.RATE_LIMIT_ALLOW_LIST.split(',')
            .map((ip) => ip.trim())
            .filter(Boolean)
        : [],
      REDIS_URL: data.REDIS_URL,
      SOCKET_CORS_ORIGIN:
        data.SOCKET_CORS_ORIGIN && data.SOCKET_CORS_ORIGIN.trim().length > 0 ? data.SOCKET_CORS_ORIGIN : defaultCors,
      GOOGLE_CLIENT_ID: data.GOOGLE_CLIENT_ID,
      GMAIL_CLIENT_ID: data.GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET: data.GMAIL_CLIENT_SECRET,
      GMAIL_REFRESH_TOKEN: data.GMAIL_REFRESH_TOKEN,
      GMAIL_SENDER: data.GMAIL_SENDER || data.SMTP_USER || 'lokesh.2327cs1097@kiet.edu',
      RESEND_API_KEY: data.RESEND_API_KEY,
      BREVO_API_KEY: data.BREVO_API_KEY,
      SMTP_HOST: data.SMTP_HOST,
      SMTP_PORT: data.SMTP_PORT,
      SMTP_USER: data.SMTP_USER,
      SMTP_PASS: data.SMTP_PASS,
      SMTP_FROM: data.SMTP_FROM || data.EMAIL_FROM,
      SMTP_SECURE: data.SMTP_SECURE,
      ADMIN_PROVISION_PASSWORD: data.ADMIN_PROVISION_PASSWORD || 'routemate2026',
    };
  });

export type Env = z.infer<typeof rawEnvSchema>;

let cachedEnv: Env | null = null;

export function getEnv(customEnv?: Record<string, string | undefined>): Env {
  if (customEnv) {
    const parsed = rawEnvSchema.safeParse(customEnv);
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

  const parsed = rawEnvSchema.safeParse(process.env);
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
