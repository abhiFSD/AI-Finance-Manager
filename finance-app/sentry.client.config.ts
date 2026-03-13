import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Enhanced error filtering
  beforeSend(event, hint) {
    // Filter out common non-critical errors
    const error = hint.originalException;
    
    if (error && error instanceof Error) {
      // Skip network errors that don't affect user experience
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('NetworkError') ||
          error.message?.includes('AbortError')) {
        return null;
      }
      
      // Skip development-only errors
      if (process.env.NODE_ENV === 'development' && 
          error.message?.includes('HMR')) {
        return null;
      }
      
      // Skip browser extension errors
      if (error.stack?.includes('extension://') || 
          error.stack?.includes('chrome-extension://')) {
        return null;
      }
      
      // Skip ad blocker errors
      if (error.message?.includes('script error') &&
          !error.stack) {
        return null;
      }
    }
    
    // Add user context if available
    if (typeof window !== 'undefined' && window.localStorage) {
      const userId = window.localStorage.getItem('userId');
      if (userId) {
        event.user = { id: userId };
      }
    }
    
    return event;
  },
  
  // Custom integrations
  integrations: [
    new Sentry.BrowserTracing({
      // Capture interactions
      tracingOrigins: [
        'localhost',
        /^https:\/\/financeapp\.com/,
        /^https:\/\/api\.financeapp\.com/,
      ],
      
      // Custom routing instrumentation
      routingInstrumentation: Sentry.nextRouterInstrumentation({
        // Additional router options
      }),
      
      // Performance monitoring
      beforeNavigate: context => {
        return {
          ...context,
          // Add custom tags for navigation tracking
          tags: {
            ...context.tags,
            route_change: 'client_side',
          },
        };
      },
    }),
    
    new Sentry.Replay({
      // Capture replay for errors
      maskAllText: true,
      blockAllMedia: true,
      
      // Privacy settings
      maskAllInputs: true,
      blockSelector: '[data-sensitive]',
      
      // Performance
      networkDetailAllowUrls: [
        /^https:\/\/api\.financeapp\.com/,
      ],
      
      // Custom sampling
      sessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,
      errorSampleRate: 1.0,
    }),
  ],
  
  // Additional configuration
  initialScope: {
    tags: {
      component: 'client',
      framework: 'nextjs',
    },
    level: 'info',
  },
  
  // Transport options
  transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
  
  // Ignore specific URLs/patterns
  denyUrls: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    
    // Ad blockers
    /blocked-by-client/i,
    
    // Development tools
    /__webpack_hmr/i,
    /_next\/webpack-hmr/i,
  ],
});