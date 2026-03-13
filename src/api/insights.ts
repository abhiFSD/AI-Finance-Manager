import express from 'express';
import { InsightType, InsightSeverity, TransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/insights - List user's insights
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { isRead, category, limit = '20' } = req.query;

    const where: any = {
      userId,
      ...(isRead !== undefined && { isRead: isRead === 'true' }),
      ...(category && { category: category as string })
    };

    const insights = await prisma.insight.findMany({
      where,
      orderBy: [
        { isRead: 'asc' },
        { severity: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit as string)
    });

    // Parse data field if present
    const parsedInsights = insights.map(insight => ({
      ...insight,
      data: insight.data ? JSON.parse(insight.data) : null
    }));

    res.json({
      success: true,
      message: 'Insights retrieved successfully',
      data: parsedInsights
    });

  } catch (error) {
    logger.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch insights'
      }
    });
  }
});

// POST /api/insights/generate - Generate insights from user data
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user!.id;
    const generatedInsights: any[] = [];

    // Get current date ranges
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 1. Compare spending this month vs last month by category
    const thisMonthTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: { gte: firstDayThisMonth }
      }
    });

    const lastMonthTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: {
          gte: firstDayLastMonth,
          lte: lastDayLastMonth
        }
      }
    });

    // Group by category
    const thisMonthByCategory = thisMonthTransactions.reduce((acc: any, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});

    const lastMonthByCategory = lastMonthTransactions.reduce((acc: any, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});

    // Check for >20% increase
    for (const category in thisMonthByCategory) {
      const thisAmount = thisMonthByCategory[category];
      const lastAmount = lastMonthByCategory[category] || 0;
      
      if (lastAmount > 0) {
        const increase = ((thisAmount - lastAmount) / lastAmount) * 100;
        
        if (increase > 20) {
          generatedInsights.push({
            type: InsightType.SPENDING_ALERT,
            title: `${category} spending increased`,
            message: `Your ${category} spending increased by ${Math.round(increase)}% this month (₹${lastAmount.toFixed(0)} → ₹${thisAmount.toFixed(0)})`,
            severity: increase > 50 ? InsightSeverity.HIGH : InsightSeverity.MEDIUM,
            category: 'spending',
            data: JSON.stringify({ category, thisMonth: thisAmount, lastMonth: lastAmount, increase })
          });
        }
      }
    }

    // 2. Check budget utilization
    const budgets = await prisma.budget.findMany({
      where: { userId, isActive: true }
    });

    for (const budget of budgets) {
      const spent = thisMonthByCategory[budget.category] || 0;
      const utilization = (spent / budget.amount) * 100;

      if (utilization > 80) {
        generatedInsights.push({
          type: InsightType.BUDGET_WARNING,
          title: `${budget.category} budget alert`,
          message: `You've used ${Math.round(utilization)}% of your ${budget.category} budget (₹${spent.toFixed(0)} of ₹${budget.amount})`,
          severity: utilization > 100 ? InsightSeverity.HIGH : InsightSeverity.MEDIUM,
          category: 'spending',
          data: JSON.stringify({ budget: budget.amount, spent, utilization })
        });
      }
    }

    // 3. Check emergency fund goal progress
    const emergencyGoal = await prisma.goal.findFirst({
      where: {
        userId,
        category: 'EMERGENCY_FUND',
        isCompleted: false
      }
    });

    if (emergencyGoal) {
      const progress = (emergencyGoal.currentAmount / emergencyGoal.targetAmount) * 100;
      
      if (progress < 30) {
        generatedInsights.push({
          type: InsightType.SAVING_TIP,
          title: 'Build your emergency fund',
          message: `Your emergency fund is at ${Math.round(progress)}% (₹${emergencyGoal.currentAmount.toFixed(0)} of ₹${emergencyGoal.targetAmount}). Aim for 6 months of expenses.`,
          severity: InsightSeverity.MEDIUM,
          category: 'saving',
          data: JSON.stringify({ goal: emergencyGoal.targetAmount, current: emergencyGoal.currentAmount })
        });
      }
    }

    // 4. Check savings rate
    const thisMonthIncome = await prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.INCOME,
        date: { gte: firstDayThisMonth }
      },
      _sum: { amount: true }
    });

    const thisMonthExpense = await prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: { gte: firstDayThisMonth }
      },
      _sum: { amount: true }
    });

    const income = thisMonthIncome._sum.amount || 0;
    const expense = thisMonthExpense._sum.amount || 0;
    const savings = income - expense;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    if (income > 0 && savingsRate < 20) {
      generatedInsights.push({
        type: InsightType.SAVING_TIP,
        title: 'Low savings rate',
        message: `Your savings rate is ${Math.round(savingsRate)}% this month. Financial experts recommend saving at least 20% of income.`,
        severity: InsightSeverity.MEDIUM,
        category: 'saving',
        data: JSON.stringify({ income, expense, savings, savingsRate })
      });
    } else if (savingsRate >= 30) {
      generatedInsights.push({
        type: InsightType.SAVING_TIP,
        title: 'Great savings rate!',
        message: `You're saving ${Math.round(savingsRate)}% of your income this month. Keep up the excellent work!`,
        severity: InsightSeverity.INFO,
        category: 'saving',
        data: JSON.stringify({ income, expense, savings, savingsRate })
      });
    }

    // 5. Check debt-to-income ratio
    const activeLoans = await prisma.loan.findMany({
      where: { userId, isActive: true }
    });

    const totalEMI = activeLoans.reduce((sum, loan) => sum + (loan.emiAmount || 0), 0);
    const debtToIncomeRatio = income > 0 ? (totalEMI / income) * 100 : 0;

    if (debtToIncomeRatio > 40) {
      generatedInsights.push({
        type: InsightType.DEBT_ADVICE,
        title: 'High debt-to-income ratio',
        message: `Your EMIs are ${Math.round(debtToIncomeRatio)}% of your income. Aim to keep it below 40% for healthy finances.`,
        severity: InsightSeverity.HIGH,
        category: 'debt',
        data: JSON.stringify({ income, totalEMI, debtToIncomeRatio })
      });
    }

    // Save all generated insights to database
    if (generatedInsights.length > 0) {
      await prisma.insight.createMany({
        data: generatedInsights.map(insight => ({
          ...insight,
          userId
        }))
      });
    }

    res.status(201).json({
      success: true,
      message: `Generated ${generatedInsights.length} new insights`,
      data: {
        count: generatedInsights.length,
        insights: generatedInsights
      }
    });

  } catch (error) {
    logger.error('Error generating insights:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate insights'
      }
    });
  }
});

