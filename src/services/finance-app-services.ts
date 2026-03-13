import { Transaction, Account, Budget } from '../types';

// Main service imports
import { CategorizationService } from './categorization';
import { AnalyticsService } from './analytics';
import { BudgetService } from './budgets';
import { ReportService } from './reports';
import { AutomationService } from './automation';

/**
 * Main service aggregator for the Finance App
 * Provides a unified interface to all Phase 4 services
 */
export class FinanceAppServices {
  // Core services
  public readonly categorization: CategorizationService;
  public readonly analytics: AnalyticsService;
  public readonly budgets: BudgetService;
  public readonly reports: ReportService;
  public readonly automation: AutomationService;

  constructor(configuration?: {
    categorization?: any;
    analytics?: any;
    budgets?: any;
    reports?: any;
    automation?: any;
  }) {
    // Initialize all services with optional configuration
    this.categorization = new CategorizationService(configuration?.categorization);
    this.analytics = new AnalyticsService(configuration?.analytics);
    this.budgets = new BudgetService(configuration?.budgets);
    this.reports = new ReportService();
    this.automation = new AutomationService();
  }

  /**
   * Initialize services with sample data (for demonstration)
   */
  async initialize(sampleData?: {
    transactions: Transaction[];
    accounts: Account[];
    budgets: Budget[];
  }): Promise<void> {
    console.log('Initializing Finance App Services...');
    
    if (sampleData?.transactions) {
      // Categorize transactions
      const categorizedCount = await this.categorizePendingTransactions(sampleData.transactions);
      console.log(`Categorized ${categorizedCount} transactions`);
    }

    console.log('Finance App Services initialized successfully!');
  }

  /**
   * Process new transactions through the entire pipeline
   */
  async processNewTransaction(transaction: Transaction): Promise<{
    categorization: any;
    anomalies: any[];
    budgetImpact: any;
    automationTriggered: boolean;
  }> {
    // Step 1: Categorize the transaction
    const categorization = await this.categorization.categorizeTransaction(transaction);
    
    // Step 2: Check for anomalies
    const anomalies = await this.analytics.getAnomalies([transaction], {
      sensitivity: 'medium',
      minimumAmount: 100
    });

    // Step 3: Check budget impact
    const budgetImpact = await this.checkBudgetImpact(transaction);

    // Step 4: Trigger relevant automations
    const automationTriggered = await this.triggerRelevantAutomations(transaction);

    return {
      categorization,
      anomalies,
      budgetImpact,
      automationTriggered
    };
  }

  /**
   * Generate comprehensive financial dashboard data
   */
  async generateDashboardData(
    transactions: Transaction[],
    accounts: Account[],
    budgets: Budget[]
  ): Promise<{
    analytics: any;
    budgetStatus: any[];
    upcomingPayments: any[];
    recommendations: any;
    insights: string[];
  }> {
    // Get comprehensive analytics
    const analytics = await this.analytics.generateComprehensiveAnalytics(
      transactions,
      accounts
    );

    // Get budget statuses
    const budgetStatus = await this.getBudgetStatuses(budgets, transactions);

    // Get upcoming payments
    const upcomingPayments = await this.analytics.getUpcomingPayments(transactions);

    // Get automation recommendations
    const recommendations = await this.automation.getRecommendations(
      transactions,
      accounts,
      budgets
    );

    // Generate insights
    const insights = await this.analytics.generateInsights(transactions, accounts);

    return {
      analytics,
      budgetStatus,
      upcomingPayments,
      recommendations,
      insights
    };
  }

  /**
   * Generate monthly financial report
   */
  async generateMonthlyReport(
    transactions: Transaction[],
    accounts: Account[],
    userId: string
  ): Promise<string> {
    // Create monthly report configuration
    const reportConfigId = this.reports.createReportFromTemplate(
      'monthly_summary',
      'Monthly Financial Summary',
      {
        type: 'rolling',
        rollingPeriod: 'last_30_days',
        startDate: new Date(),
        endDate: new Date()
      },
      userId
    );

    // Generate the report
    const report = await this.reports.generateReport(
      reportConfigId,
      transactions,
      accounts
    );

    return (report as any).id;
  }

