import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Performance monitoring for edge runtime
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0.5,
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Edge-specific configuration
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    if (error && error instanceof Error) {
      // Filter edge-specific errors
      if (error.message?.includes('EdgeRuntime')) {
        return null;
      }
      
      // Add edge context
      event.tags = {
        ...event.tags,
        component: 'edge',
        runtime: 'edge',
      };
      
      // Add edge function context
      if (typeof EdgeRuntime !== 'undefined') {
        event.extra = {
          ...event.extra,
          edge_runtime: true,
        };
      }
    }
    
    return event;
  },
  
  // Minimal integrations for edge runtime
  integrations: [],
  
  // Initial scope
  initialScope: {
    tags: {
      component: 'edge',
      framework: 'nextjs',
      runtime: 'edge',
    },
    level: 'info',
  },
  
  // Reduced settings for edge environment
  maxBreadcrumbs: 10,
  attachStacktrace: true,
});