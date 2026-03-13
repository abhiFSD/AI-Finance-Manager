import express from 'express';
import { AlertType, AlertPriority, TransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/alerts - List user's alerts
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { isRead, type, limit = '20' } = req.query;

    const where: any = {
      userId,
      ...(isRead !== undefined && { isRead: isRead === 'true' }),
      ...(type && { type: type as AlertType })
    };

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: [
        { isRead: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      message: 'Alerts retrieved successfully',
      data: alerts
    });

  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch alerts'
      }
    });
  }
});

// POST /api/alerts/generate - Generate alerts based on user data
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user!.id;
    const generatedAlerts: any[] = [];
    const now = new Date();

    // 1. Check budget exceeded
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const budgets = await prisma.budget.findMany({
      where: { userId, isActive: true }
    });

    for (const budget of budgets) {
      const spent = await prisma.transaction.aggregate({
        where: {
          userId,
          category: budget.category,
          type: TransactionType.EXPENSE,
          date: { gte: firstDayThisMonth }
        },
        _sum: { amount: true }
      });

      const spentAmount = spent._sum.amount || 0;
      
      if (spentAmount > budget.amount) {
        generatedAlerts.push({
          type: AlertType.BUDGET_EXCEEDED,
          title: `${budget.category} budget exceeded`,
          message: `You've spent ₹${spentAmount.toFixed(0)} against your budget of ₹${budget.amount} for ${budget.category}`,
          priority: AlertPriority.HIGH,
          actionUrl: `/budgets/${budget.id}`
        });
      }
    }

    // 2. Loan payment due within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const upcomingLoanPayments = await prisma.loan.findMany({
      where: {
        userId,
        isActive: true,
        nextPaymentDate: {
          gte: now,
          lte: sevenDaysFromNow
        }
      }
    });

    for (const loan of upcomingLoanPayments) {
      const daysUntil = Math.ceil((loan.nextPaymentDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      generatedAlerts.push({
        type: AlertType.LOAN_PAYMENT_DUE,
        title: `${loan.name} payment due soon`,
        message: `Your EMI of ₹${loan.emiAmount} is due in ${daysUntil} day${daysUntil > 1 ? 's' : ''} (${loan.nextPaymentDate!.toLocaleDateString()})`,
        priority: daysUntil <= 2 ? AlertPriority.HIGH : AlertPriority.NORMAL,
        actionUrl: `/loans/${loan.id}`
      });
    }

    // 3. Credit card payment due within 7 days
    const upcomingCardPayments = await prisma.creditCard.findMany({
      where: {
        userId,
        isActive: true,
        dueDate: {
          gte: now,
          lte: sevenDaysFromNow
        }
      }
    });

    for (const card of upcomingCardPayments) {
      const daysUntil = Math.ceil((card.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      generatedAlerts.push({
        type: AlertType.BILL_DUE,
        title: `${card.name} payment due soon`,
        message: `Minimum payment of ₹${card.minimumDue || 0} is due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}. Current balance: ₹${card.currentBalance}`,
        priority: daysUntil <= 2 ? AlertPriority.HIGH : AlertPriority.NORMAL,
        actionUrl: `/credit-cards/${card.id}`
      });
    }

    // 4. Goal milestone reached (25%, 50%, 75%, 100%)
    const goals = await prisma.goal.findMany({
      where: { userId, isCompleted: false }
    });

    for (const goal of goals) {
      const progress = goal.targetAmount > 0 ? 
        (goal.currentAmount / goal.targetAmount) * 100 : 0;

      const milestones = [25, 50, 75];
      
      for (const milestone of milestones) {
        // Check if we just crossed this milestone
        // In production, you'd track which milestones have been alerted
        if (progress >= milestone && progress < (milestone + 5)) {
          generatedAlerts.push({
            type: AlertType.GOAL_MILESTONE,
            title: `${goal.name} - ${milestone}% complete!`,
            message: `You've reached ${Math.round(progress)}% of your ${goal.name} goal (₹${goal.currentAmount.toFixed(0)} of ₹${goal.targetAmount})`,
            priority: AlertPriority.LOW,
            actionUrl: `/goals/${goal.id}`
          });
          break; // Only alert one milestone at a time
        }
      }

      // Goal completed
      if (progress >= 100) {
        generatedAlerts.push({
          type: AlertType.GOAL_MILESTONE,
          title: `🎉 Goal achieved: ${goal.name}`,
          message: `Congratulations! You've completed your ${goal.name} goal!`,
          priority: AlertPriority.HIGH,
          actionUrl: `/goals/${goal.id}`
        });
      }
    }

    // 5. Unusual spending (>2x daily average)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: { gte: thirtyDaysAgo }
      }
    });

    if (recentTransactions.length > 0) {
      const totalSpent = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const dailyAverage = totalSpent / 30;

      // Check today's spending
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const todayTransactions = await prisma.transaction.findMany({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          date: { gte: startOfToday }
        }
      });

      const todaySpent = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

      if (todaySpent > (dailyAverage * 2)) {
        generatedAlerts.push({
          type: AlertType.UNUSUAL_SPENDING,
          title: 'Unusual spending detected',
          message: `You've spent ₹${todaySpent.toFixed(0)} today, which is ${Math.round(todaySpent / dailyAverage)}x your daily average`,
          priority: AlertPriority.NORMAL,
          actionUrl: '/transactions'
        });
      }
    }

    // Save all generated alerts to database
    if (generatedAlerts.length > 0) {
      await prisma.alert.createMany({
        data: generatedAlerts.map(alert => ({
          ...alert,
          userId
        }))
      });
    }

    res.status(201).json({
      success: true,
      message: `Generated ${generatedAlerts.length} new alerts`,
      data: {
        count: generatedAlerts.length,
        alerts: generatedAlerts
      }
    });

  } catch (error) {
    logger.error('Error generating alerts:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate alerts'
      }
    });
  }
});

// PUT /api/alerts/:id/read - Mark alert as read
router.put('/:id/read', async (req, res) => {
  try {
    const userId = req.user!.id;
    const alertId = req.params.id;

    const existingAlert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        userId
      }
    });

    if (!existingAlert) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Alert not found'
        }
      });
    }

    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Alert marked as read',
      data: alert
    });

  } catch (error) {
    logger.error('Error marking alert as read:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to mark alert as read'
      }
    });
  }
});

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const alertId = req.params.id;

    const existingAlert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        userId
      }
    });

    if (!existingAlert) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Alert not found'
        }
      });
    }

    await prisma.alert.delete({
      where: { id: alertId }
    });

    res.json({
      success: true,
      message: 'Alert deleted successfully',
      data: {
        deletedAlert: existingAlert.title
      }
    });

  } catch (error) {
    logger.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete alert'
      }
    });
  }
});

export default router;
