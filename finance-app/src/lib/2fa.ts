/**
 * Two-Factor Authentication implementation using TOTP
 * Provides secure 2FA functionality for user accounts
 */

import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import crypto from 'crypto'

export interface TwoFactorSetupResult {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
  manualEntryKey: string
}

export interface TwoFactorVerifyResult {
  isValid: boolean
  usedBackupCode?: boolean
  remainingBackupCodes?: number
}

/**
 * Generate 2FA secret and QR code for user setup
 */
export async function generateTwoFactorSetup(
  userEmail: string,
  serviceName: string = 'Finance App'
): Promise<TwoFactorSetupResult> {
  try {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: serviceName,
      length: 32
    })

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

    // Generate backup codes
    const backupCodes = generateBackupCodes()

    return {
      secret: secret.base32!,
      qrCodeUrl,
      backupCodes,
      manualEntryKey: secret.base32!
    }
  } catch (error) {
    console.error('2FA setup generation failed:', error)
    throw new Error('Failed to generate 2FA setup')
  }
}

/**
 * Verify TOTP token or backup code
 */
export function verifyTwoFactorToken(
  token: string,
  secret: string,
  backupCodes: string[] = [],
  window: number = 2
): TwoFactorVerifyResult {
  try {
    // Remove spaces and convert to uppercase
    const cleanToken = token.replace(/\s/g, '').toUpperCase()

    // First try TOTP verification
    const isValidTOTP = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: cleanToken,
      window
    })

    if (isValidTOTP) {
      return {
        isValid: true,
        usedBackupCode: false
      }
    }

    // Try backup codes if TOTP fails
    const backupCodeIndex = backupCodes.findIndex(code => 
      code.replace(/\s/g, '').toUpperCase() === cleanToken
    )

    if (backupCodeIndex !== -1) {
      // Remove used backup code
      backupCodes.splice(backupCodeIndex, 1)
      return {
        isValid: true,
        usedBackupCode: true,
        remainingBackupCodes: backupCodes.length
      }
    }

    return { isValid: false }
  } catch (error) {
    console.error('2FA token verification failed:', error)
    return { isValid: false }
  }
}

/**
 * Generate secure backup codes
 */
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`
    codes.push(formattedCode)
  }
  return codes
}

/**
 * Generate current TOTP for testing (dev only)
 */
export function generateCurrentTOTP(secret: string): string {
  return speakeasy.totp({
    secret,
    encoding: 'base32'
  })
}

/**
 * Validate 2FA secret format
 */
export function isValidTwoFactorSecret(secret: string): boolean {
  try {
    // Check if secret is valid base32
    return /^[A-Z2-7]+=*$/i.test(secret) && secret.length >= 16
  } catch {
    return false
  }
}

/**
 * Recovery - regenerate backup codes
 */
export function regenerateBackupCodes(): string[] {
  return generateBackupCodes(10)
}