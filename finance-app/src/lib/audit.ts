/**
 * Comprehensive audit logging system
 * Tracks security events, user actions, and system changes
 */

import { getSecurityConfig } from './config'

export interface AuditEvent {
  id: string
  userId?: string
  action: string
  resource?: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  success: boolean
  timestamp: Date
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: 'AUTH' | 'DATA' | 'SYSTEM' | 'SECURITY' | 'FINANCIAL'
}

export interface SecurityAlert {
  id: string
  type: SecurityEventType
  userId?: string
  ipAddress?: string
  userAgent?: string
  details: Record<string, any>
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  resolved: boolean
  timestamp: Date
}

export type SecurityEventType = 
  | 'FAILED_LOGIN'
  | 'ACCOUNT_LOCKOUT'
  | 'SUSPICIOUS_ACTIVITY'
  | 'PASSWORD_BREACH'
  | 'UNAUTHORIZED_ACCESS'
  | 'TOKEN_ABUSE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SQL_INJECTION_ATTEMPT'
  | 'XSS_ATTEMPT'
  | 'DIRECTORY_TRAVERSAL'
  | 'PRIVILEGE_ESCALATION'
  | 'DATA_BREACH_ATTEMPT'
  | 'UNUSUAL_LOGIN_PATTERN'
  | 'MULTIPLE_DEVICE_ACCESS'

class AuditLogger {
  private static instance: AuditLogger
  private auditLog: AuditEvent[] = []
  private securityAlerts: SecurityAlert[] = []
  private maxLogSize = 10000

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  /**
   * Log security-related events
   */
  logSecurityEvent(event: Omit<AuditEvent, 'id' | 'timestamp' | 'category'>): void {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      ...event,
      timestamp: new Date(),
      category: 'SECURITY'
    }

    this.addToAuditLog(auditEvent)

