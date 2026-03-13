/**
 * Next.js Edge Middleware for Security and Performance
 * Implements comprehensive request validation, security headers, and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './lib/jwt'
import { securityHeaders } from './lib/security'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface SecurityConfig {
  rateLimits: {
    api: { requests: number; windowMs: number }
    auth: { requests: number; windowMs: number }
    general: { requests: number; windowMs: number }
  }
  protectedRoutes: string[]
  publicRoutes: string[]
  adminRoutes: string[]
}

const securityConfig: SecurityConfig = {
  rateLimits: {
    api: { requests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
    auth: { requests: 5, windowMs: 15 * 60 * 1000 },   // 5 auth attempts per 15 minutes
    general: { requests: 300, windowMs: 15 * 60 * 1000 } // 300 general requests per 15 minutes
  },
  protectedRoutes: [
    '/dashboard',
    '/accounts',
    '/transactions',
    '/documents',
    '/settings',
    '/api/user',
    '/api/transactions',
    '/api/documents'
  ],
  publicRoutes: [
    '/',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/api/health',
    '/api/public'
  ],
  adminRoutes: [
    '/admin',
    '/api/admin'
  ]
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  try {
    // 1. Apply security headers
    applySecurityHeaders(response)

    // 2. Rate limiting
    const rateLimitResult = await checkRateLimit(request, pathname)
    if (!rateLimitResult.allowed) {
      return new NextResponse('Rate limit exceeded', { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimitResult.resetTime)
        }
      })
    }

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit))
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime))

    // 3. Security validation
    const securityCheck = await performSecurityChecks(request, pathname)
    if (!securityCheck.passed) {
      console.warn('Security check failed:', securityCheck.reason)
      return new NextResponse('Forbidden', { status: 403 })
    }

    // 4. Authentication check for protected routes
    if (isProtectedRoute(pathname)) {
      const authResult = await checkAuthentication(request)
      if (!authResult.authenticated) {
        // Redirect to login with return URL
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('returnTo', pathname)
        return NextResponse.redirect(loginUrl)
      }

      // Check admin routes
      if (isAdminRoute(pathname) && !authResult.isAdmin) {
        return new NextResponse('Unauthorized', { status: 401 })
      }

      // Add user context to response headers (for logging)
      response.headers.set('X-User-ID', authResult.userId || '')
      response.headers.set('X-User-Role', authResult.role || 'user')
    }

    // 5. CORS handling
    if (request.method === 'OPTIONS') {
      return handleCORS(request)
    }

    // 6. Request validation for API routes
    if (pathname.startsWith('/api/')) {
      const validationResult = validateAPIRequest(request)
      if (!validationResult.valid) {
        return new NextResponse(validationResult.error, { status: 400 })
      }
    }

    // 7. CSP nonce generation
    const nonce = generateNonce()
    response.headers.set('X-Nonce', nonce)

    return response

  } catch (error) {
    console.error('Middleware error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

/**
 * Apply comprehensive security headers
 */
function applySecurityHeaders(response: NextResponse) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
}

/**
 * Advanced rate limiting with different rules for different endpoints
 */
async function checkRateLimit(request: NextRequest, pathname: string): Promise<{
  allowed: boolean
  remaining: number
  resetTime: number
  limit: number
}> {
  const clientIP = getClientIP(request)
  let config = securityConfig.rateLimits.general

  // Different rate limits for different routes
  if (pathname.startsWith('/api/')) {
    config = securityConfig.rateLimits.api
  } else if (pathname.includes('login') || pathname.includes('register') || pathname.includes('auth')) {
    config = securityConfig.rateLimits.auth
  }

  const key = `${clientIP}:${pathname.startsWith('/api/') ? 'api' : 'web'}`
  const now = Date.now()
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs

  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: windowStart + config.windowMs })
    return {
      allowed: true,
      remaining: config.requests - 1,
      resetTime: windowStart + config.windowMs,
      limit: config.requests
    }
  }

  if (existing.count >= config.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
      limit: config.requests
    }
  }

  existing.count += 1
  rateLimitStore.set(key, existing)

  return {
    allowed: true,
    remaining: config.requests - existing.count,
    resetTime: existing.resetTime,
    limit: config.requests
  }
}