// PUT /api/insights/:id/read - Mark insight as read
router.put('/:id/read', async (req, res) => {
  try {
    const userId = req.user!.id;
    const insightId = req.params.id;

    const existingInsight = await prisma.insight.findFirst({
      where: {
        id: insightId,
        userId
      }
    });

    if (!existingInsight) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Insight not found'
        }
      });
    }

    const insight = await prisma.insight.update({
      where: { id: insightId },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Insight marked as read',
      data: insight
    });

  } catch (error) {
    logger.error('Error marking insight as read:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to mark insight as read'
      }
    });
  }
});

// PUT /api/insights/:id/dismiss - Dismiss insight
router.put('/:id/dismiss', async (req, res) => {
  try {
    const userId = req.user!.id;
    const insightId = req.params.id;

    const existingInsight = await prisma.insight.findFirst({
      where: {
        id: insightId,
        userId
      }
    });

    if (!existingInsight) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Insight not found'
        }
      });
    }

    const insight = await prisma.insight.update({
      where: { id: insightId },
      data: { isDismissed: true, isRead: true }
    });

    res.json({
      success: true,
      message: 'Insight dismissed',
      data: insight
    });

  } catch (error) {
    logger.error('Error dismissing insight:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to dismiss insight'
      }
    });
  }
});

export default router;
