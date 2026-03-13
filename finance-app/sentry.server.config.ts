import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Server-specific configuration
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    if (error && error instanceof Error) {
      // Filter out expected database connection errors during startup
      if (error.message?.includes('ECONNREFUSED') && 
          error.message?.includes('5432')) {
        return null;
      }
      
      // Filter out Redis connection errors during startup
      if (error.message?.includes('ECONNREFUSED') && 
          error.message?.includes('6379')) {
        return null;
      }
      
      // Filter out development hot reload errors
      if (process.env.NODE_ENV === 'development' && 
          error.message?.includes('ENOENT')) {
        return null;
      }
      
      // Add server context
      event.tags = {
        ...event.tags,
        component: 'server',
        node_version: process.version,
        platform: process.platform,
      };
      
      // Add request context if available
      if (hint.request) {
        event.request = {
          ...event.request,
          headers: {
            ...event.request.headers,
            // Remove sensitive headers
            authorization: '[Filtered]',
            cookie: '[Filtered]',
          },
        };
      }
    }
    
    return event;
  },
  
  // Server integrations
  integrations: [
    // HTTP integration for request tracking
    new Sentry.Integrations.Http({ tracing: true }),
    
    // Console integration
    new Sentry.Integrations.Console(),
    
    // Process integration
    new Sentry.Integrations.OnUncaughtException({
      exitEvenIfOtherHandlersAreRegistered: false,
    }),
    
    // Unhandled rejection integration
    new Sentry.Integrations.OnUnhandledRejection({
      mode: 'warn',
    }),
  ],
  
  // Initial scope
  initialScope: {
    tags: {
      component: 'server',
      framework: 'nextjs',
      runtime: 'nodejs',
    },
    level: 'info',
  },
  
  // Ignore specific errors
  ignoreErrors: [
    // Common Node.js errors that don't require attention
    'EPIPE',
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    
    // Next.js specific
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    
    // Development only
    ...(process.env.NODE_ENV === 'development' ? [
      'MODULE_NOT_FOUND',
      'ENOENT',
    ] : []),
  ],
  
  // Performance settings
  maxBreadcrumbs: 50,
  attachStacktrace: true,
  
  // Custom error handling
  beforeSendTransaction(event) {
    // Add custom tags for performance monitoring
    event.tags = {
      ...event.tags,
      server_memory: process.memoryUsage().heapUsed,
      server_uptime: process.uptime(),
    };
    
    return event;
  },
});