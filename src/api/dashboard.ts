import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Types for dashboard responses
interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  accountsCount: number;
  transactionsCount: number;
  growthPercentage: number;
}

interface TrendData {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

interface CategoryBreakdown {
  category: string;
  categoryId: string;
  amount: number;
  count: number;
  percentage: number;
  color?: string;
  icon?: string;
}

interface RecentActivity {
  id: string;
  type: 'transaction' | 'account_created' | 'document_processed';
  title: string;
  description: string;
  amount?: number;
  date: string;
  icon?: string;
  category?: string;
  accountName?: string;
}

interface AccountSummary {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  transactionsCount: number;
  lastTransaction?: {
    date: string;
    description: string;
    amount: number;
  };
  monthlyChange: number;
  monthlyChangePercentage: number;
}

// GET /api/dashboard/stats - Overview statistics (total balance, income, expenses, etc.)
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { accountId, timeRange = '30days' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    const previousStartDate = new Date();
    const previousEndDate = new Date();

    switch (timeRange) {
      case '7days':
        startDate.setDate(endDate.getDate() - 7);
        previousStartDate.setDate(previousEndDate.getDate() - 14);
        previousEndDate.setDate(previousEndDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        previousStartDate.setDate(previousEndDate.getDate() - 60);
        previousEndDate.setDate(previousEndDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        previousStartDate.setDate(previousEndDate.getDate() - 180);
        previousEndDate.setDate(previousEndDate.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        previousStartDate.setFullYear(previousEndDate.getFullYear() - 2);
        previousEndDate.setFullYear(previousEndDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
        previousStartDate.setDate(previousEndDate.getDate() - 60);
        previousEndDate.setDate(previousEndDate.getDate() - 30);
    }

    // Build where clause
    const baseWhere: any = {
      userId,
      ...(accountId && { accountId: accountId as string })
    };

    const currentPeriodWhere = {
      ...baseWhere,
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    const previousPeriodWhere = {
      ...baseWhere,
      date: {
        gte: previousStartDate,
        lte: previousEndDate
      }
    };

    // Get current period statistics
    const [
      currentIncome,
      currentExpenses,
      currentTransactionCount,
      totalAccountBalance,
      accountsCount,
      previousIncome,
      previousExpenses
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...currentPeriodWhere, type: 'INCOME' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.transaction.aggregate({
        where: { ...currentPeriodWhere, type: 'EXPENSE' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.transaction.count({ where: currentPeriodWhere }),
      prisma.account.aggregate({
        where: { 
          userId,
          ...(accountId && { id: accountId as string })
        },
        _sum: { balance: true },
        _count: true
      }),
      prisma.account.count({ where: { userId } }),
      prisma.transaction.aggregate({
        where: { ...previousPeriodWhere, type: 'INCOME' },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { ...previousPeriodWhere, type: 'EXPENSE' },
        _sum: { amount: true }
      })
    ]);

    const monthlyIncome = Number(currentIncome._sum.amount || 0);
    const monthlyExpenses = Number(currentExpenses._sum.amount || 0);
    const netIncome = monthlyIncome - monthlyExpenses;
    const totalBalance = Number(totalAccountBalance._sum.balance || 0);

    // Calculate growth percentage
    const previousNetIncome = Number(previousIncome._sum.amount || 0) - Number(previousExpenses._sum.amount || 0);
    let growthPercentage = 0;
    if (previousNetIncome !== 0) {
      growthPercentage = ((netIncome - previousNetIncome) / Math.abs(previousNetIncome)) * 100;
    } else if (netIncome > 0) {
      growthPercentage = 100;
    }

    const stats: DashboardStats = {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      netIncome,
      accountsCount,
      transactionsCount: currentTransactionCount,
      growthPercentage: Math.round(growthPercentage * 100) / 100
    };

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard statistics'
      }
    });
  }
});

// GET /api/dashboard/trends - Income/expense trends over time
router.get('/trends', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { 
      accountId, 
      period = 'monthly', 
      timeRange = '1year'
    } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setFullYear(endDate.getFullYear() - 1);
    }

    const where: any = {
      userId,
      ...(accountId && { accountId: accountId as string }),
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    // Get transactions for the period
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        date: true,
        amount: true,
        type: true
      },
      orderBy: { date: 'asc' }
    });

