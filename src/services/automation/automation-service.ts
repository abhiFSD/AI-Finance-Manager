import { Transaction, Account, Budget } from '../../types';
import { 
  AutomationRule, 
  AutomationExecution, 
  SmartBudgetRecommendation, 
  InvestmentRecommendation, 
  DebtOptimizationStrategy,
  SavingsRecommendation,
  AutomationMetrics,
  RiskProfile,
  MarketCondition 
} from './types';

import { SmartBudgetService } from './smart-budget';
import { InvestmentRecommendationService } from './investment-recommendations';
import { DebtOptimizationService } from './debt-optimization';
import { SavingsAutomationService } from './savings-automation';
import { NotificationService } from './notification-service';

export class AutomationService {
  private smartBudgetService: SmartBudgetService;
  private investmentService: InvestmentRecommendationService;
  private debtService: DebtOptimizationService;
  private savingsService: SavingsAutomationService;
  private notificationService: NotificationService;
  
  private rules: Map<string, AutomationRule> = new Map();
  private executions: Map<string, AutomationExecution> = new Map();
  private isProcessing = false;
  private executionQueue: AutomationExecution[] = [];

  constructor() {
    this.smartBudgetService = new SmartBudgetService();
    this.investmentService = new InvestmentRecommendationService();
    this.debtService = new DebtOptimizationService();
    this.savingsService = new SavingsAutomationService();
    this.notificationService = new NotificationService();

    this.initializeDefaultRules();
    this.startAutomationEngine();
  }

  private initializeDefaultRules(): void {
    // Default budget overspend alert
    const budgetAlertRule: AutomationRule = {
      id: 'default_budget_alert',
      name: 'Budget Overspend Alert',
      description: 'Alert when budget usage exceeds 80%',
      type: 'spending_alert',
      isActive: true,
      triggers: [{
        type: 'transaction_added',
        config: {}
      }],
      actions: [{
        type: 'send_notification',
        config: {
          notification_type: 'push',
          message: 'You have used {percentage}% of your {category} budget',
          priority: 'medium'
        }
      }],
      conditions: [{
        field: 'monthly_expenses',
        operator: 'percentage_of',
        value: 80
      }],
      created_by: 'system',
      created_at: new Date(),
      updated_at: new Date(),
      execution_count: 0
    };

    // Monthly smart budget creation
    const smartBudgetRule: AutomationRule = {
      id: 'monthly_smart_budget',
      name: 'Monthly Smart Budget Creation',
      description: 'Automatically create optimized budgets each month',
      type: 'budget_creation',
      isActive: true,
      triggers: [{
        type: 'date_reached',
        config: {
          frequency: 'monthly',
          date: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          time: '09:00'
        }
      }],
      actions: [{
        type: 'create_budget',
        config: {
          budget_template: 'smart_recommended'
        }
      }],
      schedule: {
        frequency: 'monthly',
        time: '09:00',
        dayOfMonth: 1,
        startDate: new Date(),
        timezone: 'Asia/Kolkata'
      },
      created_by: 'system',
      created_at: new Date(),
      updated_at: new Date(),
      execution_count: 0
    };

    this.rules.set(budgetAlertRule.id, budgetAlertRule);
    this.rules.set(smartBudgetRule.id, smartBudgetRule);
  }

  private startAutomationEngine(): void {
    // Process automation queue every 30 seconds
    setInterval(() => {
      this.processAutomationQueue();
    }, 30000);

    // Check scheduled automations every hour
    setInterval(() => {
      this.checkScheduledAutomations();
    }, 3600000);
  }

  async generateSmartBudgetRecommendations(
    transactions: Transaction[],
    currentBudgets: Budget[],
    monthlyIncome: number
  ): Promise<SmartBudgetRecommendation[]> {
    return this.smartBudgetService.generateRecommendations(
      transactions,
      currentBudgets,
      monthlyIncome
    );
  }

