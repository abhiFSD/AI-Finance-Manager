import bcrypt from 'bcrypt'
import crypto from 'crypto'

const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt with 12 salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    return hash
  } catch (error) {
    console.error('Password hashing failed:', error)
    throw new Error('Failed to hash password')
  }
}

/**
 * Compare a plaintext password with a hashed password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hash)
    return isValid
  } catch (error) {
    console.error('Password comparison failed:', error)
    return false
  }
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  const allChars = lowercase + uppercase + numbers + symbols
  let password = ''
  
  // Ensure at least one character from each category
  password += lowercase[crypto.randomInt(0, lowercase.length)]
  password += uppercase[crypto.randomInt(0, uppercase.length)]
  password += numbers[crypto.randomInt(0, numbers.length)]
  password += symbols[crypto.randomInt(0, symbols.length)]
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('')
}

/**
 * Validate password strength
 */
export interface PasswordStrength {
  isValid: boolean
  score: number // 0-100
  issues: string[]
  suggestions: string[]
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const issues: string[] = []
  const suggestions: string[] = []
  let score = 0
  
  // Length check
  if (password.length < 8) {
    issues.push('Password must be at least 8 characters long')
    suggestions.push('Use at least 8 characters')
  } else if (password.length < 12) {
    score += 10
    suggestions.push('Consider using 12+ characters for better security')
  } else {
    score += 25
  }
  
  // Character variety checks
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  
  if (!hasLowercase) {
    issues.push('Password must contain lowercase letters')
    suggestions.push('Add lowercase letters (a-z)')
  } else {
    score += 15
  }
  
  if (!hasUppercase) {
    issues.push('Password must contain uppercase letters')
    suggestions.push('Add uppercase letters (A-Z)')
  } else {
    score += 15
  }
  
  if (!hasNumbers) {
    issues.push('Password must contain numbers')
    suggestions.push('Add numbers (0-9)')
  } else {
    score += 15
  }
  
  if (!hasSymbols) {
    issues.push('Password must contain special characters')
    suggestions.push('Add special characters (!@#$%^&*)')
  } else {
    score += 20
  }
  
  // Common patterns check
  const commonPasswords = [
    'password', 'password123', '123456', 'qwerty', 'admin', 'login',
    'welcome', 'monkey', '1234567890', 'abc123', 'password1'
  ]
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    issues.push('Password contains common patterns')
    suggestions.push('Avoid common words and patterns')
    score -= 30
  }
  
  // Sequential characters check
  const hasSequential = /(.)\1{2,}/.test(password) || 
                       /123|234|345|456|567|678|789|890|abc|bcd|cde/.test(password.toLowerCase())
  
  if (hasSequential) {
    issues.push('Password contains sequential characters')
    suggestions.push('Avoid sequential characters or repeated patterns')
    score -= 20
  } else {
    score += 10
  }
  
  // Bonus for length
  if (password.length > 16) score += 10
  
  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score))
  
  return {
    isValid: issues.length === 0 && score >= 70,
    score,
    issues,
    suggestions
  }
}

/**
 * Generate a secure random token for password reset, email verification, etc.
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate backup codes for 2FA
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    // Generate 8-digit codes with hyphens for readability
    const code = crypto.randomInt(10000000, 99999999).toString()
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`
    codes.push(formattedCode)
  }
  return codes
}

/**
 * Hash backup codes for secure storage
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const hashedCodes = await Promise.all(
    codes.map(code => hashPassword(code))
  )
  return hashedCodes
}

/**
 * Verify a backup code against stored hashes
 */
export async function verifyBackupCode(code: string, hashedCodes: string[]): Promise<boolean> {
  for (const hashedCode of hashedCodes) {
    const isValid = await comparePassword(code, hashedCode)
    if (isValid) return true
  }
  return false
}