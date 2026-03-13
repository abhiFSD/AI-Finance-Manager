import express from 'express';
import { prisma as db } from '../lib/prisma';
import { BudgetPeriod } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Type definitions for request bodies
interface CreateBudgetRequest {
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string;
  alertEnabled?: boolean;
  alertThreshold?: number;
}

interface UpdateBudgetRequest {
  categoryId?: string;
  amount?: number;
  period?: BudgetPeriod;
  startDate?: string;
  endDate?: string;
  alertEnabled?: boolean;
  alertThreshold?: number;
}

// Helper function to calculate period dates
function calculatePeriodDates(period: BudgetPeriod, startDate: Date): { start: Date; end: Date } {
  const start = new Date(startDate);
  let end = new Date(start);

  switch (period) {
    case 'DAILY':
      end.setDate(start.getDate() + 1);
      break;
    case 'WEEKLY':
      end.setDate(start.getDate() + 7);
      break;
    case 'MONTHLY':
      end.setMonth(start.getMonth() + 1);
      break;
    case 'QUARTERLY':
      end.setMonth(start.getMonth() + 3);
      break;
    case 'YEARLY':
      end.setFullYear(start.getFullYear() + 1);
      break;
    case 'CUSTOM':
      // For custom periods, end date must be provided
      break;
  }

  return { start, end };
}