  async generateInvestmentRecommendations(
    transactions: Transaction[],
    accounts: Account[],
    riskProfile: RiskProfile,
    marketConditions?: MarketCondition
  ): Promise<InvestmentRecommendation[]> {
    return this.investmentService.generateRecommendations(
      transactions,
      accounts,
      riskProfile,
      marketConditions
    );
  }

  async optimizeDebtPayments(
    debts: Array<{
      id: string;
      name: string;
      balance: number;
      interestRate: number;
      minimumPayment: number;
    }>,
    availableAmount: number
  ): Promise<DebtOptimizationStrategy> {
    return this.debtService.optimizePayments(debts, availableAmount);
  }

  async generateSavingsRecommendations(
    transactions: Transaction[],
    accounts: Account[],
    goals: Array<{
      name: string;
      targetAmount: number;
      targetDate: Date;
      priority: string;
    }>
  ): Promise<SavingsRecommendation[]> {
    return this.savingsService.generateRecommendations(transactions, accounts, goals);
  }

  async automateSmartBudgetCreation(
    userId: string,
    transactions: Transaction[],
    monthlyIncome: number
  ): Promise<{
    budgetsCreated: number;
    recommendations: SmartBudgetRecommendation[];
    success: boolean;
    message: string;
  }> {
    try {
      const recommendations = await this.generateSmartBudgetRecommendations(
        transactions,
        [], // No current budgets for fresh creation
        monthlyIncome
      );

      // Auto-create budgets for high-confidence recommendations
      const autoCreatedBudgets = recommendations.filter(rec => rec.confidence > 0.8);
      
      let budgetsCreated = 0;
      for (const recommendation of autoCreatedBudgets) {
        // In a real implementation, this would integrate with the BudgetService
        console.log(`Creating budget for ${recommendation.categoryName}: ₹${recommendation.recommendedBudget}`);
        budgetsCreated++;
      }

      return {
        budgetsCreated,
        recommendations,
        success: true,
        message: `Successfully created ${budgetsCreated} smart budgets based on your spending patterns`
      };

    } catch (error) {
      return {
        budgetsCreated: 0,
        recommendations: [],
        success: false,
        message: `Failed to create smart budgets: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async automateInvestmentAllocation(
    userId: string,
    availableAmount: number,
    riskProfile: RiskProfile
  ): Promise<{
    allocations: Array<{
      instrument: string;
      amount: number;
      percentage: number;
      reasoning: string;
    }>;
    totalAllocated: number;
    success: boolean;
    message: string;
  }> {
    try {
      const recommendations = await this.investmentService.generateAllocationStrategy(
        availableAmount,
        riskProfile
      );

      const allocations = recommendations.map(rec => ({
        instrument: rec.action.instrument || 'Unknown',
        amount: rec.action.amount || 0,
        percentage: rec.action.percentage || 0,
        reasoning: rec.reasoning
      }));

      const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);

      return {
        allocations,
        totalAllocated,
        success: true,
        message: `Successfully generated investment allocation strategy for ₹${availableAmount}`
      };

    } catch (error) {
      return {
        allocations: [],
        totalAllocated: 0,
        success: false,
        message: `Failed to generate investment allocation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async automateDebtOptimization(
    userId: string,
    debts: Array<{
      id: string;
      name: string;
      balance: number;
      interestRate: number;
      minimumPayment: number;
    }>,
    extraPayment: number
  ): Promise<{
    strategy: DebtOptimizationStrategy;
    automatedPayments: Array<{
      debtId: string;
      scheduledAmount: number;
      frequency: string;
    }>;
    success: boolean;
    message: string;
  }> {
    try {
      const strategy = await this.optimizeDebtPayments(debts, extraPayment);
      
      // Set up automated payments based on strategy
      const automatedPayments = strategy.recommendations.map(rec => ({
        debtId: rec.debtId,
        scheduledAmount: rec.recommendedPayment,
        frequency: 'monthly'
      }));

      return {
        strategy,
        automatedPayments,
        success: true,
        message: `Debt optimization strategy created. Estimated payoff time: ${strategy.payoffTimeMonths} months`
      };

    } catch (error) {
      return {
        strategy: {} as DebtOptimizationStrategy,
        automatedPayments: [],
        success: false,
        message: `Failed to optimize debt payments: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async automateRecurringSavings(
    userId: string,
    savingsGoals: Array<{
      name: string;
      targetAmount: number;
      targetDate: Date;
      priority: 'low' | 'medium' | 'high';
    }>,
    monthlyIncome: number,
    monthlyExpenses: number
  ): Promise<{
    autoSavings: Array<{
      goalName: string;
      monthlyAmount: number;
      frequency: string;
      estimatedCompletion: Date;
    }>;
    totalMonthlySavings: number;
    success: boolean;
    message: string;
  }> {
    try {
      const availableForSavings = monthlyIncome - monthlyExpenses;
      const recommendedSavingsRate = Math.min(0.3, Math.max(0.1, availableForSavings / monthlyIncome)); // 10-30%
      const totalSavingsBudget = monthlyIncome * recommendedSavingsRate;

      // Prioritize goals and allocate savings
      const sortedGoals = savingsGoals.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      const autoSavings: Array<{
        goalName: string;
        monthlyAmount: number;
        frequency: string;
        estimatedCompletion: Date;
      }> = [];

      let remainingBudget = totalSavingsBudget;

      for (const goal of sortedGoals) {
        if (remainingBudget <= 0) break;

        const monthsToTarget = Math.max(1, 
          Math.ceil((goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
        );
        
        const requiredMonthlyAmount = goal.targetAmount / monthsToTarget;
        const allocatedAmount = Math.min(requiredMonthlyAmount, remainingBudget * 0.4); // Max 40% to one goal

        if (allocatedAmount >= 100) { // Minimum ₹100 allocation
          autoSavings.push({
            goalName: goal.name,
            monthlyAmount: allocatedAmount,
            frequency: 'monthly',
            estimatedCompletion: new Date(Date.now() + (goal.targetAmount / allocatedAmount) * 30 * 24 * 60 * 60 * 1000)
          });
          
          remainingBudget -= allocatedAmount;
        }
      }

      const totalMonthlySavings = autoSavings.reduce((sum, saving) => sum + saving.monthlyAmount, 0);

      return {
        autoSavings,
        totalMonthlySavings,
        success: true,
        message: `Automated savings plan created for ${autoSavings.length} goals totaling ₹${totalMonthlySavings}/month`
      };

    } catch (error) {
      return {
        autoSavings: [],
        totalMonthlySavings: 0,
        success: false,
        message: `Failed to create automated savings: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async setupBillReminders(
    userId: string,
    recurringTransactions: Array<{
      merchantName: string;
      amount: number;
      frequency: string;
      nextDueDate: Date;
      categoryId: string;
    }>
  ): Promise<{
    remindersSet: number;
    success: boolean;
    message: string;
  }> {
    try {
      let remindersSet = 0;

      for (const transaction of recurringTransactions) {
        // Create notification rule for each recurring payment
        await this.notificationService.createBillReminder({
          merchantName: transaction.merchantName,
          amount: transaction.amount,
          dueDate: transaction.nextDueDate,
          reminderDays: [7, 3, 1], // Remind 7, 3, and 1 days before
          channels: ['push', 'email']
        });

        remindersSet++;
      }

      return {
        remindersSet,
        success: true,
        message: `Successfully set up ${remindersSet} bill reminders`
      };

    } catch (error) {
      return {
        remindersSet: 0,
        success: false,
        message: `Failed to set up bill reminders: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async setupSpendingAlerts(
    userId: string,
    budgets: Budget[],
    alertThresholds: {
      warning: number; // percentage
      critical: number; // percentage
    } = { warning: 80, critical: 95 }
  ): Promise<{
    alertsConfigured: number;
    success: boolean;
    message: string;
  }> {
    try {
      let alertsConfigured = 0;

      for (const budget of budgets) {
        // Warning alert at 80% budget usage
        await this.notificationService.createSpendingAlert({
          budgetId: budget.id,
          threshold: alertThresholds.warning,
          severity: 'warning',
          channels: ['push'],
          message: `You've used ${alertThresholds.warning}% of your ${budget.categoryId} budget`
        });

        // Critical alert at 95% budget usage
        await this.notificationService.createSpendingAlert({
          budgetId: budget.id,
          threshold: alertThresholds.critical,
          severity: 'critical',
          channels: ['push', 'email'],
          message: `Critical: You've used ${alertThresholds.critical}% of your ${budget.categoryId} budget`
        });

        alertsConfigured += 2; // Two alerts per budget
      }

      return {
        alertsConfigured,
        success: true,
        message: `Successfully configured ${alertsConfigured} spending alerts for ${budgets.length} budgets`
      };

    } catch (error) {
      return {
        alertsConfigured: 0,
        success: false,
        message: `Failed to configure spending alerts: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Automation Rule Management
  createAutomationRule(rule: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at' | 'execution_count'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newRule: AutomationRule = {
      ...rule,
      id,
      created_at: now,
      updated_at: now,
      execution_count: 0
    };

    this.rules.set(id, newRule);
    return id;
  }

  updateAutomationRule(id: string, updates: Partial<AutomationRule>): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;

    Object.assign(rule, {
      ...updates,
      updated_at: new Date()
    });

    return true;
  }

  deleteAutomationRule(id: string): boolean {
    return this.rules.delete(id);
  }

  getAllAutomationRules(): AutomationRule[] {
    return Array.from(this.rules.values());
  }

  getActiveAutomationRules(): AutomationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.isActive);
  }

  // Trigger automation execution
  async triggerAutomation(
    ruleId: string,
    triggerData: Record<string, any>
  ): Promise<AutomationExecution> {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.isActive) {
      throw new Error(`Active automation rule not found: ${ruleId}`);
    }

    const execution: AutomationExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId,
      triggeredBy: {
        type: 'manual',
        data: triggerData
      },
      status: 'pending',
      actions: rule.actions.map(action => ({
        type: action.type,
        status: 'pending'
      })),
      startedAt: new Date()
    };

    this.executions.set(execution.id, execution);
    this.executionQueue.push(execution);

    // Increment execution count
    rule.execution_count++;
    rule.last_executed = new Date();

    this.processAutomationQueue();
    return execution;
  }

  private async processAutomationQueue(): Promise<void> {
    if (this.isProcessing || this.executionQueue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.executionQueue.length > 0) {
        const execution = this.executionQueue.shift()!;
        await this.executeAutomation(execution);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeAutomation(execution: AutomationExecution): Promise<void> {
    try {
      execution.status = 'running';
      
      const rule = this.rules.get(execution.ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${execution.ruleId}`);
      }

      // Execute each action
      for (let i = 0; i < rule.actions.length; i++) {
        const action = rule.actions[i];
        const actionExecution = execution.actions[i];

        try {
          const result = await this.executeAction(action, execution.triggeredBy.data);
          actionExecution.status = 'completed';
          actionExecution.result = result;
        } catch (error) {
          actionExecution.status = 'failed';
          actionExecution.error = error instanceof Error ? error.message : String(error);
        }
      }

      execution.status = execution.actions.some(a => a.status === 'failed') ? 'failed' : 'completed';
      execution.completedAt = new Date();

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
    }
  }

  private async executeAction(action: AutomationAction, triggerData: Record<string, any>): Promise<any> {
    switch (action.type) {
      case 'send_notification':
        return this.notificationService.sendNotification({
          type: action.config.notification_type || 'push',
          recipients: action.config.recipients || [],
          subject: action.config.subject || 'Financial Alert',
          message: this.interpolateMessage(action.config.message || '', triggerData),
          priority: action.config.priority || 'medium'
        });

      case 'create_budget':
        // Would integrate with BudgetService
        return { message: 'Budget creation triggered', template: action.config.budget_template };

      case 'transfer_funds':
        // Would integrate with payment/transfer service
        return { 
          message: 'Fund transfer initiated',
          amount: action.config.transfer_amount,
          from: action.config.from_account,
          to: action.config.to_account
        };

      case 'log_event':
        console.log('Automation action executed:', action.config);
        return { message: 'Event logged' };

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private interpolateMessage(template: string, data: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }

  private checkScheduledAutomations(): void {
    const now = new Date();
    const activeRules = this.getActiveAutomationRules();

    activeRules.forEach(rule => {
      if (!rule.schedule) return;

      const shouldRun = this.shouldRunScheduledRule(rule, now);
      if (shouldRun) {
        this.triggerAutomation(rule.id, { scheduledRun: true, timestamp: now });
      }
    });
  }

  private shouldRunScheduledRule(rule: AutomationRule, currentTime: Date): boolean {
    if (!rule.schedule) return false;

    const schedule = rule.schedule;
    const lastRun = rule.last_executed;

    // Check if we're within the schedule period
    if (schedule.endDate && currentTime > schedule.endDate) return false;
    if (currentTime < schedule.startDate) return false;

    // Check frequency
    switch (schedule.frequency) {
      case 'once':
        return !lastRun;
        
      case 'daily':
        if (!lastRun) return true;
        const daysSinceLastRun = Math.floor((currentTime.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceLastRun >= 1;
        
      case 'weekly':
        if (!lastRun) return true;
        const weeksSinceLastRun = Math.floor((currentTime.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24 * 7));
        return weeksSinceLastRun >= 1 && currentTime.getDay() === (schedule.dayOfWeek || 1);
        
      case 'monthly':
        if (!lastRun) return true;
        const monthsSinceLastRun = (currentTime.getFullYear() - lastRun.getFullYear()) * 12 + 
                                  (currentTime.getMonth() - lastRun.getMonth());
        return monthsSinceLastRun >= 1 && currentTime.getDate() === (schedule.dayOfMonth || 1);
        
      default:
        return false;
    }
  }

  // Analytics and reporting
  getAutomationMetrics(): AutomationMetrics {
    const executions = Array.from(this.executions.values());
    const rules = Array.from(this.rules.values());

    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    const totalExecutions = executions.length;

    const executionTimes = executions
      .filter(e => e.completedAt && e.startedAt)
      .map(e => e.completedAt!.getTime() - e.startedAt.getTime());

    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0;

    const rulesByType: Record<string, number> = {};
    rules.forEach(rule => {
      rulesByType[rule.type] = (rulesByType[rule.type] || 0) + 1;
    });

    const mostTriggeredRule = rules
      .sort((a, b) => b.execution_count - a.execution_count)[0]?.name || 'None';

    // Group executions by day for the last 30 days
    const executionsByDay: Array<{ date: Date; count: number }> = [];
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    });

    last30Days.forEach(date => {
      const dayExecutions = executions.filter(e => {
        const execDate = new Date(e.startedAt);
        return execDate.toDateString() === date.toDateString();
      });

      executionsByDay.push({
        date,
        count: dayExecutions.length
      });
    });

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      mostTriggeredRule,
      rulesByType,
      executionsByDay: executionsByDay.reverse(),
      errorRate: totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0,
      userEngagement: {
        rulesCreated: rules.filter(r => r.created_by !== 'system').length,
        rulesModified: rules.filter(r => r.updated_at > r.created_at).length,
        rulesDisabled: rules.filter(r => !r.isActive).length
      }
    };
  }

  getExecutionHistory(limit: number = 50): AutomationExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  getRecommendations(
    transactions: Transaction[],
    accounts: Account[],
    budgets: Budget[]
  ): Promise<{
    smartBudget: SmartBudgetRecommendation[];
    investments: InvestmentRecommendation[];
    savings: SavingsRecommendation[];
    automationSuggestions: string[];
  }> {
    // This would return comprehensive automation recommendations
    return Promise.resolve({
      smartBudget: [],
      investments: [],
      savings: [],
      automationSuggestions: [
        'Set up automatic budget creation based on spending patterns',
        'Enable bill payment reminders for recurring expenses',
        'Configure spending alerts for budget categories',
        'Automate investment allocation based on your risk profile'
      ]
    });
  }
}