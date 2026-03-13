import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, getUserById, TokenPayload } from '../utils/auth';
import prisma from '../lib/prisma';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        name?: string;
        emailVerified?: Date | null;
      };
    }
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  emailVerified?: Date | null;
}

// Authentication middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        }
      });
    }

    // Verify JWT token using our utility function
    const decoded = verifyAccessToken(token);
    
    // Fetch fresh user data from database
    const user = await getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found or has been deactivated'
        }
      });
    }

    // Add user to request object with additional fields
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || undefined,
      emailVerified: user.emailVerified,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Token has expired') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token has expired'
          }
        });
      }
      
      if (error.message === 'Invalid token') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid access token'
          }
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        // Verify JWT token using our utility function
        const decoded = verifyAccessToken(token);
        
        // Fetch fresh user data from database
        const user = await getUserById(decoded.id);

        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name || undefined,
            emailVerified: user.emailVerified,
          };
        }
      } catch (error) {
        // Token verification failed, but we continue without user
        console.warn('Optional authentication failed:', error);
      }
    }

    next();
  } catch (error) {
    // Continue without user if there's any error
    console.warn('Optional authentication error:', error);
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

// User ID validation middleware
export const validateUserId = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.userId || req.headers['user-id'] as string;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'User ID is required'
      }
    });
  }

  // Ensure the authenticated user can only access their own data (unless they're an admin)
  if (req.user && req.user.id !== userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied: You can only access your own data'
      }
    });
  }

  next();
};

// Rate limiting middleware for sensitive operations
export const sensitiveOperationLimiter = (windowMs: number = 15 * 60 * 1000, max: number = 5) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const record = attempts.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count++;
    }
    
    attempts.set(key, record);
    
    if (record.count > max) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later'
        }
      });
    }
    
    next();
  };
};

// Middleware to check if email is verified
export const requireEmailVerification = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification required to access this resource'
      }
    });
  }

  next();
};