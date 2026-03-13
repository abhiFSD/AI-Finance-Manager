import winston from 'winston';
import { config } from './config';
import fs from 'fs';
import path from 'path';

// Ensure log directory exists
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log formats
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'finance-app' },
  transports: [
    // Write to file
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // Write errors to separate file
    new winston.transports.File({
      filename: config.logging.file.replace('.log', '-error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Create specific loggers for different modules
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};

// Export specific loggers
export const uploadLogger = createModuleLogger('upload');
export const ocrLogger = createModuleLogger('ocr');
export const parserLogger = createModuleLogger('parser');
export const queueLogger = createModuleLogger('queue');
export const extractionLogger = createModuleLogger('extraction');
export const apiLogger = createModuleLogger('api');

// Helper functions for structured logging
export const logDocumentProcessing = (documentId: string, stage: string, data?: any) => {
  logger.info('Document processing stage', {
    documentId,
    stage,
    ...data
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    ...context
  });
};

export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info('Performance metric', {
    operation,
    duration,
    ...metadata
  });
};

export default logger;