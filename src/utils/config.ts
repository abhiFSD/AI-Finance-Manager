import dotenv from 'dotenv';
import { AppConfig, OCREngine } from '@/types';

// Load environment variables
dotenv.config();

export const config: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    apiVersion: process.env.API_VERSION || 'v1'
  },
  upload: {
    maxFileSize: parseFileSize(process.env.MAX_FILE_SIZE || '50MB'),
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png').split(','),
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    tempDir: process.env.TEMP_DIR || './temp'
  },
  ocr: {
    engine: (process.env.OCR_ENGINE || 'tesseract') as OCREngine,
    language: process.env.TESSERACT_LANG || 'eng',
    confidenceThreshold: parseInt(process.env.OCR_CONFIDENCE_THRESHOLD || '60', 10),
    preprocessing: process.env.OCR_PREPROCESSING === 'true'
  },
  queue: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      url: process.env.REDIS_URL || undefined
    },
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    maxRetryAttempts: parseInt(process.env.QUEUE_MAX_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY || '5000', 10)
  },
  aws: process.env.AWS_TEXTRACT_ENABLED === 'true' ? {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    textractEnabled: true
  } : undefined,
  virusScanning: {
    enabled: process.env.VIRUS_SCAN_ENABLED === 'true',
    clamav: process.env.VIRUS_SCAN_ENABLED === 'true' ? {
      host: process.env.CLAMAV_HOST || 'localhost',
      port: parseInt(process.env.CLAMAV_PORT || '3310', 10)
    } : undefined
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  },
  rateLimiting: (() => {
    const isDev = process.env.NODE_ENV !== 'production';
    return {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (isDev ? '1000' : '100'), 10),
      auth: {
        windowMs: isDev ? 5 * 60 * 1000 : 15 * 60 * 1000,       // 5min dev, 15min prod
        maxAttempts: isDev ? 50 : 5,                               // 50 dev, 5 prod
      },
      register: {
        windowMs: isDev ? 15 * 60 * 1000 : 60 * 60 * 1000,       // 15min dev, 1hr prod
        maxAttempts: isDev ? 20 : 3,                               // 20 dev, 3 prod
      },
    };
  })()
};

function parseFileSize(sizeStr: string): number {
  const units: Record<string, number> = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };

  const match = sizeStr.match(/^(\d+)(B|KB|MB|GB)$/i);
  if (!match) {
    throw new Error(`Invalid file size format: ${sizeStr}`);
  }

  const [, size, unit] = match;
  return parseInt(size, 10) * (units[unit.toUpperCase()] || 1);
}

export default config;