    // Create security alert for high/critical events
    if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
      this.createSecurityAlert(auditEvent)
    }

    // Log to external systems in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogging(auditEvent)
    }
  }

  /**
   * Log authentication events
   */
  logAuthEvent(
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'ACCOUNT_CREATED',
    userId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true
  ): void {
    this.logSecurityEvent({
      userId,
      action,
      details,
      ipAddress,
      userAgent,
      success,
      severity: success ? 'LOW' : 'MEDIUM'
    })
  }

  /**
   * Log data access events
   */
  logDataAccess(
    action: 'READ' | 'write' | 'delete' | 'export',
    resource: string,
    resourceId: string,
    userId: string,
    details?: Record<string, any>,
    success: boolean = true
  ): void {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      userId,
      action: `DATA_${action.toUpperCase()}`,
      resource,
      resourceId,
      details,
      success,
      timestamp: new Date(),
      category: 'DATA',
      severity: action === 'delete' || action === 'export' ? 'MEDIUM' : 'LOW'
    }

    this.addToAuditLog(auditEvent)
  }

  /**
   * Log financial transaction events
   */
  logFinancialEvent(
    action: string,
    transactionId: string,
    userId: string,
    amount?: number,
    details?: Record<string, any>
  ): void {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      userId,
      action,
      resource: 'transaction',
      resourceId: transactionId,
      details: { amount, ...details },
      success: true,
      timestamp: new Date(),
      category: 'FINANCIAL',
      severity: 'MEDIUM'
    }

    this.addToAuditLog(auditEvent)
  }

  /**
   * Create security alert
   */
  createSecurityAlert(auditEvent: AuditEvent): void {
    const alert: SecurityAlert = {
      id: this.generateEventId(),
      type: this.mapActionToSecurityEventType(auditEvent.action),
      userId: auditEvent.userId,
      ipAddress: auditEvent.ipAddress,
      userAgent: auditEvent.userAgent,
      details: auditEvent.details || {},
      severity: auditEvent.severity,
      resolved: false,
      timestamp: new Date()
    }

    this.securityAlerts.push(alert)

    // Auto-trigger response for critical alerts
    if (alert.severity === 'CRITICAL') {
      this.handleCriticalAlert(alert)
    }
  }

  /**
   * Check for suspicious patterns
   */
  detectSuspiciousActivity(userId: string, ipAddress: string): boolean {
    const recentEvents = this.auditLog
      .filter(event => event.timestamp > new Date(Date.now() - 30 * 60 * 1000)) // Last 30 minutes
      .filter(event => event.userId === userId || event.ipAddress === ipAddress)

    // Multiple failed logins
    const failedLogins = recentEvents.filter(event => 
      event.action === 'LOGIN_FAILURE' && !event.success
    ).length

    if (failedLogins >= 5) {
      this.logSecurityEvent({
        userId,
        action: 'SUSPICIOUS_LOGIN_PATTERN',
        details: { failedLogins, timeWindow: '30min' },
        ipAddress,
        success: false,
        severity: 'HIGH'
      })
      return true
    }

    // Multiple IP addresses for same user
    const uniqueIPs = new Set(
      recentEvents
        .filter(event => event.userId === userId)
        .map(event => event.ipAddress)
    ).size

    if (uniqueIPs >= 3) {
      this.logSecurityEvent({
        userId,
        action: 'MULTIPLE_IP_ACCESS',
        details: { uniqueIPs, timeWindow: '30min' },
        ipAddress,
        success: false,
        severity: 'MEDIUM'
      })
    }

    return false
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(timeRange: 'hour' | 'day' | 'week' = 'day'): Record<string, number> {
    const startTime = this.getStartTime(timeRange)
    const events = this.auditLog.filter(event => event.timestamp > startTime)

    return {
      totalEvents: events.length,
      failedLogins: events.filter(e => e.action === 'LOGIN_FAILURE').length,
      suspiciousActivities: events.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL').length,
      dataAccesses: events.filter(e => e.category === 'DATA').length,
      financialTransactions: events.filter(e => e.category === 'FINANCIAL').length,
      securityAlerts: this.securityAlerts.filter(a => a.timestamp > startTime).length
    }
  }

  /**
   * Export audit logs for compliance
   */
  exportAuditLogs(
    startDate: Date,
    endDate: Date,
    category?: AuditEvent['category']
  ): AuditEvent[] {
    return this.auditLog.filter(event => {
      const matchesDate = event.timestamp >= startDate && event.timestamp <= endDate
      const matchesCategory = !category || event.category === category
      return matchesDate && matchesCategory
    })
  }

  /**
   * Get unresolved security alerts
   */
  getUnresolvedAlerts(): SecurityAlert[] {
    return this.securityAlerts.filter(alert => !alert.resolved)
  }

  /**
   * Resolve security alert
   */
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.securityAlerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      this.logSecurityEvent({
        userId: resolvedBy,
        action: 'ALERT_RESOLVED',
        resourceId: alertId,
        success: true,
        severity: 'LOW'
      })
      return true
    }
    return false
  }

  // Private methods
  private addToAuditLog(event: AuditEvent): void {
    this.auditLog.push(event)

    // Rotate logs if needed
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxLogSize)
    }

    // In production, send to persistent storage
    if (process.env.NODE_ENV === 'production') {
      this.persistAuditLog(event)
    }
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private mapActionToSecurityEventType(action: string): SecurityEventType {
    const mapping: Record<string, SecurityEventType> = {
      'LOGIN_FAILURE': 'FAILED_LOGIN',
      'ACCOUNT_LOCKED': 'ACCOUNT_LOCKOUT',
      'SUSPICIOUS_LOGIN_PATTERN': 'UNUSUAL_LOGIN_PATTERN',
      'MULTIPLE_IP_ACCESS': 'MULTIPLE_DEVICE_ACCESS',
      'SQL_INJECTION_DETECTED': 'SQL_INJECTION_ATTEMPT',
      'XSS_DETECTED': 'XSS_ATTEMPT',
      'DIRECTORY_TRAVERSAL_DETECTED': 'DIRECTORY_TRAVERSAL',
      'UNAUTHORIZED_DATA_ACCESS': 'DATA_BREACH_ATTEMPT',
      'RATE_LIMIT_HIT': 'RATE_LIMIT_EXCEEDED'
    }

    return mapping[action] || 'SUSPICIOUS_ACTIVITY'
  }

  private handleCriticalAlert(alert: SecurityAlert): void {
    // In production, implement automated response
    console.error('CRITICAL SECURITY ALERT:', alert)
    
    // Auto-lock account for critical auth failures
    if (alert.type === 'FAILED_LOGIN' && alert.userId) {
      this.logSecurityEvent({
        userId: alert.userId,
        action: 'AUTO_ACCOUNT_LOCK',
        details: { reason: 'Critical security alert', alertId: alert.id },
        success: true,
        severity: 'HIGH'
      })
    }
  }

  private getStartTime(range: 'hour' | 'day' | 'week'): Date {
    const now = new Date()
    switch (range) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000)
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
  }

  private async persistAuditLog(event: AuditEvent): Promise<void> {
    // In production, save to database
    // Example: await prisma.auditLog.create({ data: event })
    console.log('Persisting audit log:', event.id)
  }

  private async sendToExternalLogging(event: AuditEvent): Promise<void> {
    // In production, send to external logging service (e.g., Splunk, ELK)
    console.log('Sending to external logging:', event.id)
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance()

// Convenience functions
export function logSecurityEvent(
  action: string,
  userId?: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string,
  success: boolean = true,
  severity: AuditEvent['severity'] = 'LOW'
) {
  auditLogger.logSecurityEvent({
    userId,
    action,
    details,
    ipAddress,
    userAgent,
    success,
    severity
  })
}

export function logAuthEvent(
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'ACCOUNT_CREATED',
  userId?: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string,
  success: boolean = true
) {
  auditLogger.logAuthEvent(action, userId, details, ipAddress, userAgent, success)
}

export function checkSuspiciousActivity(userId: string, ipAddress: string): boolean {
  return auditLogger.detectSuspiciousActivity(userId, ipAddress)
}

export function getSecurityMetrics(timeRange: 'hour' | 'day' | 'week' = 'day') {
  return auditLogger.getSecurityMetrics(timeRange)
}