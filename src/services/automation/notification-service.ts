import { NotificationRule, NotificationCondition } from './types';

export class NotificationService {
  private rules: Map<string, NotificationRule> = new Map();
  private notificationQueue: Array<{
    type: string;
    recipients: string[];
    subject: string;
    message: string;
    priority: string;
    scheduledFor: Date;
  }> = [];

  async createBillReminder(config: {
    merchantName: string;
    amount: number;
    dueDate: Date;
    reminderDays: number[];
    channels: ('email' | 'push' | 'sms')[];
  }): Promise<string> {
    const ruleId = `bill_reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const rule: NotificationRule = {
      id: ruleId,
      name: `Bill Reminder - ${config.merchantName}`,
      type: 'bill_reminder',
      isActive: true,
      conditions: [{
        field: 'due_date',
        operator: 'days_before',
        value: Math.min(...config.reminderDays)
      }],
      delivery: {
        channels: config.channels,
        frequency: 'immediate'
      },
      template: {
        subject: `Bill Reminder: ${config.merchantName}`,
        body: `Your ${config.merchantName} bill of ₹{amount} is due on {due_date}. Don't forget to pay!`,
        variables: ['amount', 'due_date', 'merchant_name']
      },
      created_at: new Date(),
      updated_at: new Date()
    };

    this.rules.set(ruleId, rule);

    // Schedule notifications for each reminder day
    config.reminderDays.forEach(days => {
      const reminderDate = new Date(config.dueDate);
      reminderDate.setDate(reminderDate.getDate() - days);
      
      if (reminderDate > new Date()) {
        this.notificationQueue.push({
          type: 'bill_reminder',
          recipients: [], // Would be populated from user settings
          subject: rule.template.subject,
          message: rule.template.body
            .replace('{amount}', config.amount.toString())
            .replace('{due_date}', config.dueDate.toDateString())
            .replace('{merchant_name}', config.merchantName),
          priority: 'medium',
          scheduledFor: reminderDate
        });
      }
    });

    return ruleId;
  }

  async createSpendingAlert(config: {
    budgetId: string;
    threshold: number;
    severity: 'warning' | 'critical';
    channels: ('email' | 'push' | 'sms')[];
    message: string;
  }): Promise<string> {
    const ruleId = `spending_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const rule: NotificationRule = {
      id: ruleId,
      name: `Spending Alert - Budget ${config.budgetId}`,
      type: 'budget_alert',
      isActive: true,
      conditions: [{
        field: 'budget_usage',
        operator: 'percentage_of',
        value: config.threshold,
        budgetId: config.budgetId
      }],
      delivery: {
        channels: config.channels,
        frequency: 'immediate'
      },
      template: {
        subject: `Budget Alert - ${config.severity.toUpperCase()}`,
        body: config.message,
        variables: ['percentage', 'budget_name', 'spent_amount', 'budget_amount']
      },
      created_at: new Date(),
      updated_at: new Date()
    };

    this.rules.set(ruleId, rule);
    return ruleId;
  }

  async sendNotification(config: {
    type: 'email' | 'push' | 'sms';
    recipients: string[];
    subject: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // In a real implementation, this would integrate with actual notification services
      console.log(`Sending ${config.type} notification:`, {
        subject: config.subject,
        message: config.message,
        recipients: config.recipients,
        priority: config.priority
      });

      // Simulate notification sending
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        messageId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async processScheduledNotifications(): Promise<void> {
    const now = new Date();
    const dueNotifications = this.notificationQueue.filter(notification => 
      notification.scheduledFor <= now
    );

    for (const notification of dueNotifications) {
      await this.sendNotification({
        type: 'push', // Default type
        recipients: notification.recipients,
        subject: notification.subject,
        message: notification.message,
        priority: notification.priority as any
      });
    }

    // Remove processed notifications
    this.notificationQueue = this.notificationQueue.filter(notification => 
      notification.scheduledFor > now
    );
  }

  getAllNotificationRules(): NotificationRule[] {
    return Array.from(this.rules.values());
  }

  updateNotificationRule(id: string, updates: Partial<NotificationRule>): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;

    Object.assign(rule, {
      ...updates,
      updated_at: new Date()
    });

    return true;
  }

  deleteNotificationRule(id: string): boolean {
    return this.rules.delete(id);
  }

  getNotificationStats(): {
    totalRules: number;
    activeRules: number;
    rulesByType: Record<string, number>;
    queueSize: number;
  } {
    const rules = Array.from(this.rules.values());
    const rulesByType: Record<string, number> = {};

    rules.forEach(rule => {
      rulesByType[rule.type] = (rulesByType[rule.type] || 0) + 1;
    });

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      rulesByType,
      queueSize: this.notificationQueue.length
    };
  }
}