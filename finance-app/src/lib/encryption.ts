/**
 * Advanced encryption utilities for sensitive data protection
 * Provides AES-256-GCM encryption for data at rest and in transit
 */

import crypto from 'crypto'
import { getSecurityConfig } from './config'

const securityConfig = getSecurityConfig()
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // For GCM, this is 12 bytes, but we'll use 16 for compatibility
const TAG_LENGTH = 16
const SALT_LENGTH = 32

export interface EncryptionResult {
  encrypted: string
  iv: string
  tag: string
  salt?: string
}

export interface DecryptionResult {
  decrypted: string
  success: boolean
  error?: string
}

/**
 * Derive encryption key from master key and salt using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256')
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encryptData(data: string, useKeyDerivation: boolean = true): EncryptionResult {
  try {
    const iv = crypto.randomBytes(IV_LENGTH)
    let key: Buffer
    let salt: Buffer | undefined

    if (useKeyDerivation) {
      salt = crypto.randomBytes(SALT_LENGTH)
      key = deriveKey(securityConfig.encryptionKey, salt)
    } else {
      key = Buffer.from(securityConfig.encryptionKey, 'utf8')
      if (key.length !== 32) {
        // Pad or truncate to 32 bytes
        const paddedKey = Buffer.alloc(32)
        key.copy(paddedKey)
        key = paddedKey
      }
    }

    const cipher = crypto.createCipher(ALGORITHM, key)
    cipher.setAAD(Buffer.from('finance-app-aad'))

    let encrypted = cipher.update(data, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const tag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      salt: salt?.toString('base64')
    }
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt data encrypted with encryptData
 */
export function decryptData(
  encryptedData: string,
  iv: string,
  tag: string,
  salt?: string
): DecryptionResult {
  try {
    let key: Buffer

    if (salt) {
      const saltBuffer = Buffer.from(salt, 'base64')
      key = deriveKey(securityConfig.encryptionKey, saltBuffer)
    } else {
      key = Buffer.from(securityConfig.encryptionKey, 'utf8')
      if (key.length !== 32) {
        const paddedKey = Buffer.alloc(32)
        key.copy(paddedKey)
        key = paddedKey
      }
    }

    const decipher = crypto.createDecipher(ALGORITHM, key)
    decipher.setAAD(Buffer.from('finance-app-aad'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return {
      decrypted,
      success: true
    }
  } catch (error) {
    console.error('Decryption failed:', error)
    return {
      decrypted: '',
      success: false,
      error: 'Failed to decrypt data'
    }
  }
}

/**
 * Encrypt sensitive user data (PII, financial data)
 */
export function encryptSensitiveData(data: Record<string, any>): string {
  const jsonData = JSON.stringify(data)
  const result = encryptData(jsonData, true)
  
  // Combine all components into a single string
  return `${result.encrypted}:${result.iv}:${result.tag}:${result.salt}`
}

/**
 * Decrypt sensitive user data
 */
export function decryptSensitiveData(encryptedString: string): Record<string, any> | null {
  try {
    const parts = encryptedString.split(':')
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format')
    }

    const [encrypted, iv, tag, salt] = parts
    const result = decryptData(encrypted, iv, tag, salt)

    if (!result.success) {
      return null
    }

    return JSON.parse(result.decrypted)
  } catch (error) {
    console.error('Failed to decrypt sensitive data:', error)
    return null
  }
}

/**
 * Hash sensitive data for comparison (one-way)
 */
export function hashSensitiveData(data: string, salt?: string): { hash: string; salt: string } {
  const finalSalt = salt || crypto.randomBytes(32).toString('hex')
  const hash = crypto.pbkdf2Sync(data, finalSalt, 100000, 64, 'sha256').toString('hex')
  
  return {
    hash,
    salt: finalSalt
  }
}

/**
 * Verify hashed sensitive data
 */
export function verifySensitiveData(data: string, hash: string, salt: string): boolean {
  try {
    const computedHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha256').toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'))
  } catch {
    return false
  }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate cryptographically secure UUID
 */
export function generateSecureUUID(): string {
  return crypto.randomUUID()
}

/**
 * Create HMAC signature for request validation
 */
export function createHMAC(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

/**
 * Verify HMAC signature
 */
export function verifyHMAC(data: string, signature: string, secret: string): boolean {
  const expectedSignature = createHMAC(data, secret)
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

/**
 * Encrypt file data with metadata
 */
export function encryptFileData(fileBuffer: Buffer, filename: string): {
  encryptedData: string
  metadata: string
} {
  const metadata = {
    filename,
    size: fileBuffer.length,
    timestamp: Date.now(),
    checksum: crypto.createHash('sha256').update(fileBuffer).digest('hex')
  }

  const encryptedFile = encryptData(fileBuffer.toString('base64'), true)
  const encryptedMetadata = encryptData(JSON.stringify(metadata), true)

  return {
    encryptedData: `${encryptedFile.encrypted}:${encryptedFile.iv}:${encryptedFile.tag}:${encryptedFile.salt}`,
    metadata: `${encryptedMetadata.encrypted}:${encryptedMetadata.iv}:${encryptedMetadata.tag}:${encryptedMetadata.salt}`
  }
}

/**
 * Decrypt file data with verification
 */
export function decryptFileData(encryptedData: string, encryptedMetadata: string): {
  fileBuffer: Buffer | null
  metadata: any
  verified: boolean
} {
  try {
    // Decrypt metadata
    const metadata = decryptSensitiveData(encryptedMetadata)
    if (!metadata) {
      return { fileBuffer: null, metadata: null, verified: false }
    }

    // Decrypt file data
    const parts = encryptedData.split(':')
    if (parts.length !== 4) {
      return { fileBuffer: null, metadata, verified: false }
    }

    const [encrypted, iv, tag, salt] = parts
    const result = decryptData(encrypted, iv, tag, salt)

    if (!result.success) {
      return { fileBuffer: null, metadata, verified: false }
    }

    const fileBuffer = Buffer.from(result.decrypted, 'base64')

    // Verify checksum
    const currentChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    const verified = currentChecksum === metadata.checksum

    return {
      fileBuffer,
      metadata,
      verified
    }
  } catch (error) {
    console.error('File decryption failed:', error)
    return { fileBuffer: null, metadata: null, verified: false }
  }
}