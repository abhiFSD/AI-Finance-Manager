/**
 * Secure session management with Redis backend
 * Implements session rotation, concurrent session limits, and device tracking
 */

import crypto from 'crypto'
import { cache } from './cache'
import { generateSecureToken } from './encryption'
import { auditLogger } from './audit'

export interface SessionData {
  userId: string
  email: string
  role: string
  deviceId: string
  ipAddress: string
  userAgent: string
  loginTime: number
  lastActivity: number
  csrfToken: string
  isRememberMe: boolean
  permissions: string[]
}

export interface DeviceInfo {
  id: string
  name: string
  type: 'desktop' | 'mobile' | 'tablet'
  fingerprint: string
  trusted: boolean
  firstSeen: number
  lastUsed: number
}

const SESSION_PREFIX = 'session:'
const USER_SESSIONS_PREFIX = 'user_sessions:'
const DEVICE_PREFIX = 'device:'
const MAX_SESSIONS_PER_USER = 5
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const REMEMBER_ME_TIMEOUT = 30 * 24 * 60 * 60 * 1000 // 30 days

class SessionManager {
  private static instance: SessionManager

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  /**
   * Create new session with device tracking
   */
  async createSession(
    userId: string,
    email: string,
    role: string,
    ipAddress: string,
    userAgent: string,
    rememberMe: boolean = false,
    deviceFingerprint?: string
  ): Promise<{ sessionId: string; csrfToken: string; deviceTrusted: boolean }> {
    try {
      // Generate session ID and CSRF token
      const sessionId = this.generateSessionId()
      const csrfToken = generateSecureToken(32)

      // Handle device tracking
      const deviceInfo = await this.handleDeviceTracking(
        userId,
        deviceFingerprint || this.generateDeviceFingerprint(userAgent, ipAddress),
        userAgent,
        ipAddress
      )

      // Check session limits
      await this.enforceSessionLimits(userId)

      // Create session data
      const sessionData: SessionData = {
        userId,
        email,
        role,
        deviceId: deviceInfo.id,
        ipAddress,
        userAgent,
        loginTime: Date.now(),
        lastActivity: Date.now(),
        csrfToken,
        isRememberMe: rememberMe,
        permissions: await this.getUserPermissions(role)
      }

      // Store session
      const timeout = rememberMe ? REMEMBER_ME_TIMEOUT : SESSION_TIMEOUT
      await cache.set(
        `${SESSION_PREFIX}${sessionId}`,
        sessionData,
        Math.floor(timeout / 1000)
      )

      // Track user sessions
      await this.addToUserSessions(userId, sessionId, deviceInfo.id)

      // Log session creation
      auditLogger.logAuthEvent('LOGIN_SUCCESS', userId, {
        deviceId: deviceInfo.id,
        deviceTrusted: deviceInfo.trusted,
        rememberMe,
        sessionId
      }, ipAddress, userAgent)

      return {
        sessionId,
        csrfToken,
        deviceTrusted: deviceInfo.trusted
      }
    } catch (error) {
      auditLogger.logAuthEvent('LOGIN_FAILURE', userId, {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, ipAddress, userAgent, false)
      throw error
    }
  }

  /**
   * Validate and refresh session
   */
  async validateSession(sessionId: string, ipAddress?: string): Promise<{
    valid: boolean
    sessionData?: SessionData
    needsRotation?: boolean
  }> {
    try {
      const sessionData = await cache.get<SessionData>(`${SESSION_PREFIX}${sessionId}`)
      
      if (!sessionData) {
        return { valid: false }
      }

      const now = Date.now()
      const timeSinceActivity = now - sessionData.lastActivity
      
      // Check if session has expired
      const timeout = sessionData.isRememberMe ? REMEMBER_ME_TIMEOUT : SESSION_TIMEOUT
      if (timeSinceActivity > timeout) {
        await this.destroySession(sessionId)
        return { valid: false }
      }

      // Check for IP address change (security measure)
      if (ipAddress && sessionData.ipAddress !== ipAddress) {
        auditLogger.logSecurityEvent({
          userId: sessionData.userId,
          action: 'IP_ADDRESS_CHANGE',
          details: {
            oldIP: sessionData.ipAddress,
            newIP: ipAddress,
            sessionId
          },
          ipAddress,
          success: false,
          severity: 'MEDIUM'
        })

        // For high-security applications, invalidate session on IP change
        // await this.destroySession(sessionId)
        // return { valid: false }
      }

      // Update last activity
      sessionData.lastActivity = now
      await cache.set(
        `${SESSION_PREFIX}${sessionId}`,
        sessionData,
        Math.floor(timeout / 1000)
      )

      // Check if session needs rotation (every 4 hours for security)
      const needsRotation = (now - sessionData.loginTime) > (4 * 60 * 60 * 1000)

      return {
        valid: true,
        sessionData,
        needsRotation
      }
    } catch (error) {
      console.error('Session validation error:', error)
      return { valid: false }
    }
  }

  /**
   * Rotate session ID for security
   */
  async rotateSession(oldSessionId: string): Promise<string | null> {
    try {
      const sessionData = await cache.get<SessionData>(`${SESSION_PREFIX}${oldSessionId}`)
      
      if (!sessionData) {
        return null
      }

      // Generate new session ID
      const newSessionId = this.generateSessionId()

      // Update session data
      sessionData.loginTime = Date.now()
      sessionData.lastActivity = Date.now()
      sessionData.csrfToken = generateSecureToken(32)

      // Store new session
      const timeout = sessionData.isRememberMe ? REMEMBER_ME_TIMEOUT : SESSION_TIMEOUT
      await cache.set(
        `${SESSION_PREFIX}${newSessionId}`,
        sessionData,
        Math.floor(timeout / 1000)
      )

      // Update user sessions list
      await this.updateUserSessionId(sessionData.userId, oldSessionId, newSessionId)

      // Remove old session
      await cache.del(`${SESSION_PREFIX}${oldSessionId}`)

      // Log rotation
      auditLogger.logSecurityEvent({
        userId: sessionData.userId,
        action: 'SESSION_ROTATED',
        details: {
          oldSessionId,
          newSessionId,
          deviceId: sessionData.deviceId
        },
        ipAddress: sessionData.ipAddress,
        success: true,
        severity: 'LOW'
      })

      return newSessionId
    } catch (error) {
      console.error('Session rotation error:', error)
      return null
    }
  }

  /**
   * Destroy specific session
   */
  async destroySession(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await cache.get<SessionData>(`${SESSION_PREFIX}${sessionId}`)
      
      if (sessionData) {
        // Remove from user sessions
        await this.removeFromUserSessions(sessionData.userId, sessionId)

        // Log logout
        auditLogger.logAuthEvent('LOGOUT', sessionData.userId, {
          sessionId,
          deviceId: sessionData.deviceId
        }, sessionData.ipAddress, sessionData.userAgent)
      }

      // Remove session
      await cache.del(`${SESSION_PREFIX}${sessionId}`)
      return true
    } catch (error) {
      console.error('Session destruction error:', error)
      return false
    }
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    try {
      const sessionIds = await this.getUserSessionIds(userId)
      let destroyedCount = 0

      for (const sessionId of sessionIds) {
        if (sessionId !== exceptSessionId) {
          const destroyed = await this.destroySession(sessionId)
          if (destroyed) destroyedCount++
        }
      }

      // Log mass session destruction
      auditLogger.logSecurityEvent({
        userId,
        action: 'ALL_SESSIONS_DESTROYED',
        details: {
          destroyedCount,
          exceptSessionId
        },
        success: true,
        severity: 'MEDIUM'
      })

      return destroyedCount
    } catch (error) {
      console.error('Mass session destruction error:', error)
      return 0
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Array<{
    sessionId: string
    deviceInfo: DeviceInfo
    lastActivity: number
    ipAddress: string
    current?: boolean
  }>> {
    try {
      const sessionIds = await this.getUserSessionIds(userId)
      const sessions = []

      for (const sessionId of sessionIds) {
        const sessionData = await cache.get<SessionData>(`${SESSION_PREFIX}${sessionId}`)
        if (sessionData) {
          const deviceInfo = await cache.get<DeviceInfo>(`${DEVICE_PREFIX}${sessionData.deviceId}`)
          
          sessions.push({
            sessionId,
            deviceInfo: deviceInfo || {
              id: sessionData.deviceId,
              name: 'Unknown Device',
              type: 'desktop' as const,
              fingerprint: '',
              trusted: false,
              firstSeen: sessionData.loginTime,
              lastUsed: sessionData.lastActivity
            },
            lastActivity: sessionData.lastActivity,
            ipAddress: sessionData.ipAddress
          })
        }
      }

      return sessions.sort((a, b) => b.lastActivity - a.lastActivity)
    } catch (error) {
      console.error('Get user sessions error:', error)
      return []
    }
  }

  /**
   * Verify CSRF token
   */
  async verifyCsrfToken(sessionId: string, csrfToken: string): Promise<boolean> {
    try {
      const sessionData = await cache.get<SessionData>(`${SESSION_PREFIX}${sessionId}`)
      return sessionData?.csrfToken === csrfToken
    } catch {
      return false
    }
  }

  // Private methods
  private generateSessionId(): string {
    return `sess_${Date.now()}_${crypto.randomBytes(32).toString('hex')}`
  }

  private generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    const data = `${userAgent}:${ipAddress}:${Date.now()}`
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  private async handleDeviceTracking(
    userId: string,
    fingerprint: string,
    userAgent: string,
    ipAddress: string
  ): Promise<DeviceInfo> {
    const deviceId = crypto.createHash('sha256').update(`${userId}:${fingerprint}`).digest('hex')
    const existingDevice = await cache.get<DeviceInfo>(`${DEVICE_PREFIX}${deviceId}`)

    if (existingDevice) {
      // Update last used time
      existingDevice.lastUsed = Date.now()
      await cache.set(`${DEVICE_PREFIX}${deviceId}`, existingDevice, 30 * 24 * 60 * 60) // 30 days
      return existingDevice
    }

    // Create new device
    const deviceInfo: DeviceInfo = {
      id: deviceId,
      name: this.extractDeviceName(userAgent),
      type: this.detectDeviceType(userAgent),
      fingerprint,
      trusted: false,
      firstSeen: Date.now(),
      lastUsed: Date.now()
    }

    await cache.set(`${DEVICE_PREFIX}${deviceId}`, deviceInfo, 30 * 24 * 60 * 60) // 30 days

    // Log new device
    auditLogger.logSecurityEvent({
      userId,
      action: 'NEW_DEVICE_DETECTED',
      details: {
        deviceId,
        deviceName: deviceInfo.name,
        deviceType: deviceInfo.type
      },
      ipAddress,
      userAgent,
      success: true,
      severity: 'MEDIUM'
    })

    return deviceInfo
  }

  private async enforceSessionLimits(userId: string): Promise<void> {
    const sessionIds = await this.getUserSessionIds(userId)
    
    if (sessionIds.length >= MAX_SESSIONS_PER_USER) {
      // Remove oldest sessions
      const sessionsToRemove = sessionIds.length - MAX_SESSIONS_PER_USER + 1
      
      for (let i = 0; i < sessionsToRemove; i++) {
        await this.destroySession(sessionIds[i])
      }

      auditLogger.logSecurityEvent({
        userId,
        action: 'SESSION_LIMIT_ENFORCED',
        details: {
          removedSessions: sessionsToRemove,
          maxSessions: MAX_SESSIONS_PER_USER
        },
        success: true,
        severity: 'LOW'
      })
    }
  }

  private async getUserPermissions(role: string): Promise<string[]> {
    // Define role-based permissions
    const permissionMap: Record<string, string[]> = {
      'USER': ['read:own_data', 'write:own_data'],
      'ADMIN': ['read:all_data', 'write:all_data', 'manage:users'],
      'SUPER_ADMIN': ['*']
    }

    return permissionMap[role] || permissionMap['USER']
  }

  private async getUserSessionIds(userId: string): Promise<string[]> {
    const sessions = await cache.get<string[]>(`${USER_SESSIONS_PREFIX}${userId}`)
    return sessions || []
  }

  private async addToUserSessions(userId: string, sessionId: string, deviceId: string): Promise<void> {
    const sessions = await this.getUserSessionIds(userId)
    sessions.push(sessionId)
    await cache.set(`${USER_SESSIONS_PREFIX}${userId}`, sessions, 30 * 24 * 60 * 60)
  }

  private async removeFromUserSessions(userId: string, sessionId: string): Promise<void> {
    const sessions = await this.getUserSessionIds(userId)
    const filtered = sessions.filter(id => id !== sessionId)
    await cache.set(`${USER_SESSIONS_PREFIX}${userId}`, filtered, 30 * 24 * 60 * 60)
  }

  private async updateUserSessionId(userId: string, oldSessionId: string, newSessionId: string): Promise<void> {
    const sessions = await this.getUserSessionIds(userId)
    const index = sessions.indexOf(oldSessionId)
    if (index !== -1) {
      sessions[index] = newSessionId
      await cache.set(`${USER_SESSIONS_PREFIX}${userId}`, sessions, 30 * 24 * 60 * 60)
    }
  }

  private extractDeviceName(userAgent: string): string {
    if (userAgent.includes('iPhone')) return 'iPhone'
    if (userAgent.includes('iPad')) return 'iPad'
    if (userAgent.includes('Android')) return 'Android Device'
    if (userAgent.includes('Windows')) return 'Windows PC'
    if (userAgent.includes('Mac')) return 'Mac'
    if (userAgent.includes('Linux')) return 'Linux PC'
    return 'Unknown Device'
  }

  private detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
    if (userAgent.includes('Mobile') && !userAgent.includes('iPad')) return 'mobile'
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) return 'tablet'
    return 'desktop'
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance()

// Convenience functions
export async function createSession(
  userId: string,
  email: string,
  role: string,
  ipAddress: string,
  userAgent: string,
  rememberMe?: boolean,
  deviceFingerprint?: string
) {
  return sessionManager.createSession(userId, email, role, ipAddress, userAgent, rememberMe, deviceFingerprint)
}

export async function validateSession(sessionId: string, ipAddress?: string) {
  return sessionManager.validateSession(sessionId, ipAddress)
}

export async function destroySession(sessionId: string) {
  return sessionManager.destroySession(sessionId)
}

export async function rotateSession(sessionId: string) {
  return sessionManager.rotateSession(sessionId)
}