    // Get accounts for balance calculation
    const accounts = await prisma.account.findMany({
      where: { 
        userId,
        ...(accountId && { id: accountId as string })
      },
      select: { balance: true }
    });

    const currentBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Group transactions by period
    const trendsMap = new Map<string, { date: string; income: number; expenses: number; balance: number }>();

    let runningBalance = currentBalance;
    
    // Process transactions in reverse chronological order to calculate historical balances
    const sortedTransactions = [...transactions].reverse();
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      let periodKey: string;

      switch (period) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
        default:
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
          break;
      }

      if (!trendsMap.has(periodKey)) {
        trendsMap.set(periodKey, {
          date: periodKey,
          income: 0,
          expenses: 0,
          balance: 0
        });
      }

      const trend = trendsMap.get(periodKey)!;
      const amount = Number(transaction.amount);

      if (transaction.type === 'INCOME') {
        trend.income += amount;
      } else if (transaction.type === 'EXPENSE') {
        trend.expenses += amount;
      }
    });

    // Calculate balances for each period (simplified - using final balance)
    trendsMap.forEach((trend) => {
      trend.balance = currentBalance;
    });

    // Convert map to sorted array
    const trends = Array.from(trendsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      message: 'Dashboard trends retrieved successfully',
      data: trends
    });

  } catch (error) {
    logger.error('Error fetching dashboard trends:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard trends'
      }
    });
  }
});

// GET /api/dashboard/category-breakdown - Spending by category
router.get('/category-breakdown', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { accountId, timeRange = '30days', type = 'EXPENSE' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const where: any = {
      userId,
      ...(accountId && { accountId: accountId as string }),
      ...(type && { type: type as string }),
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    // Get transactions grouped by category
    const categoryData = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: true
    });

    // Get category details
    const categoryIds = categoryData
      .filter(cd => cd.categoryId)
      .map(cd => cd.categoryId!);
    
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { 
        id: true, 
        name: true, 
        color: true, 
        icon: true 
      }
    });

    const categoryMap = categories.reduce((map, cat) => {
      map[cat.id] = {
        name: cat.name,
        color: cat.color,
        icon: cat.icon
      };
      return map;
    }, {} as Record<string, { name: string; color?: string | null; icon?: string | null }>);

    // Calculate total amount for percentage calculation
    const totalAmount = categoryData.reduce((sum, cd) => sum + Number(cd._sum.amount || 0), 0);

    const breakdown: CategoryBreakdown[] = categoryData.map(cd => ({
      categoryId: cd.categoryId || 'uncategorized',
      category: cd.categoryId ? categoryMap[cd.categoryId]?.name || 'Uncategorized' : 'Uncategorized',
      amount: Number(cd._sum.amount || 0),
      count: cd._count,
      percentage: totalAmount > 0 ? (Number(cd._sum.amount || 0) / totalAmount) * 100 : 0,
      color: cd.categoryId ? categoryMap[cd.categoryId]?.color || undefined : undefined,
      icon: cd.categoryId ? categoryMap[cd.categoryId]?.icon || undefined : undefined
    }));

    // Sort by amount descending
    breakdown.sort((a, b) => b.amount - a.amount);

    res.json({
      success: true,
      message: 'Category breakdown retrieved successfully',
      data: breakdown
    });

  } catch (error) {
    logger.error('Error fetching category breakdown:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch category breakdown'
      }
    });
  }
});

