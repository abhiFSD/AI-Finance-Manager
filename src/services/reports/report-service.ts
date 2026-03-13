import { Transaction, Account, Budget } from '../../types';
import { 
  ReportConfiguration, 
  GeneratedReport, 
  ReportData, 
  ReportJob,
  ReportTemplate,
  ReportAnalytics 
} from './types';
import { PDFReportGenerator } from './pdf-generator';
import { ExcelReportGenerator } from './excel-generator';
import { ScheduledReportsService } from './scheduled-reports';

export class ReportService {
  private pdfGenerator: PDFReportGenerator;
  private excelGenerator: ExcelReportGenerator;
  private scheduledReports: ScheduledReportsService;
  private reports: Map<string, GeneratedReport> = new Map();
  private configurations: Map<string, ReportConfiguration> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();
  private jobQueue: ReportJob[] = [];
  private isProcessing = false;

  constructor() {
    this.pdfGenerator = new PDFReportGenerator();
    this.excelGenerator = new ExcelReportGenerator();
    this.scheduledReports = new ScheduledReportsService();
    
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const templates: ReportTemplate[] = [
      {
        id: 'monthly_summary',
        name: 'Monthly Financial Summary',
        description: 'Complete overview of monthly income, expenses, and savings',
        type: 'spending_summary',
        sections: [
          {
            id: 'summary',
            name: 'Financial Summary',
            type: 'summary',
            order: 1,
            config: { showPercentages: true, showTrends: true },
            isVisible: true
          },
          {
            id: 'category_breakdown',
            name: 'Spending by Category',
            type: 'chart',
            order: 2,
            config: { 
              chartType: 'pie', 
              groupBy: 'category', 
              sortBy: 'amount', 
              sortOrder: 'desc',
              showPercentages: true,
              limit: 10
            },
            isVisible: true
          },
          {
            id: 'monthly_trends',
            name: 'Monthly Spending Trends',
            type: 'chart',
            order: 3,
            config: { 
              chartType: 'line', 
              groupBy: 'month',
              showTrends: true
            },
            isVisible: true
          },
          {
            id: 'transaction_table',
            name: 'All Transactions',
            type: 'table',
            order: 4,
            config: { 
              sortBy: 'date', 
              sortOrder: 'desc',
              limit: 100
            },
            isVisible: true
          },
          {
            id: 'insights',
            name: 'Financial Insights',
            type: 'insights',
            order: 5,
            config: {},
            isVisible: true
          }
        ],
        styling: {
          theme: 'corporate',
          primaryColor: '#2563eb',
          secondaryColor: '#64748b',
          fontFamily: 'Arial',
          fontSize: 12,
          includeLogo: false,
          headerText: 'Monthly Financial Report'
        },
        isBuiltIn: true,
        created_at: new Date()
      },
      {
        id: 'budget_analysis',
        name: 'Budget Performance Analysis',
        description: 'Detailed analysis of budget vs actual spending',
        type: 'budget_analysis',
        sections: [
          {
            id: 'budget_summary',
            name: 'Budget Overview',
            type: 'summary',
            order: 1,
            config: { showPercentages: true },
            isVisible: true
          },
          {
            id: 'budget_vs_actual',
            name: 'Budget vs Actual',
            type: 'chart',
            order: 2,
            config: { 
              chartType: 'bar',
              groupBy: 'category',
              sortBy: 'amount',
              sortOrder: 'desc'
            },
            isVisible: true
          },
          {
            id: 'overspend_analysis',
            name: 'Categories Over Budget',
            type: 'table',
            order: 3,
            config: { 
              sortBy: 'amount',
              sortOrder: 'desc'
            },
            isVisible: true
          }
        ],
        styling: {
          theme: 'corporate',
          primaryColor: '#dc2626',
          secondaryColor: '#64748b',
          fontFamily: 'Arial',
          fontSize: 12,
          includeLogo: false,
          headerText: 'Budget Analysis Report'
        },
        isBuiltIn: true,
        created_at: new Date()
      },
      {
        id: 'tax_summary',
        name: 'Tax Summary Report',
        description: 'Comprehensive tax-related transaction summary',
        type: 'tax_summary',
        sections: [
          {
            id: 'tax_overview',
            name: 'Tax Overview',
            type: 'summary',
            order: 1,
            config: {},
            isVisible: true
          },
          {
            id: 'deductions',
            name: 'Tax Deductions',
            type: 'breakdown',
            order: 2,
            config: { groupBy: 'category' },
            isVisible: true
          },
          {
            id: 'investment_summary',
            name: 'Tax-Saving Investments',
            type: 'table',
            order: 3,
            config: { 
              sortBy: 'date',
              sortOrder: 'desc'
            },
            isVisible: true
          }
        ],
        styling: {
          theme: 'minimal',
          primaryColor: '#059669',
          secondaryColor: '#64748b',
          fontFamily: 'Arial',
          fontSize: 11,
          includeLogo: false,
          headerText: 'Tax Summary Report'
        },
        isBuiltIn: true,
        created_at: new Date()
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async generateReport(
    configId: string,
    transactions: Transaction[],
    accounts: Account[],
    budgets?: Budget[],
    options?: {
      priority?: 'low' | 'normal' | 'high';
      async?: boolean;
    }
  ): Promise<GeneratedReport | ReportJob> {
    const config = this.configurations.get(configId);
    if (!config) {
      throw new Error(`Report configuration not found: ${configId}`);
    }

    const job: ReportJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      configId,
      status: 'queued',
      priority: options?.priority || 'normal',
      progress: 0
    };

    if (options?.async) {
      this.jobQueue.push(job);
      this.processQueue();
      return job;
    } else {
      return this.processReportJob(job, transactions, accounts, budgets);
    }
  }

  private async processReportJob(
    job: ReportJob,
    transactions: Transaction[],
    accounts: Account[],
    budgets?: Budget[]
  ): Promise<GeneratedReport> {
    const config = this.configurations.get(job.configId)!;
    
    try {
      job.status = 'processing';
      job.startedAt = new Date();
      job.progress = 10;

      // Prepare report data
      const reportData = await this.prepareReportData(config, transactions, accounts, budgets);
      job.progress = 40;

      // Generate report based on format
      let filePath: string;
      let fileSize: number;

      switch (config.format) {
        case 'pdf':
          const pdfResult = await this.pdfGenerator.generate(config, reportData);
          filePath = pdfResult.filePath;
          fileSize = pdfResult.fileSize;
          break;
        
        case 'excel':
          const excelResult = await this.excelGenerator.generate(config, reportData);
          filePath = excelResult.filePath;
          fileSize = excelResult.fileSize;
          break;
        
        case 'csv':
          const csvResult = await this.generateCSV(config, reportData);
          filePath = csvResult.filePath;
          fileSize = csvResult.fileSize;
          break;
        
        case 'json':
          const jsonResult = await this.generateJSON(config, reportData);
          filePath = jsonResult.filePath;
          fileSize = jsonResult.fileSize;
          break;
        
        default:
          throw new Error(`Unsupported report format: ${config.format}`);
      }

      job.progress = 90;

      const report: GeneratedReport = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        configId: config.id,
        name: config.name,
        format: config.format,
        filePath,
        fileSize,
        dateRange: {
          startDate: config.dateRange.startDate,
          endDate: config.dateRange.endDate
        },
        generatedAt: new Date(),
        generatedBy: config.created_by,
        status: 'completed',
        downloadCount: 0,
        metadata: {
          totalTransactions: reportData.transactions.length,
          totalAmount: reportData.summary.totalExpenses + reportData.summary.totalIncome,
          categoriesIncluded: reportData.categories.length,
          accountsIncluded: reportData.accounts.length
        }
      };

      this.reports.set(report.id, report);
      
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      job.result = report;

      // Handle distribution if configured
      if (config.distribution) {
        await this.distributeReport(config, report);
      }

      return report;

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
      throw error;
    }
  }

  private async prepareReportData(
    config: ReportConfiguration,
    transactions: Transaction[],
    accounts: Account[],
    budgets?: Budget[]
  ): Promise<ReportData> {
    // Filter transactions based on config
    const filteredTransactions = this.filterTransactions(transactions, config.filters, config.dateRange);
    
    // Prepare summary data
    const summary = this.generateSummary(filteredTransactions, config.dateRange);
    
    // Prepare category data
    const categories = this.generateCategoryData(filteredTransactions);
    
    // Prepare account data
    const accountData = this.generateAccountData(filteredTransactions, accounts);
    
    // Prepare trend data
    const trends = this.generateTrendData(filteredTransactions, config.dateRange);
    
    // Generate insights
    const insights = await this.generateInsights(filteredTransactions, accounts, budgets);
    
    // Prepare chart data
    const charts = this.generateChartData(config.sections, filteredTransactions, categories);

    return {
      summary,
      transactions: filteredTransactions.map(this.convertTransactionData),
      categories,
      accounts: accountData,
      trends,
      insights,
      charts
    };
  }

  private filterTransactions(
    transactions: Transaction[],
    filters: ReportConfiguration['filters'],
    dateRange: ReportConfiguration['dateRange']
  ): Transaction[] {
    let filtered = transactions;

    // Date range filter
    const { startDate, endDate } = this.resolveDateRange(dateRange);
    filtered = filtered.filter(t => {
      const date = new Date(t.date);
      return date >= startDate && date <= endDate;
    });

    // Account filter
    if (filters.accountIds?.length) {
      filtered = filtered.filter(t => filters.accountIds!.includes(t.accountId));
    }

    // Category filter
    if (filters.categoryIds?.length) {
      filtered = filtered.filter(t => t.categoryId && filters.categoryIds!.includes(t.categoryId));
    }

    // Amount range filter
    if (filters.amountRange) {
      filtered = filtered.filter(t => {
        const amount = Math.abs(t.amount);
        return amount >= filters.amountRange!.min && amount <= filters.amountRange!.max;
      });
    }

    // Transaction type filter
    if (filters.transactionTypes?.length) {
      filtered = filtered.filter(t => filters.transactionTypes!.includes(t.type));
    }

    // Exclude categories
    if (filters.excludeCategories?.length) {
      filtered = filtered.filter(t => !t.categoryId || !filters.excludeCategories!.includes(t.categoryId));
    }

    // Transfer filter
    if (!filters.includeTransfers) {
      filtered = filtered.filter(t => t.categoryId !== 'transfer');
    }

    return filtered;
  }

  private resolveDateRange(dateRange: ReportConfiguration['dateRange']): { startDate: Date; endDate: Date } {
    if (dateRange.type === 'fixed') {
      return {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
    }

    const endDate = new Date();
    const startDate = new Date();

    switch (dateRange.rollingPeriod) {
      case 'last_7_days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'last_30_days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'last_quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'last_year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'ytd':
        startDate.setMonth(0, 1); // January 1st
        break;
    }

    return { startDate, endDate };
  }

  private generateSummary(
    transactions: Transaction[],
    dateRange: ReportConfiguration['dateRange']
  ): ReportData['summary'] {
    const income = transactions
      .filter(t => t.type === 'credit' && t.categoryId === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const expenses = transactions
      .filter(t => t.type === 'debit' && t.categoryId !== 'transfer')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const largestTransaction = transactions
      .reduce((largest, t) => 
        Math.abs(t.amount) > Math.abs(largest.amount) ? t : largest, 
        transactions[0] || { amount: 0, description: '', date: new Date() }
      );

    const categorySpending = new Map<string, number>();
    transactions
      .filter(t => t.type === 'debit' && t.categoryId)
      .forEach(t => {
        const existing = categorySpending.get(t.categoryId!) || 0;
        categorySpending.set(t.categoryId!, existing + Math.abs(t.amount));
      });

    const topSpendingCategory = Array.from(categorySpending.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

    const { startDate, endDate } = this.resolveDateRange(dateRange);
    const period = `${startDate.toDateString()} to ${endDate.toDateString()}`;

    return {
      period,
      totalIncome: income,
      totalExpenses: expenses,
      netSavings: income - expenses,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
      transactionCount: transactions.length,
      averageTransactionAmount: transactions.length > 0 
        ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length 
        : 0,
      topSpendingCategory,
      largestTransaction: {
        amount: Math.abs(largestTransaction.amount),
        description: largestTransaction.description,
        date: new Date(largestTransaction.date)
      }
    };
  }

  private generateCategoryData(transactions: Transaction[]): ReportData['categories'] {
    const categoryMap = new Map<string, {
      amount: number;
      count: number;
      transactions: Transaction[];
    }>();

    transactions
      .filter(t => t.categoryId && t.type === 'debit')
      .forEach(t => {
        const existing = categoryMap.get(t.categoryId!) || { amount: 0, count: 0, transactions: [] };
        categoryMap.set(t.categoryId!, {
          amount: existing.amount + Math.abs(t.amount),
          count: existing.count + 1,
          transactions: [...existing.transactions, t]
        });
      });

    const totalAmount = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);

    return Array.from(categoryMap.entries()).map(([id, data]) => ({
      id,
      name: this.getCategoryName(id),
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      transactionCount: data.count,
      averageTransactionAmount: data.count > 0 ? data.amount / data.count : 0,
      trend: {
        direction: 'stable' as const,
        percentage: 0
      }
    })).sort((a, b) => b.amount - a.amount);
  }

  private generateAccountData(
    transactions: Transaction[],
    accounts: Account[]
  ): ReportData['accounts'] {
    return accounts.map(account => {
      const accountTransactions = transactions.filter(t => t.accountId === account.id);
      const inflow = accountTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const outflow = accountTransactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      return {
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        transactionCount: accountTransactions.length,
        totalInflow: inflow,
        totalOutflow: outflow
      };
    });
  }

  private generateTrendData(
    transactions: Transaction[],
    dateRange: ReportConfiguration['dateRange']
  ): ReportData['trends'] {
    const monthlyData = new Map<string, {
      period: string;
      income: number;
      expenses: number;
      categories: Map<string, number>;
    }>();

    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const period = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          period,
          income: 0,
          expenses: 0,
          categories: new Map()
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      const amount = Math.abs(t.amount);

      if (t.type === 'credit' && t.categoryId === 'income') {
        monthData.income += amount;
      } else if (t.type === 'debit' && t.categoryId !== 'transfer') {
        monthData.expenses += amount;
        
        if (t.categoryId) {
          const categoryAmount = monthData.categories.get(t.categoryId) || 0;
          monthData.categories.set(t.categoryId, categoryAmount + amount);
        }
      }
    });

    return Array.from(monthlyData.values()).map(data => ({
      period: data.period,
      income: data.income,
      expenses: data.expenses,
      balance: data.income - data.expenses,
      categories: Object.fromEntries(data.categories.entries())
    })).sort((a, b) => a.period.localeCompare(b.period));
  }

  private async generateInsights(
    transactions: Transaction[],
    accounts: Account[],
    budgets?: Budget[]
  ): Promise<ReportData['insights']> {
    const insights: ReportData['insights'] = [];

    // Top spending insights
    if (transactions.length > 0) {
      const categorySpending = new Map<string, number>();
      transactions
        .filter(t => t.type === 'debit' && t.categoryId)
        .forEach(t => {
          const existing = categorySpending.get(t.categoryId!) || 0;
          categorySpending.set(t.categoryId!, existing + Math.abs(t.amount));
        });

      const topCategory = Array.from(categorySpending.entries())
        .sort((a, b) => b[1] - a[1])[0];

      if (topCategory) {
        const totalExpenses = Array.from(categorySpending.values()).reduce((sum, amt) => sum + amt, 0);
        const percentage = (topCategory[1] / totalExpenses) * 100;
        
        insights.push({
          type: 'spending_pattern',
          title: 'Top Spending Category',
          description: `${this.getCategoryName(topCategory[0])} accounts for ${percentage.toFixed(1)}% of your total expenses`,
          impact: percentage > 30 ? 'high' : percentage > 20 ? 'medium' : 'low',
          actionable: true,
          action: percentage > 25 ? 'Consider setting a budget limit for this category' : undefined
        });
      }
    }

    // Savings insights
    const income = transactions
      .filter(t => t.type === 'credit' && t.categoryId === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const expenses = transactions
      .filter(t => t.type === 'debit' && t.categoryId !== 'transfer')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (income > 0) {
      const savingsRate = ((income - expenses) / income) * 100;
      let impact: 'low' | 'medium' | 'high';
      let action: string | undefined;

      if (savingsRate < 10) {
        impact = 'high';
        action = 'Aim to save at least 20% of your income for financial security';
      } else if (savingsRate < 20) {
        impact = 'medium';
        action = 'Good progress! Try to increase your savings rate to 20-30%';
      } else {
        impact = 'low';
      }

      insights.push({
        type: 'savings_opportunity',
        title: 'Savings Rate Analysis',
        description: `Your current savings rate is ${savingsRate.toFixed(1)}%`,
        impact,
        actionable: savingsRate < 20,
        action
      });
    }

    return insights;
  }

  private generateChartData(
    sections: ReportConfiguration['sections'],
    transactions: Transaction[],
    categories: ReportData['categories']
  ): ReportData['charts'] {
    const charts: ReportData['charts'] = [];

    sections
      .filter(section => section.type === 'chart' && section.isVisible)
      .forEach(section => {
        if (section.config.chartType === 'pie' && section.config.groupBy === 'category') {
          charts.push({
            id: section.id,
            title: section.name,
            type: 'pie',
            data: categories.slice(0, section.config.limit || 10).map(cat => ({
              label: cat.name,
              value: cat.amount,
              percentage: cat.percentage
            })),
            config: {
              showLegend: true,
              showDataLabels: true,
              currency: 'INR'
            }
          });
        }
      });

    return charts;
  }

  private convertTransactionData(transaction: Transaction): ReportData['transactions'][0] {
    return {
      id: transaction.id,
      date: new Date(transaction.date),
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.categoryId ? this.getCategoryName(transaction.categoryId) : 'Uncategorized',
      subcategory: transaction.subcategoryId,
      account: transaction.accountId,
      merchant: transaction.merchantId,
      balance: transaction.balance,
      tags: transaction.tags
    };
  }

  // CSV and JSON generators
  private async generateCSV(
    config: ReportConfiguration,
    data: ReportData
  ): Promise<{ filePath: string; fileSize: number }> {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Account'];
    const rows = data.transactions.map(t => [
      t.date.toISOString().split('T')[0],
      t.description,
      t.category,
      t.type,
      t.amount.toString(),
      t.account
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const filePath = `/reports/${config.id}_${Date.now()}.csv`;
    const fileSize = Buffer.byteLength(csvContent, 'utf8');

    // In a real implementation, you would save to actual file system
    console.log(`CSV report saved to ${filePath}`);

    return { filePath, fileSize };
  }

  private async generateJSON(
    config: ReportConfiguration,
    data: ReportData
  ): Promise<{ filePath: string; fileSize: number }> {
    const jsonContent = JSON.stringify(data, null, 2);
    const filePath = `/reports/${config.id}_${Date.now()}.json`;
    const fileSize = Buffer.byteLength(jsonContent, 'utf8');

    // In a real implementation, you would save to actual file system
    console.log(`JSON report saved to ${filePath}`);

    return { filePath, fileSize };
  }

  private async distributeReport(
    config: ReportConfiguration,
    report: GeneratedReport
  ): Promise<void> {
    // Email distribution
    if (config.distribution.email.enabled) {
      // Send email with report attachment
      console.log(`Sending report ${report.id} to ${config.distribution.email.recipients.join(', ')}`);
    }

    // Webhook distribution
    if (config.distribution.webhook?.enabled) {
      // Send webhook notification
      console.log(`Sending webhook notification for report ${report.id}`);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      while (this.jobQueue.length > 0) {
        // Sort by priority
        this.jobQueue.sort((a, b) => {
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        const job = this.jobQueue.shift()!;
        // Process job - this would need actual transaction data
        // For now, just mark as completed
        job.status = 'completed';
        job.completedAt = new Date();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Configuration management
  createReportConfiguration(config: Omit<ReportConfiguration, 'id' | 'created_at' | 'updated_at'>): string {
    const id = `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newConfig: ReportConfiguration = {
      ...config,
      id,
      created_at: now,
      updated_at: now
    };

    this.configurations.set(id, newConfig);
    return id;
  }

  updateReportConfiguration(id: string, updates: Partial<ReportConfiguration>): boolean {
    const config = this.configurations.get(id);
    if (!config) return false;

    Object.assign(config, {
      ...updates,
      updated_at: new Date()
    });

    return true;
  }

  deleteReportConfiguration(id: string): boolean {
    return this.configurations.delete(id);
  }

  getAllReportConfigurations(): ReportConfiguration[] {
    return Array.from(this.configurations.values());
  }

  getReportConfiguration(id: string): ReportConfiguration | undefined {
    return this.configurations.get(id);
  }

  // Report management
  getReport(id: string): GeneratedReport | undefined {
    return this.reports.get(id);
  }

  getAllReports(): GeneratedReport[] {
    return Array.from(this.reports.values());
  }

  deleteReport(id: string): boolean {
    return this.reports.delete(id);
  }

  getJobStatus(jobId: string): ReportJob | undefined {
    return this.jobQueue.find(job => job.id === jobId);
  }

  // Templates
  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  createReportFromTemplate(
    templateId: string,
    name: string,
    dateRange: ReportConfiguration['dateRange'],
    userId: string
  ): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return this.createReportConfiguration({
      name,
      description: `Report based on ${template.name} template`,
      type: template.type as any,
      format: 'pdf',
      dateRange,
      filters: {},
      sections: template.sections,
      styling: template.styling,
      distribution: {
        email: { enabled: false, recipients: [] },
        storage: { enabled: true, path: '/reports' }
      },
      created_by: userId
    });
  }

  // Analytics
  getReportAnalytics(): ReportAnalytics {
    const reports = this.getAllReports();
    
    const reportsByType: Record<string, number> = {};
    const reportsByFormat: Record<string, number> = {};
    const downloadsByFormat: Record<string, number> = {};
    
    let totalDownloads = 0;
    let mostDownloaded = '';
    let maxDownloads = 0;

    reports.forEach(report => {
      // Count by type (would need to track this)
      const type = 'unknown'; // Would get from configuration
      reportsByType[type] = (reportsByType[type] || 0) + 1;
      
      // Count by format
      reportsByFormat[report.format] = (reportsByFormat[report.format] || 0) + 1;
      
      // Download stats
      totalDownloads += report.downloadCount;
      downloadsByFormat[report.format] = (downloadsByFormat[report.format] || 0) + report.downloadCount;
      
      if (report.downloadCount > maxDownloads) {
        maxDownloads = report.downloadCount;
        mostDownloaded = report.name;
      }
    });

    return {
      totalReports: reports.length,
      reportsByType,
      reportsByFormat,
      averageGenerationTime: 0, // Would calculate from actual generation times
      popularSections: [], // Would track most used sections
      downloadStats: {
        totalDownloads,
        mostDownloaded,
        downloadsByFormat
      }
    };
  }

  // Utility methods
  private getCategoryName(categoryId: string): string {
    const categoryNames: Record<string, string> = {
      'food_delivery': 'Food Delivery',
      'food_grocery': 'Groceries',
      'transport_fuel': 'Fuel',
      'shopping_online': 'Online Shopping',
      'utilities_electricity': 'Electricity',
      'income': 'Income'
    };
    return categoryNames[categoryId] || categoryId;
  }
}