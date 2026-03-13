import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const BCRYPT_SALT_ROUNDS = 12;

// Types
export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  id: string;
  sessionId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  } catch (error) {
    throw new Error('Failed to hash password');
  }
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Failed to verify password');
  }
}

// JWT utilities
export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'finance-app',
      audience: 'finance-app-users',
    });
  } catch (error) {
    throw new Error('Failed to generate access token');
  }
}

export function generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'finance-app',
      audience: 'finance-app-users',
    });
  } catch (error) {
    throw new Error('Failed to generate refresh token');
  }
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'finance-app',
      audience: 'finance-app-users',
    }) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: 'finance-app',
      audience: 'finance-app-users',
    }) as RefreshTokenPayload;
    
    if (payload.type !== 'refresh') {
      throw new Error('Invalid refresh token type');
    }
    
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw new Error('Refresh token verification failed');
  }
}

// Session management
export async function createSession(userId: string): Promise<{ sessionId: string; sessionToken: string; expiresAt: Date }> {
  try {
    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Create session in database
    const session = await prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires: expiresAt,
      },
    });

    return {
      sessionId: session.id,
      sessionToken: session.sessionToken,
      expiresAt: session.expires,
    };
  } catch (error) {
    throw new Error('Failed to create session');
  }
}

export async function findValidSession(sessionToken: string): Promise<{ id: string; userId: string; expires: Date } | null> {
  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      select: {
        id: true,
        userId: true,
        expires: true,
      },
    });

    if (!session || session.expires < new Date()) {
      return null;
    }

    return session;
  } catch (error) {
    throw new Error('Failed to find session');
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await prisma.session.delete({
      where: { id: sessionId },
    });
  } catch (error) {
    // Silently fail if session doesn't exist
    console.warn('Failed to delete session:', error);
  }
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: { userId },
    });
  } catch (error) {
    throw new Error('Failed to delete user sessions');
  }
}

// Clean up expired sessions (should be called periodically)
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
    return 0;
  }
}

// Generate authentication tokens
export async function generateAuthTokens(userId: string, userEmail: string, userRole: string): Promise<AuthTokens> {
  try {
    // Create a new session
    const session = await createSession(userId);

    // Generate access token
    const accessToken = generateAccessToken({
      id: userId,
      email: userEmail,
      role: userRole,
    });

    // Generate refresh token
    const refreshToken = generateRefreshToken({
      id: userId,
      sessionId: session.sessionId,
      type: 'refresh',
    });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    throw new Error('Failed to generate authentication tokens');
  }
}

// Validate user credentials and return user data
export async function validateUserCredentials(email: string, password: string) {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return null;
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    // Return user data without password
    const { password: _, ...userData } = user;
    return userData;
  } catch (error) {
    throw new Error('Failed to validate user credentials');
  }
}

// Create new user in database
export async function createUser(email: string, password: string, name?: string) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create user');
  }
}

// Get user by ID
export async function getUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  } catch (error) {
    throw new Error('Failed to get user');
  }
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; user: any }> {
  try {
    // Verify refresh token
    const refreshPayload = verifyRefreshToken(refreshToken);
    
    // Check if session is still valid
    const session = await prisma.session.findUnique({
      where: { id: refreshPayload.sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            image: true,
          },
        },
      },
    });

    if (!session || session.expires < new Date() || session.userId !== refreshPayload.id) {
      throw new Error('Invalid or expired session');
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    });

    return {
      accessToken,
      user: session.user,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to refresh access token');
  }
}