// GET /api/dashboard/recent-activity - Recent transactions and activities
router.get('/recent-activity', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { limit = '10', accountId } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 10, 50); // Max 50 items

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        ...(accountId && { accountId: accountId as string })
      },
      include: {
        account: {
          select: { name: true, type: true }
        },
        category: {
          select: { name: true, icon: true, color: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum
    });

    // Get recent documents (last 5)
    const recentDocuments = await prisma.document.findMany({
      where: { userId },
      select: {
        id: true,
        fileName: true,
        type: true,
        status: true,
        createdAt: true,
        processedAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Get recently created accounts (last 3)
    const recentAccounts = await prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    // Combine all activities
    const activities: RecentActivity[] = [];

    // Add transactions
    recentTransactions.forEach(transaction => {
      activities.push({
        id: transaction.id,
        type: 'transaction',
        title: transaction.description,
        description: `${transaction.type === 'INCOME' ? 'Income' : 'Expense'} • ${transaction.account?.name || 'Unknown Account'}`,
        amount: transaction.type === 'INCOME' ? transaction.amount : -transaction.amount,
        date: transaction.createdAt.toISOString(),
        icon: transaction.category?.icon || 'receipt',
        category: transaction.category?.name,
        accountName: transaction.account?.name
      });
    });

    // Add document processing activities
    recentDocuments.forEach(document => {
      let description = '';
      let icon = 'document';
      
      switch (document.status) {
        case 'COMPLETED':
          description = `Document processed successfully`;
          icon = 'check_circle';
          break;
        case 'PROCESSING':
          description = `Document is being processed`;
          icon = 'hourglass_empty';
          break;
        case 'FAILED':
          description = `Document processing failed`;
          icon = 'error';
          break;
        default:
          description = `Document uploaded`;
          icon = 'upload';
      }

      activities.push({
        id: document.id,
        type: 'document_processed',
        title: document.fileName,
        description,
        date: (document.processedAt || document.createdAt).toISOString(),
        icon
      });
    });

    // Add account creation activities
    recentAccounts.forEach(account => {
      activities.push({
        id: account.id,
        type: 'account_created',
        title: `New ${account.type.toLowerCase()} account`,
        description: `${account.name} account created`,
        date: account.createdAt.toISOString(),
        icon: 'account_balance',
        accountName: account.name
      });
    });

    // Sort all activities by date (newest first) and limit
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limitedActivities = activities.slice(0, limitNum);

    res.json({
      success: true,
      message: 'Recent activity retrieved successfully',
      data: limitedActivities
    });

  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch recent activity'
      }
    });
  }
});

// GET /api/dashboard/accounts-summary - Summary of all accounts
router.get('/accounts-summary', async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get all accounts
    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { balance: 'desc' }
    });

    // Calculate date range for monthly change (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const accountSummaries: AccountSummary[] = await Promise.all(
      accounts.map(async (account) => {
        // Get monthly transactions for this account
        const [monthlyTransactions, lastTransaction] = await Promise.all([
          prisma.transaction.findMany({
            where: {
              accountId: account.id,
              date: {
                gte: thirtyDaysAgo
              }
            },
            select: {
              amount: true,
              type: true
            }
          }),
          prisma.transaction.findFirst({
            where: { accountId: account.id },
            select: {
              date: true,
              description: true,
              amount: true,
              type: true
            },
            orderBy: { date: 'desc' }
          })
        ]);

        // Calculate monthly change
        let monthlyChange = 0;
        monthlyTransactions.forEach(transaction => {
          const amount = Number(transaction.amount);
          if (transaction.type === 'INCOME') {
            monthlyChange += amount;
          } else if (transaction.type === 'EXPENSE') {
            monthlyChange -= amount;
          }
        });

        // Calculate percentage change (simplified - against current balance)
        const monthlyChangePercentage = account.balance > 0 
          ? (monthlyChange / account.balance) * 100 
          : 0;

        return {
          id: account.id,
          name: account.name,
          type: account.type,
          balance: account.balance,
          currency: account.currency,
          transactionsCount: account._count.transactions,
          lastTransaction: lastTransaction ? {
            date: lastTransaction.date.toISOString(),
            description: lastTransaction.description,
            amount: lastTransaction.type === 'INCOME' 
              ? lastTransaction.amount 
              : -lastTransaction.amount
          } : undefined,
          monthlyChange: Math.round(monthlyChange * 100) / 100,
          monthlyChangePercentage: Math.round(monthlyChangePercentage * 100) / 100
        };
      })
    );

    res.json({
      success: true,
      message: 'Accounts summary retrieved successfully',
      data: accountSummaries
    });

  } catch (error) {
    logger.error('Error fetching accounts summary:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch accounts summary'
      }
    });
  }
});

export default router;