// Simplified config for local development
export const config = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/financeapp',
  DATABASE_POOL_MIN: 5,
  DATABASE_POOL_MAX: 20,
  DATABASE_POOL_IDLE_TIMEOUT: 30000,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'development-secret-key-change-in-production-min-32-chars',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-key-change-in-production',
  JWT_ACCESS_TOKEN_EXPIRY: '15m',
  JWT_REFRESH_TOKEN_EXPIRY: '7d',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  SESSION_SECRET: process.env.SESSION_SECRET || 'development-session-secret-change-in-production',
  SESSION_TIMEOUT: '24h',

  // Email
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: 587,
  SMTP_SECURE: false,
  SMTP_USER: process.env.SMTP_USER || 'test@example.com',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || 'password',
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@financeapp.com',

  // OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',

  // Security
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001',
  RATE_LIMIT_WINDOW_MS: 900000,
  RATE_LIMIT_MAX_REQUESTS: 100,
  LOGIN_RATE_LIMIT_MAX: 5,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 900000,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'development-encryption-key-32-characters-minimum',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE_PATH: './logs/app.log',

  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_URL: process.env.APP_URL || 'http://localhost:3001',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3001',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'development-nextauth-secret-change-in-production',
}

// Helper functions for common config access
export const getJWTConfig = () => ({
  accessSecret: config.JWT_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  accessExpiry: config.JWT_ACCESS_TOKEN_EXPIRY,
  refreshExpiry: config.JWT_REFRESH_TOKEN_EXPIRY,
})

export const getRedisConfig = () => ({
  url: config.REDIS_URL,
  password: config.REDIS_PASSWORD,
  sessionSecret: config.SESSION_SECRET,
  sessionTimeout: config.SESSION_TIMEOUT,
})

export const getSMTPConfig = () => ({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE,
  user: config.SMTP_USER,
  password: config.SMTP_PASSWORD,
  fromEmail: config.FROM_EMAIL,
})

export const getOAuthConfig = () => ({
  google: {
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
  },
  github: {
    clientId: config.GITHUB_CLIENT_ID,
    clientSecret: config.GITHUB_CLIENT_SECRET,
  },
})

export const getSecurityConfig = () => ({
  corsOrigins: config.CORS_ORIGINS.split(','),
  rateLimitWindowMs: config.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: config.RATE_LIMIT_MAX_REQUESTS,
  loginRateLimitMax: config.LOGIN_RATE_LIMIT_MAX,
  maxLoginAttempts: config.MAX_LOGIN_ATTEMPTS,
  lockoutDuration: config.LOCKOUT_DURATION,
  encryptionKey: config.ENCRYPTION_KEY,
})

export const getAppConfig = () => ({
  nodeEnv: config.NODE_ENV,
  appUrl: config.APP_URL,
  nextAuthUrl: config.NEXTAUTH_URL,
  nextAuthSecret: config.NEXTAUTH_SECRET,
  logLevel: config.LOG_LEVEL,
  logFilePath: config.LOG_FILE_PATH,
})

// Export for NextAuth
export const nextAuthConfig = {
  secret: config.NEXTAUTH_SECRET,
  providers: [],
  callbacks: {},
}