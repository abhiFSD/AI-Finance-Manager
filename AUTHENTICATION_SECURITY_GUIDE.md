# Authentication Security Guide

This document outlines the security implementation of the Finance App authentication system.

## Overview

The authentication system has been completely overhauled from a mock in-memory system to a production-ready database-integrated solution using Prisma ORM with PostgreSQL.

## Security Features

### 1. Password Security
- **Hashing**: Uses bcryptjs with 12 salt rounds for password hashing
- **Validation**: Enforces strong password requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter  
  - At least one number
  - At least one special character (@$!%*?&)

### 2. JWT Token Management
- **Access Tokens**: Short-lived (15 minutes) for API access
- **Refresh Tokens**: Long-lived (7 days) for token renewal
- **Token Structure**: Includes user ID, email, role, and standard claims
- **Verification**: Proper JWT signature verification with issuer/audience validation

### 3. Session Management
- **Database Sessions**: All sessions stored in PostgreSQL via Prisma
- **Session Tracking**: Unique session tokens for each login
- **Session Cleanup**: Automatic cleanup of expired sessions
- **Multi-device Support**: Users can log out from all devices

### 4. Rate Limiting
- **Authentication Endpoints**: 5 attempts per 15 minutes per IP
- **Registration Endpoint**: 3 attempts per hour per IP
- **Custom Limiters**: Configurable rate limiting for sensitive operations

### 5. Input Validation & Sanitization
- **Schema Validation**: Using Joi for comprehensive input validation
- **SQL Injection Protection**: Pattern detection for malicious SQL
- **XSS Protection**: Input sanitization against cross-site scripting
- **Data Sanitization**: Automatic cleaning of user inputs

### 6. Middleware Security
- **Authentication Verification**: Database user lookup for each request
- **Role-based Authorization**: Support for USER/ADMIN roles
- **Optional Authentication**: Non-failing auth for public endpoints
- **User Data Validation**: Ensures authenticated users can only access their data

## API Endpoints

### Authentication Routes

#### POST `/api/auth/register`
- Rate limited: 3 attempts/hour per IP
- Validates email format and password strength
- Creates user in database with hashed password
- Returns access and refresh tokens

#### POST `/api/auth/login`
- Rate limited: 5 attempts/15 minutes per IP
- Validates credentials against database
- Creates new session in database
- Returns access and refresh tokens

#### POST `/api/auth/refresh`
- Validates refresh token
- Checks session validity in database
- Issues new access token
- Returns fresh user data

#### GET `/api/auth/verify`
- Validates access token
- Returns current user information from database
- Used for token validation

#### POST `/api/auth/logout`
- Invalidates specific session in database
- Safe to call even with invalid tokens

#### POST `/api/auth/logout-all`
- Invalidates all user sessions
- Logs out from all devices

#### GET `/api/auth/profile`
- Returns fresh user profile data
- Requires valid access token

## Database Schema

### User Table
```sql
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String    # bcrypt hashed
  name          String?
  emailVerified DateTime?
  image         String?
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  sessions      Session[]
  # ... other relations
}
```

### Session Table
```sql
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Environment Variables

Required environment variables for security:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/finance_db"

# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret-key-change-this-in-production"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Security
BCRYPT_SALT_ROUNDS=12
```

## Security Best Practices Implemented

### 1. Defense in Depth
- Multiple layers of validation (client, server, database)
- Rate limiting at multiple levels
- Input sanitization and validation

### 2. Principle of Least Privilege
- Role-based access control
- Users can only access their own data
- Admin role for elevated permissions

### 3. Data Protection
- Passwords never stored in plain text
- Sensitive data excluded from API responses
- Database constraints for data integrity

### 4. Session Security
- Session tokens stored securely in database
- Automatic session cleanup
- Support for session invalidation

### 5. Error Handling
- Consistent error response format
- No sensitive information in error messages
- Proper HTTP status codes

## Middleware Usage

### Authentication Middleware
```typescript
import { authenticateToken } from '../middleware/auth';

// Protect routes
router.get('/protected', authenticateToken, handler);
```

### Role-based Authorization
```typescript
import { authenticateToken, requireRole } from '../middleware/auth';

// Admin only routes
router.get('/admin', authenticateToken, requireRole('ADMIN'), handler);
```

### Optional Authentication
```typescript
import { optionalAuth } from '../middleware/auth';

// Public routes with optional user context
router.get('/public', optionalAuth, handler);
```

## Testing

Comprehensive test suite included covering:
- Password hashing and verification
- JWT token generation and validation
- User registration and login flows
- Token verification and refresh
- Protected route access
- Error handling scenarios

Run tests with:
```bash
npm test src/__tests__/auth.test.ts
```

## Security Considerations

### Production Deployment
1. Use strong, unique JWT secret
2. Enable HTTPS in production
3. Configure proper CORS settings
4. Implement proper logging and monitoring
5. Regular security updates for dependencies

### Monitoring
- Track failed authentication attempts
- Monitor for suspicious patterns
- Log security events
- Set up alerts for unusual activity

### Additional Security Measures
- Consider implementing 2FA for sensitive accounts
- Add account lockout after multiple failed attempts
- Implement password reset functionality
- Add email verification for new registrations

## Migration from Mock System

The previous mock authentication system has been completely replaced:
- ❌ In-memory user array removed
- ✅ Database integration with Prisma
- ✅ Proper password hashing
- ✅ Session management
- ✅ Input validation
- ✅ Rate limiting
- ✅ Comprehensive error handling

All endpoints maintain the same API contract but now provide production-ready security.