/**
 * Comprehensive security checks
 */
async function performSecurityChecks(request: NextRequest, pathname: string): Promise<{
  passed: boolean
  reason?: string
}> {
  // Check for suspicious patterns
  if (containsSuspiciousPatterns(pathname)) {
    return { passed: false, reason: 'Suspicious URL pattern detected' }
  }

  // Check for SQL injection attempts
  const queryString = request.nextUrl.search
  if (containsSQLInjectionPatterns(queryString)) {
    return { passed: false, reason: 'Potential SQL injection attempt' }
  }

  // Check for XSS attempts
  if (containsXSSPatterns(queryString)) {
    return { passed: false, reason: 'Potential XSS attempt' }
  }

  // Check request size (prevent DoS)
  const contentLength = parseInt(request.headers.get('content-length') || '0')
  if (contentLength > 10 * 1024 * 1024) { // 10MB limit
    return { passed: false, reason: 'Request too large' }
  }

  // Check for directory traversal
  if (pathname.includes('../') || pathname.includes('..\\')) {
    return { passed: false, reason: 'Directory traversal attempt' }
  }

  return { passed: true }
}

/**
 * Enhanced authentication check
 */
async function checkAuthentication(request: NextRequest): Promise<{
  authenticated: boolean
  userId?: string
  role?: string
  isAdmin?: boolean
}> {
  const authHeader = request.headers.get('Authorization')
  const sessionCookie = request.cookies.get('session-token')

  let token: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else if (sessionCookie) {
    token = sessionCookie.value
  }

  if (!token) {
    return { authenticated: false }
  }

  try {
    const payload = await verifyToken(token)
    if (!payload) {
      return { authenticated: false }
    }

    return {
      authenticated: true,
      userId: payload.userId,
      role: payload.role,
      isAdmin: payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN'
    }
  } catch {
    return { authenticated: false }
  }
}

/**
 * Handle CORS preflight requests
 */
function handleCORS(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin')
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']

  const response = new NextResponse(null, { status: 204 })
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}

/**
 * Validate API requests
 */
function validateAPIRequest(request: NextRequest): { valid: boolean; error?: string } {
  const contentType = request.headers.get('content-type')
  
  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    if (!contentType?.includes('application/json') && !contentType?.includes('multipart/form-data')) {
      return { valid: false, error: 'Invalid content type' }
    }
  }

  // Validate required headers
  const userAgent = request.headers.get('user-agent')
  if (!userAgent || userAgent.length < 10) {
    return { valid: false, error: 'Invalid user agent' }
  }

  return { valid: true }
}

/**
 * Helper functions
 */
function isProtectedRoute(pathname: string): boolean {
  return securityConfig.protectedRoutes.some(route => 
    pathname.startsWith(route) || pathname === route
  )
}

function isAdminRoute(pathname: string): boolean {
  return securityConfig.adminRoutes.some(route => 
    pathname.startsWith(route) || pathname === route
  )
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const remoteIP = request.headers.get('remote-addr')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || remoteIP || 'unknown'
}

function containsSuspiciousPatterns(pathname: string): boolean {
  const suspiciousPatterns = [
    /wp-admin|wp-login|xmlrpc\.php/i,
    /\.php$|\.asp$|\.jsp$/i,
    /\/admin\/|\/administrator\//i,
    /\/config\.|\/\.env/i,
    /\/etc\/passwd|\/proc\//i
  ]
  
  return suspiciousPatterns.some(pattern => pattern.test(pathname))
}

function containsSQLInjectionPatterns(queryString: string): boolean {
  const sqlPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b)/i,
    /(\'\s*;\s*\w+)|(\w+\s*=\s*\w+\s*--)/i,
    /(\'\s*(or|and)\s*\'\w*\'\s*=\s*\'\w*\')/i
  ]
  
  return sqlPatterns.some(pattern => pattern.test(queryString))
}

function containsXSSPatterns(queryString: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>.*?<\/iframe>/gi
  ]
  
  return xssPatterns.some(pattern => pattern.test(queryString))
}

function generateNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'next-action' }
      ]
    }
  ]
}