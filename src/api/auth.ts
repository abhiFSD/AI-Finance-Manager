import express from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '@/utils/config';
import {
  createUser,
  validateUserCredentials,
  generateAuthTokens,
  refreshAccessToken,
  getUserById,
  verifyAccessToken,
  deleteSession,
  deleteAllUserSessions,
  findValidSession,
} from '../utils/auth';
import {
  validateInput,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  sanitizeInput,
} from '../utils/validation';
import prisma from '../lib/prisma';

const router = express.Router();

// Rate limiting configuration
const authLimiter = rateLimit({
  windowMs: config.rateLimiting.auth.windowMs,
  max: config.rateLimiting.auth.maxAttempts,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: config.rateLimiting.register.windowMs,
  max: config.rateLimiting.register.maxAttempts,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register endpoint
router.post('/register', registerLimiter, async (req, res) => {
  try {
    // Sanitize input data
    const sanitizedData = sanitizeInput(req.body);
    
    // Validate input
    const { isValid, errors, value } = validateInput(registerSchema, sanitizedData);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const { email, password, firstName, lastName, name } = value;
    
    // Construct user name from firstName/lastName if name not provided
    const userName = name || [firstName, lastName].filter(Boolean).join(' ') || undefined;

    // Create user in database
    const user = await createUser(email, password, userName);

    // Generate authentication tokens
    const tokens = await generateAuthTokens(user.id, user.email, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error && error.message === 'User already exists') {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email address',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
    });
  }
});

// Login endpoint
router.post('/login', authLimiter, async (req, res) => {
  try {
    // Sanitize input data
    const sanitizedData = sanitizeInput(req.body);
    
    // Validate input
    const { isValid, errors, value } = validateInput(loginSchema, sanitizedData);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const { email, password } = value;

    // Validate credentials against database
    const user = await validateUserCredentials(email, password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if email is verified (optional - based on your requirements)
    // if (!user.emailVerified) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Please verify your email address before logging in',
    //   });
    // }

    // Generate authentication tokens
    const tokens = await generateAuthTokens(user.id, user.email, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;
    
    if (refreshToken) {
      try {
        // Verify and decode refresh token to get session ID
        const decoded = verifyAccessToken(refreshToken);
        if ('sessionId' in decoded) {
          await deleteSession(decoded.sessionId as string);
        }
      } catch (error) {
        // Token might be invalid, but we still want to logout successfully
        console.warn('Error deleting session during logout:', error);
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, we should still respond with success
    // as the client-side token removal is the primary logout mechanism
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No access token provided',
      });
    }

    // Verify and decode access token
    const decoded = verifyAccessToken(token);
    
    // Get fresh user data from database
    const user = await getUserById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user,
      tokenInfo: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        iat: decoded.iat,
        exp: decoded.exp,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Token has expired') {
        return res.status(401).json({
          success: false,
          message: 'Access token has expired',
          code: 'TOKEN_EXPIRED',
        });
      } else if (error.message === 'Invalid token') {
        return res.status(401).json({
          success: false,
          message: 'Invalid access token',
          code: 'INVALID_TOKEN',
        });
      }
    }

    res.status(401).json({
      success: false,
      message: 'Token verification failed',
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    // Sanitize input data
    const sanitizedData = sanitizeInput(req.body);
    
    // Validate input
    const { isValid, errors, value } = validateInput(refreshTokenSchema, sanitizedData);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const { refreshToken } = value;

    // Refresh access token
    const { accessToken, user } = await refreshAccessToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        refreshToken,
        user,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('expired') || error.message.includes('Invalid')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
          code: 'REFRESH_TOKEN_EXPIRED',
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Token refresh failed. Please login again.',
    });
  }
});

// Logout from all devices endpoint
router.post('/logout-all', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No access token provided',
      });
    }

    // Verify and decode access token
    const decoded = verifyAccessToken(token);
    
    // Delete all user sessions
    await deleteAllUserSessions(decoded.id);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout from all devices',
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No access token provided',
      });
    }

    // Verify and decode access token
    const decoded = verifyAccessToken(token);
    
    // Get fresh user data from database
    const user = await getUserById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Token has expired') {
        return res.status(401).json({
          success: false,
          message: 'Access token has expired',
          code: 'TOKEN_EXPIRED',
        });
      } else if (error.message === 'Invalid token') {
        return res.status(401).json({
          success: false,
          message: 'Invalid access token',
          code: 'INVALID_TOKEN',
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
    });
  }
});

export default router;