// Helper function to get current period for a budget
function getCurrentPeriodDates(budget: any): { start: Date; end: Date } {
  const now = new Date();
  
  if (budget.period === 'CUSTOM') {
    return {
      start: new Date(budget.startDate),
      end: budget.endDate ? new Date(budget.endDate) : now
    };
  }

  // Calculate current period based on the budget's start date
  const originalStart = new Date(budget.startDate);
  let currentStart = new Date(originalStart);

  // Find the current period
  switch (budget.period) {
    case 'DAILY':
      const daysDiff = Math.floor((now.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24));
      currentStart.setDate(originalStart.getDate() + daysDiff);
      break;
    case 'WEEKLY':
      const weeksDiff = Math.floor((now.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
      currentStart.setDate(originalStart.getDate() + (weeksDiff * 7));
      break;
    case 'MONTHLY':
      const monthsDiff = (now.getFullYear() - originalStart.getFullYear()) * 12 + (now.getMonth() - originalStart.getMonth());
      currentStart.setMonth(originalStart.getMonth() + monthsDiff);
      break;
    case 'QUARTERLY':
      const quartersDiff = Math.floor(((now.getFullYear() - originalStart.getFullYear()) * 12 + (now.getMonth() - originalStart.getMonth())) / 3);
      currentStart.setMonth(originalStart.getMonth() + (quartersDiff * 3));
      break;
    case 'YEARLY':
      const yearsDiff = now.getFullYear() - originalStart.getFullYear();
      currentStart.setFullYear(originalStart.getFullYear() + yearsDiff);
      break;
  }

  return calculatePeriodDates(budget.period, currentStart);
}

// Helper function to calculate spending for a budget
async function calculateBudgetSpending(budget: any, userId: string) {
  const { start, end } = getCurrentPeriodDates(budget);

  const spending = await db.transaction.aggregate({
    where: {
      userId,
      categoryId: budget.categoryId,
      type: 'EXPENSE',
      date: {
        gte: start,
        lte: end
      }
    },
    _sum: {
      amount: true
    }
  });

  const totalSpent = Number(spending._sum.amount || 0);
  const budgetAmount = Number(budget.amount);
  const remaining = budgetAmount - totalSpent;
  const percentageUsed = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

  return {
    budgetAmount,
    totalSpent,
    remaining,
    percentageUsed: Math.round(percentageUsed * 100) / 100,
    periodStart: start,
    periodEnd: end,
    isOverBudget: totalSpent > budgetAmount,
    isAlertTriggered: budget.alertEnabled && percentageUsed >= budget.alertThreshold
  };
}

// GET /api/budgets - List all budgets
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;

    const budgets = await db.budget.findMany({
      where: { userId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate spending for each budget
    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        const spending = await calculateBudgetSpending(budget, userId);
        return {
          ...budget,
          spending
        };
      })
    );

    res.json({
      success: true,
      data: budgetsWithSpending,
      meta: {
        total: budgets.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch budgets',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// GET /api/budgets/summary - Get budget vs actual spending summary
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user!.id;

    const budgets = await db.budget.findMany({
      where: { userId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true
          }
        }
      }
    });

    // Calculate spending for all budgets
    const summaryData = await Promise.all(
      budgets.map(async (budget) => {
        const spending = await calculateBudgetSpending(budget, userId);
        return {
          budgetId: budget.id,
          categoryName: budget.category.name,
          period: budget.period,
          ...spending
        };
      })
    );

    // Calculate overall statistics
    const totalBudgeted = summaryData.reduce((sum, item) => sum + item.budgetAmount, 0);
    const totalSpent = summaryData.reduce((sum, item) => sum + item.totalSpent, 0);
    const totalRemaining = totalBudgeted - totalSpent;
    const overBudgetCount = summaryData.filter(item => item.isOverBudget).length;
    const alertTriggeredCount = summaryData.filter(item => item.isAlertTriggered).length;

    res.json({
      success: true,
      data: {
        summary: {
          totalBudgeted,
          totalSpent,
          totalRemaining,
          overallPercentageUsed: totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
          budgetCount: budgets.length,
          overBudgetCount,
          alertTriggeredCount
        },
        budgets: summaryData
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch budget summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// GET /api/budgets/:id - Get single budget with spending
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const budget = await db.budget.findFirst({
      where: {
        id,
        userId
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true
          }
        }
      }
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Budget not found'
        }
      });
    }

    // Calculate spending and get transaction details
    const spending = await calculateBudgetSpending(budget, userId);
    
    // Get recent transactions for this budget period
    const recentTransactions = await db.transaction.findMany({
      where: {
        userId,
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        date: {
          gte: spending.periodStart,
          lte: spending.periodEnd
        }
      },
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        id: true,
        date: true,
        description: true,
        merchantName: true,
        amount: true
      }
    });

    res.json({
      success: true,
      data: {
        ...budget,
        spending: {
          ...spending,
          recentTransactions
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// POST /api/budgets - Create budget
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { 
      categoryId, 
      amount, 
      period, 
      startDate, 
      endDate,
      alertEnabled = true,
      alertThreshold = 80
    } = req.body as CreateBudgetRequest;

    // Validation
    if (!categoryId || !amount || !period || !startDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'categoryId, amount, period, and startDate are required'
        }
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Budget amount must be greater than 0'
        }
      });
    }

    if (alertThreshold < 0 || alertThreshold > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Alert threshold must be between 0 and 100'
        }
      });
    }

    // Check if category exists and belongs to user
    const category = await db.category.findFirst({
      where: {
        id: categoryId,
        OR: [
          { userId },
          { isSystem: true, userId: null }
        ]
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Category not found'
        }
      });
    }

    // Check for existing budget for the same category and overlapping period
    const existingBudget = await db.budget.findFirst({
      where: {
        userId,
        categoryId,
        period,
        startDate: {
          lte: new Date(endDate || new Date())
        },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date(startDate) } }
        ]
      }
    });

    if (existingBudget) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_BUDGET',
          message: 'A budget for this category and period already exists'
        }
      });
    }

    const start = new Date(startDate);
    let end: Date | null = null;

    if (period === 'CUSTOM') {
      if (!endDate) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'End date is required for custom period budgets'
          }
        });
      }
      end = new Date(endDate);
      
      if (end <= start) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'End date must be after start date'
          }
        });
      }
    } else {
      // Calculate end date based on period
      const periodDates = calculatePeriodDates(period, start);
      end = periodDates.end;
    }

    const budget = await db.budget.create({
      data: {
        userId,
        categoryId,
        amount,
        period,
        startDate: start,
        endDate: end,
        alertEnabled,
        alertThreshold
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true
          }
        }
      }
    });

    // Calculate initial spending
    const spending = await calculateBudgetSpending(budget, userId);

    res.status(201).json({
      success: true,
      data: {
        ...budget,
        spending
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// PUT /api/budgets/:id - Update budget
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updateData = req.body as UpdateBudgetRequest;

    // Check if budget exists and belongs to user
    const existingBudget = await db.budget.findFirst({
      where: { id, userId }
    });

    if (!existingBudget) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Budget not found'
        }
      });
    }

    // Validation
    if (updateData.amount !== undefined && updateData.amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Budget amount must be greater than 0'
        }
      });
    }

    if (updateData.alertThreshold !== undefined && 
        (updateData.alertThreshold < 0 || updateData.alertThreshold > 100)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Alert threshold must be between 0 and 100'
        }
      });
    }

    // Validate category if being changed
    if (updateData.categoryId && updateData.categoryId !== existingBudget.categoryId) {
      const category = await db.category.findFirst({
        where: {
          id: updateData.categoryId,
          OR: [
            { userId },
            { isSystem: true, userId: null }
          ]
        }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found'
          }
        });
      }
    }

    // Validate dates if being changed
    let endDate = existingBudget.endDate;
    if (updateData.startDate || updateData.endDate || updateData.period) {
      const startDate = updateData.startDate ? new Date(updateData.startDate) : existingBudget.startDate;
      const period = updateData.period || existingBudget.period;

      if (period === 'CUSTOM') {
        if (updateData.endDate) {
          endDate = new Date(updateData.endDate);
        } else if (!existingBudget.endDate) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'End date is required for custom period budgets'
            }
          });
        }
        
        if (endDate && endDate <= startDate) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'End date must be after start date'
            }
          });
        }
      } else if (updateData.period && updateData.period !== 'CUSTOM') {
        // Recalculate end date for non-custom periods
        const periodDates = calculatePeriodDates(updateData.period, startDate);
        endDate = periodDates.end;
      }
    }

    const updatedBudget = await db.budget.update({
      where: { id },
      data: {
        ...updateData,
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: endDate || undefined
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true
          }
        }
      }
    });

    // Calculate updated spending
    const spending = await calculateBudgetSpending(updatedBudget, userId);

    res.json({
      success: true,
      data: {
        ...updatedBudget,
        spending
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// DELETE /api/budgets/:id - Delete budget
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if budget exists and belongs to user
    const existingBudget = await db.budget.findFirst({
      where: { id, userId }
    });

    if (!existingBudget) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Budget not found'
        }
      });
    }

    await db.budget.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Budget deleted successfully',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

export default router;