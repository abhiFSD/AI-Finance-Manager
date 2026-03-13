/**
 * Security utilities for the finance application
 */

// Content Security Policy headers for Next.js
export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// Input sanitization utilities
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .trim()
    .slice(0, 1000) // Limit input length
}

// Email validation with enhanced security
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length <= 254
}

// File validation for uploads
export const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Only PDF, JPEG, and PNG files are allowed.' }
  }
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size too large. Maximum size is 10MB.' }
  }
  
  // Additional filename validation
  const fileName = file.name
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName.replace(/\.[^/.]+$/, ""))) {
    return { isValid: false, error: 'Invalid filename. Use only alphanumeric characters, dots, hyphens, and underscores.' }
  }
  
  return { isValid: true }
}

// Rate limiting utility (client-side tracking)
interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const rateLimitStore: RateLimitStore = {}

export const checkRateLimit = (key: string, maxRequests: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now()
  
  if (!rateLimitStore[key] || now > rateLimitStore[key].resetTime) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + windowMs
    }
    return true
  }
  
  if (rateLimitStore[key].count >= maxRequests) {
    return false
  }
  
  rateLimitStore[key].count++
  return true
}

// Password strength validation
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Token validation utilities
export const isValidJWT = (token: string): boolean => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    
    // Basic JWT structure validation
    const header = JSON.parse(atob(parts[0]))
    const payload = JSON.parse(atob(parts[1]))
    
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

// CSRF token generation and validation
export const generateCSRFToken = (): string => {
  return crypto.randomUUID()
}

// Secure storage utilities
export const secureStorage = {
  setItem: (key: string, value: string) => {
    try {
      // In production, consider encryption
      localStorage.setItem(`secure_${key}`, btoa(value))
    } catch {
      // Handle storage errors gracefully
    }
  },
  
  getItem: (key: string): string | null => {
    try {
      const value = localStorage.getItem(`secure_${key}`)
      return value ? atob(value) : null
    } catch {
      return null
    }
  },
  
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(`secure_${key}`)
    } catch {
      // Handle errors gracefully
    }
  }
}