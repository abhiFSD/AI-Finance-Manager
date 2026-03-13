import { SignJWT, jwtVerify, JWTPayload, KeyLike } from 'jose'
import crypto from 'crypto'
import { getJWTConfig } from './config'

const jwtConfig = getJWTConfig()

// Generate RS256 key pairs for production use
export interface KeyPair {
  publicKey: KeyLike
  privateKey: KeyLike
}

let keyPair: KeyPair | null = null

async function generateKeyPair(): Promise<KeyPair> {
  const { publicKey, privateKey } = await crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  })
  
  return {
    publicKey: await crypto.createPublicKey(publicKey),
    privateKey: await crypto.createPrivateKey(privateKey),
  }
}

async function getKeyPair(): Promise<KeyPair> {
  if (!keyPair) {
    keyPair = await generateKeyPair()
  }
  return keyPair
}

export interface JWTPayloadExtended extends JWTPayload {
  userId: string
  email: string
  role: string
  sessionId?: string
  deviceId?: string
  type: 'access' | 'refresh'
}

/**
 * Generate JWT access token with RS256
 */
export async function generateAccessToken(payload: Omit<JWTPayloadExtended, 'type'>): Promise<string> {
  try {
    const { privateKey } = await getKeyPair()
    
    const token = await new SignJWT({
      ...payload,
      type: 'access'
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime(jwtConfig.accessExpiry)
      .setIssuer('finance-app')
      .setAudience('finance-app-users')
      .sign(privateKey)
    
    return token
  } catch (error) {
    console.error('Access token generation failed:', error)
    throw new Error('Failed to generate access token')
  }
}

/**
 * Generate JWT refresh token
 */
export async function generateRefreshToken(payload: Omit<JWTPayloadExtended, 'type'>): Promise<string> {
  try {
    const { privateKey } = await getKeyPair()
    
    const token = await new SignJWT({
      ...payload,
      type: 'refresh'
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime(jwtConfig.refreshExpiry)
      .setIssuer('finance-app')
      .setAudience('finance-app-users')
      .sign(privateKey)
    
    return token
  } catch (error) {
    console.error('Refresh token generation failed:', error)
    throw new Error('Failed to generate refresh token')
  }
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayloadExtended | null> {
  try {
    const { publicKey } = await getKeyPair()
    
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: 'finance-app',
      audience: 'finance-app-users',
    })
    
    return payload as JWTPayloadExtended
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Generate token pair (access + refresh)
 */
export async function generateTokenPair(payload: Omit<JWTPayloadExtended, 'type'>) {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload)
  ])
  
  return {
    accessToken,
    refreshToken,
    expiresIn: jwtConfig.accessExpiry
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }
  
  return parts[1]
}

/**
 * Generate API key token
 */
export async function generateApiKeyToken(payload: { keyId: string; permissions: string[] }): Promise<string> {
  try {
    const { privateKey } = await getKeyPair()
    
    const token = await new SignJWT({
      keyId: payload.keyId,
      permissions: payload.permissions,
      type: 'api_key'
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer('finance-app')
      .setAudience('finance-app-api')
      .sign(privateKey)
    
    return token
  } catch (error) {
    console.error('API key token generation failed:', error)
    throw new Error('Failed to generate API key token')
  }
}

/**
 * Verify API key token
 */
export async function verifyApiKeyToken(token: string): Promise<{ keyId: string; permissions: string[] } | null> {
  try {
    const { publicKey } = await getKeyPair()
    
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: 'finance-app',
      audience: 'finance-app-api',
    })
    
    if (payload.type !== 'api_key') {
      return null
    }
    
    return {
      keyId: payload.keyId as string,
      permissions: payload.permissions as string[]
    }
  } catch (error) {
    console.error('API key token verification failed:', error)
    return null
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) return true
  return Date.now() >= payload.exp * 1000
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(payload: JWTPayload): Date | null {
  if (!payload.exp) return null
  return new Date(payload.exp * 1000)
}

/**
 * Generate secure random session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex')
}