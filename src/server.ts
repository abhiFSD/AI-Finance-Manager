import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './utils/config';
import { logger, apiLogger } from './utils/logger';
import documentsRouter from './api/documents';
import authRouter from './api/auth';
import accountsRouter from './api/accounts';
import transactionsRouter from './api/transactions';
import categoriesRouter from './api/categories';
import budgetsRouter from './api/budgets';
import dashboardRouter from './api/dashboard';
import goalsRouter from './api/goals';
import creditCardsRouter from './api/creditcards';
import investmentsRouter from './api/investments';
import loansRouter from './api/loans';
import riskProfileRouter from './api/risk-profile';
import insightsRouter from './api/insights';
import creditHealthRouter from './api/credit-health';
import netWorthRouter from './api/net-worth';
import alertsRouter from './api/alerts';
import chatRouter from './api/chat';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'user-id', 'x-user-id'],
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.maxRequests,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  apiLogger.info('Request received', {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.headers['user-id'] || req.headers['x-user-id']
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    apiLogger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length')
    });
  });

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/credit-cards', creditCardsRouter);
app.use('/api/investments', investmentsRouter);
app.use('/api/loans', loansRouter);
app.use('/api/risk-profile', riskProfileRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/credit-health', creditHealthRouter);
app.use('/api/net-worth', netWorthRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/chat', chatRouter);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Finance App Document Processing API',
    version: '1.0.0',
    description: 'Complete document processing pipeline for financial documents',
    endpoints: {
      health: 'GET /health',
      auth: 'POST /api/auth/*',
      documents: 'GET|POST|DELETE /api/documents',
      transactions: 'GET|POST|PUT|DELETE /api/transactions',
      upload: 'POST /api/documents/upload/*',
      processing: 'POST /api/documents/process/*',
      categories: 'GET|POST|PUT|DELETE /api/categories',
      budgets: 'GET|POST|PUT|DELETE /api/budgets',
      dashboard: 'GET /api/dashboard/*',
      goals: 'GET|POST|PUT|DELETE /api/goals',
      creditCards: 'GET|POST|PUT|DELETE /api/credit-cards',
      investments: 'GET|POST|PUT|DELETE /api/investments',
      loans: 'GET|POST|PUT|DELETE /api/loans',
      riskProfile: 'GET|POST /api/risk-profile',
      insights: 'GET|POST|PUT /api/insights',
      creditHealth: 'GET|POST /api/credit-health',
      netWorth: 'GET /api/net-worth',
      alerts: 'GET|POST|PUT|DELETE /api/alerts',
      chat: 'POST|GET|DELETE /api/chat'
    },
    features: [
      'Document upload with progress tracking',
      'OCR with Tesseract.js and AWS Textract',
      'Bank statement parsing (HDFC, SBI, ICICI, etc.)',
      'Credit card statement parsing',
      'Investment and loan document parsing',
      'Transaction extraction and normalization',
      'Complete transaction CRUD operations',
      'Transaction filtering, pagination, and search',
      'Transaction analytics and reporting',
      'Transaction import/export (CSV, Excel)',
      'Transaction statistics and trends',
      'Category-based transaction grouping',
      'Duplicate detection',
      'Merchant name extraction',
      'Category management with hierarchy support',
      'Budget creation and tracking with spending analysis',
      'Period-based budget calculations (daily, weekly, monthly, etc.)',
      'Budget alerts and overspending detection',
      'Background processing with Bull queue',
      'Comprehensive error handling and logging'
    ]
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`
    }
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An internal server error occurred'
        : err.message
    }
  });
});

// Start server
const port = config.server.port;
const host = config.server.host;

app.listen(port, host, () => {
  logger.info('Finance App Document Processing API started', {
    port,
    host,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  
  logger.info('Available endpoints:', {
    health: `http://${host}:${port}/health`,
    api: `http://${host}:${port}/api`,
    auth: `http://${host}:${port}/api/auth`,
    documents: `http://${host}:${port}/api/documents`,
    upload: `http://${host}:${port}/api/documents/upload`,
    process: `http://${host}:${port}/api/documents/process`,
    categories: `http://${host}:${port}/api/categories`,
    budgets: `http://${host}:${port}/api/budgets`,
    dashboard: `http://${host}:${port}/api/dashboard`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason,
    promise
  });
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

export default app;