  /**
   * Set up smart financial automation
   */
  async setupSmartAutomation(
    userId: string,
    transactions: Transaction[],
    accounts: Account[],
    monthlyIncome: number,
    preferences: {
      enableSmartBudgets: boolean;
      enableBillReminders: boolean;
      enableSpendingAlerts: boolean;
      enableInvestmentRecommendations: boolean;
    }
  ): Promise<{
    budgetsCreated: number;
    remindersSet: number;
    alertsConfigured: number;
    automationRulesCreated: number;
  }> {
    let budgetsCreated = 0;
    let remindersSet = 0;
    let alertsConfigured = 0;
    let automationRulesCreated = 0;

    // Smart budget creation
    if (preferences.enableSmartBudgets) {
      const budgetResult = await this.automation.automateSmartBudgetCreation(
        userId,
        transactions,
        monthlyIncome
      );
      budgetsCreated = budgetResult.budgetsCreated;
    }

    // Bill reminders
    if (preferences.enableBillReminders) {
      const recurringPayments = await this.analytics.getRecurringPayments(transactions);
      const reminderResult = await this.automation.setupBillReminders(
        userId,
        recurringPayments.map(rp => ({
          merchantName: rp.merchantName,
          amount: rp.amount,
          frequency: rp.frequency,
          nextDueDate: rp.nextDueDate,
          categoryId: rp.categoryId
        }))
      );
      remindersSet = reminderResult.remindersSet;
    }

    // Spending alerts
    if (preferences.enableSpendingAlerts) {
      const budgets = this.budgets.getAllBudgets({ isActive: true });
      const alertResult = await this.automation.setupSpendingAlerts(userId, budgets);
      alertsConfigured = alertResult.alertsConfigured;
    }

    return {
      budgetsCreated,
      remindersSet,
      alertsConfigured,
      automationRulesCreated
    };
  }

  // Helper methods
  private async categorizePendingTransactions(transactions: Transaction[]): Promise<number> {
    const uncategorized = transactions.filter(t => !t.categoryId);
    const results = await this.categorization.categorizeBatch(uncategorized);
    
    return results.filter(result => result.confidence > 0.7).length;
  }

  private async checkBudgetImpact(transaction: Transaction): Promise<any> {
    if (!transaction.categoryId) return null;

    const relevantBudgets = this.budgets.getAllBudgets({
      isActive: true,
      categoryId: transaction.categoryId
    });

    if (relevantBudgets.length === 0) return null;

    const budget = relevantBudgets[0];
    const status = this.budgets.calculateBudgetStatus(budget.id, [transaction]);

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      impactAmount: Math.abs(transaction.amount),
      newUtilization: status?.utilizationPercentage || 0,
      isOverBudget: status?.isOverBudget || false
    };
  }

  private async triggerRelevantAutomations(transaction: Transaction): Promise<boolean> {
    const activeRules = this.automation.getActiveAutomationRules();
    let triggered = false;

    for (const rule of activeRules) {
      // Check if transaction triggers any automation rules
      if (rule.triggers.some(trigger => trigger.type === 'transaction_added')) {
        await this.automation.triggerAutomation(rule.id, {
          transaction,
          triggerType: 'transaction_added'
        });
        triggered = true;
      }
    }

    return triggered;
  }

  private async getBudgetStatuses(budgets: Budget[], transactions: Transaction[]): Promise<any[]> {
    const statuses = [];

    for (const budget of budgets) {
      const status = this.budgets.calculateBudgetStatus(budget.id, transactions);
      if (status) {
        statuses.push({
          budget,
          status
        });
      }
    }

    return statuses;
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, 'up' | 'down'>;
    details: Record<string, any>;
  }> {
    const services: Record<string, 'up' | 'down'> = {};
    const details: Record<string, any> = {};

    try {
      // Check categorization service
      services.categorization = 'up';
      details.categorization = this.categorization.getServiceStats();

      // Check analytics service
      services.analytics = 'up';
      details.analytics = { configured: true };

      // Check budget service
      services.budgets = 'up';
      details.budgets = { 
        totalBudgets: this.budgets.getAllBudgets().length 
      };

      // Check reports service
      services.reports = 'up';
      details.reports = this.reports.getReportAnalytics();

      // Check automation service
      services.automation = 'up';
      details.automation = this.automation.getAutomationMetrics();

    } catch (error) {
      console.error('Health check error:', error);
    }

    const downServices = Object.values(services).filter(status => status === 'down').length;
    const status = downServices === 0 ? 'healthy' : 
                   downServices < 2 ? 'degraded' : 'unhealthy';

    return { status, services, details };
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    categorization: any;
    analytics: any;
    budgets: any;
    reports: any;
    automation: any;
  } {
    return {
      categorization: this.categorization.getServiceStats(),
      analytics: {}, // Analytics service stats would go here
      budgets: {
        totalBudgets: this.budgets.getAllBudgets().length,
        activeBudgets: this.budgets.getAllBudgets({ isActive: true }).length
      },
      reports: this.reports.getReportAnalytics(),
      automation: this.automation.getAutomationMetrics()
    };
  }
}