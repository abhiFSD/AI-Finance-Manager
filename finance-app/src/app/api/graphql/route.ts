import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { typeDefs } from '@/lib/graphql/schema';
import { resolvers, GraphQLContext } from '@/lib/graphql/resolvers';
import { dataLoaders } from '@/lib/graphql/dataloaders';
import { cache } from '@/lib/cache';
import { recordHttpRequest, recordError } from '@/app/api/metrics/route';
import { NextRequest, NextResponse } from 'next/server';

// GraphQL complexity analysis
import depthLimit from 'graphql-depth-limit';
import costAnalysis from 'graphql-cost-analysis';

// Security plugins
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';

// Create Apollo Server with security and performance optimizations
const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  
  // Disable GraphQL Playground in production
  plugins: [
    // Disable introspection and playground in production
    ...(process.env.NODE_ENV === 'production' 
      ? [ApolloServerPluginLandingPageDisabled()]
      : []
    ),
    
    // Cache control plugin
    ApolloServerPluginCacheControl({
      defaultMaxAge: 300, // 5 minutes
      calculateHttpHeaders: false,
    }),
    
    // Performance monitoring plugin
    {
      requestDidStart() {
        return {
          willSendResponse(requestContext) {
            const { request, response } = requestContext;
            const operationName = request.operationName || 'unknown';
            const duration = Date.now() - requestContext.request.http?.startTime;
            
            // Record metrics
            recordHttpRequest('POST', '/api/graphql', 200, duration);
            
            // Add performance headers
            response.http.headers.set('x-operation-name', operationName);
            response.http.headers.set('x-response-time', `${duration}ms`);
          },
          
          didEncounterErrors(requestContext) {
            const errors = requestContext.errors;
            for (const error of errors) {
              recordError('graphql', 'error');
              
              // Log error details in development
              if (process.env.NODE_ENV === 'development') {
                console.error('GraphQL Error:', error);
              }
            }
          },
        };
      },
    },
    
    // Rate limiting plugin
    {
      requestDidStart() {
        return {
          async didResolveOperation(requestContext) {
            const { request } = requestContext;
            const clientId = getClientIdentifier(requestContext.request.http);
            
            // Apply rate limiting based on operation complexity
            const complexity = estimateQueryComplexity(request.query);
            if (complexity > 1000) {
              throw new Error('Query too complex');
            }
            
            // Check rate limits
            const rateLimitResult = await cache.checkRateLimit(
              `graphql:${clientId}`,
              100, // 100 requests
              60   // per minute
            );
            
            if (!rateLimitResult.allowed) {
              throw new Error('Rate limit exceeded');
            }
          },
        };
      },
    },
  ],
  
  // Security validations
  validationRules: [
    depthLimit(10), // Maximum query depth
    costAnalysis({
      maximumCost: 1000,
      createError: (max, actual) => {
        const message = `Query cost ${actual} exceeds maximum cost ${max}`;
        recordError('graphql', 'query_too_complex');
        return new Error(message);
      },
    }),
  ],
  
  // Introspection and playground settings
  introspection: process.env.NODE_ENV !== 'production',
  
  // Error formatting
  formatError: (err) => {
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production') {
      // Log full error internally
      console.error('GraphQL Error:', err);
      
      // Return sanitized error to client
      if (err.message.includes('Authentication') || 
          err.message.includes('access denied') ||
          err.message.includes('Rate limit')) {
        return err;
      }
      
      return new Error('Internal server error');
    }
    
    return err;
  },
});

// Context creation function
async function createContext(request: NextRequest): Promise<GraphQLContext> {
  // Extract user from authentication header
  const authHeader = request.headers.get('authorization');
  let user = null;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    user = await validateToken(token);
  }
  
  return {
    user,
    dataloaders: dataLoaders,
    cache,
  };
}

// Create Next.js handler
const handler = startServerAndCreateNextHandler(server, {
  context: createContext,
});

// Wrap handler with additional middleware
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Add CORS headers for GraphQL Playground
    const response = await handler(request);
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
  } catch (error) {
    recordError('graphql_handler', 'error');
    console.error('GraphQL Handler Error:', error);
    
    return NextResponse.json(
      { error: 'GraphQL server error' },
      { status: 500 }
    );
  } finally {
    recordHttpRequest('GET', '/api/graphql', 200, Date.now() - startTime);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  request.http = { ...request.http, startTime };
  
  try {
    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }
    
    // Check request size
    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > 1024 * 1024) { // 1MB limit
      recordError('graphql', 'request_too_large');
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      );
    }
    
    const response = await handler(request);
    
    // Add cache headers for certain operations
    const isCacheable = await isCacheableOperation(request);
    if (isCacheable) {
      response.headers.set('Cache-Control', 'public, max-age=300');
    } else {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
  } catch (error) {
    recordError('graphql_handler', 'error');
    console.error('GraphQL Handler Error:', error);
    
    return NextResponse.json(
      { error: 'GraphQL server error' },
      { status: 500 }
    );
  } finally {
    recordHttpRequest('POST', '/api/graphql', 200, Date.now() - startTime);
  }
}

// Helper functions
async function validateToken(token: string): Promise<any> {
  try {
    // Mock token validation - replace with actual JWT validation
    if (token === 'valid-token') {
      return {
        id: '1',
        email: 'user@example.com',
      };
    }
    return null;
  } catch (error) {
    recordError('auth', 'token_validation_failed');
    return null;
  }
}

function getClientIdentifier(request: any): string {
  // Extract client identifier for rate limiting
  const forwarded = request.headers?.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers?.get('x-real-ip') || 'unknown';
  return ip;
}

function estimateQueryComplexity(query: string): number {
  // Simple complexity estimation based on query length and nesting
  const depth = (query.match(/{/g) || []).length;
  const fieldCount = (query.match(/\w+:/g) || []).length;
  return depth * 10 + fieldCount;
}

async function isCacheableOperation(request: NextRequest): Promise<boolean> {
  try {
    const body = await request.text();
    const { query, operationName } = JSON.parse(body);
    
    // Only cache queries, not mutations or subscriptions
    if (query.trim().startsWith('mutation') || query.trim().startsWith('subscription')) {
      return false;
    }
    
    // Don't cache user-specific data
    const userSpecificOperations = ['me', 'dashboard', 'accounts'];
    if (userSpecificOperations.some(op => query.includes(op))) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Options for different HTTP methods
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';