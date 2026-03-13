import express from 'express';
import { GoalCategory, GoalPriority } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { 
  createGoalSchema, 
  updateGoalSchema,
  goalContributeSchema,
  goalFiltersSchema
} from '../utils/validators';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Types
interface GoalFilters {
  page?: number;
  limit?: number;
  category?: GoalCategory;
  priority?: GoalPriority;
  isCompleted?: boolean;
  deadlineFrom?: Date;
  deadlineTo?: Date;
  search?: string;
}

// GET /api/goals - List all goals with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate query parameters
    const { error, value: filters } = goalFiltersSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.details.map(d => d.message)
        }
      });
    }

    const {
      page = 1,
      limit = 20,
      category,
      priority,
      isCompleted,
      deadlineFrom,
      deadlineTo,
      search
    }: GoalFilters = filters;

    // Build where clause
    const where: any = {
      userId,
      ...(category && { category }),
      ...(priority && { priority }),
      ...(isCompleted !== undefined && { isCompleted }),
      ...(deadlineFrom || deadlineTo) && {
        deadline: {
          ...(deadlineFrom && { gte: new Date(deadlineFrom) }),
          ...(deadlineTo && { lte: new Date(deadlineTo) })
        }
      },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    // Get total count
    const total = await prisma.goal.count({ where });

    // Get goals with pagination
    const goals = await prisma.goal.findMany({
      where,
      include: {
        contributions: {
          orderBy: { date: 'desc' },
          take: 5 // Get latest 5 contributions
        },
        _count: {
          select: { contributions: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { deadline: 'asc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    // Calculate progress percentage for each goal
    const goalsWithProgress = goals.map(goal => ({
      ...goal,
      progressPercentage: goal.targetAmount > 0 ? 
        Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0,
      remainingAmount: Math.max(goal.targetAmount - goal.currentAmount, 0)
    }));

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: 'Goals retrieved successfully',
      data: {
        data: goalsWithProgress,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching goals:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch goals'
      }
    });
  }
});

// GET /api/goals/stats - Get goal statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get all user goals
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: {
        _count: {
          select: { contributions: true }
        }
      }
    });

    // Calculate statistics
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.isCompleted).length;
    const inProgressGoals = totalGoals - completedGoals;
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const remainingAmount = totalTarget - totalSaved;
    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    // Get goals by category
    const goalsByCategory = goals.reduce((acc: any, goal) => {
      const category = goal.category;
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          targetAmount: 0,
          savedAmount: 0,
          completed: 0
        };
      }
      acc[category].count++;
      acc[category].targetAmount += goal.targetAmount;
      acc[category].savedAmount += goal.currentAmount;
      if (goal.isCompleted) acc[category].completed++;
      return acc;
    }, {});

    // Get goals by priority
    const goalsByPriority = goals.reduce((acc: any, goal) => {
      const priority = goal.priority;
      if (!acc[priority]) {
        acc[priority] = {
          count: 0,
          targetAmount: 0,
          savedAmount: 0
        };
      }
      acc[priority].count++;
      acc[priority].targetAmount += goal.targetAmount;
      acc[priority].savedAmount += goal.currentAmount;
      return acc;
    }, {});

    // Get approaching deadlines (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const approachingDeadlines = goals.filter(g => 
      g.deadline && 
      !g.isCompleted && 
      new Date(g.deadline) <= thirtyDaysFromNow &&
      new Date(g.deadline) >= new Date()
    ).length;

    res.json({
      success: true,
      message: 'Goal statistics retrieved successfully',
      data: {
        summary: {
          totalGoals,
          completedGoals,
          inProgressGoals,
          totalTarget,
          totalSaved,
          remainingAmount,
          overallProgress: Math.round(overallProgress * 100) / 100,
          approachingDeadlines
        },
        byCategory: goalsByCategory,
        byPriority: goalsByPriority
      }
    });

  } catch (error) {
    logger.error('Error fetching goal statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch goal statistics'
      }
    });
  }
});

// GET /api/goals/:id - Get single goal
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId
      },
      include: {
        contributions: {
          orderBy: { date: 'desc' }
        },
        _count: {
          select: { contributions: true }
        }
      }
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Goal not found'
        }
      });
    }

    // Calculate progress and remaining amount
    const goalWithProgress = {
      ...goal,
      progressPercentage: goal.targetAmount > 0 ? 
        Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0,
      remainingAmount: Math.max(goal.targetAmount - goal.currentAmount, 0)
    };

    res.json({
      success: true,
      message: 'Goal retrieved successfully',
      data: goalWithProgress
    });

  } catch (error) {
    logger.error('Error fetching goal:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch goal'
      }
    });
  }
});

// POST /api/goals - Create new goal
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const { error, value: goalData } = createGoalSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid goal data',
          details: error.details.map(d => d.message)
        }
      });
    }

    // Check if deadline is in the future
    if (goalData.deadline && new Date(goalData.deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Deadline must be in the future'
        }
      });
    }

    // Create goal
    const goal = await prisma.goal.create({
      data: {
        ...goalData,
        userId
      },
      include: {
        contributions: true,
        _count: {
          select: { contributions: true }
        }
      }
    });

    // Calculate progress
    const goalWithProgress = {
      ...goal,
      progressPercentage: goal.targetAmount > 0 ? 
        Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0,
      remainingAmount: Math.max(goal.targetAmount - goal.currentAmount, 0)
    };

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: goalWithProgress
    });

  } catch (error) {
    logger.error('Error creating goal:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create goal'
      }
    });
  }
});

// PUT /api/goals/:id - Update goal
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;
    
    // Validate request body
    const { error, value: updateData } = updateGoalSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid goal data',
          details: error.details.map(d => d.message)
        }
      });
    }

    // Check if goal exists and belongs to user
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId
      }
    });

    if (!existingGoal) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Goal not found'
        }
      });
    }

    // Check if deadline is in the future (if being updated)
    if (updateData.deadline && new Date(updateData.deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Deadline must be in the future'
        }
      });
    }

    // Auto-complete goal if currentAmount reaches or exceeds targetAmount
    if (updateData.currentAmount !== undefined && updateData.targetAmount !== undefined) {
      if (updateData.currentAmount >= updateData.targetAmount) {
        updateData.isCompleted = true;
      }
    } else if (updateData.currentAmount !== undefined && updateData.currentAmount >= existingGoal.targetAmount) {
      updateData.isCompleted = true;
    } else if (updateData.targetAmount !== undefined && existingGoal.currentAmount >= updateData.targetAmount) {
      updateData.isCompleted = true;
    }

    // Update goal
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: updateData,
      include: {
        contributions: {
          orderBy: { date: 'desc' },
          take: 5
        },
        _count: {
          select: { contributions: true }
        }
      }
    });

    // Calculate progress
    const goalWithProgress = {
      ...goal,
      progressPercentage: goal.targetAmount > 0 ? 
        Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0,
      remainingAmount: Math.max(goal.targetAmount - goal.currentAmount, 0)
    };

    res.json({
      success: true,
      message: 'Goal updated successfully',
      data: goalWithProgress
    });

  } catch (error) {
    logger.error('Error updating goal:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update goal'
      }
    });
  }
});

// DELETE /api/goals/:id - Delete goal
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    // Check if goal exists and belongs to user
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId
      },
      include: {
        _count: {
          select: { contributions: true }
        }
      }
    });

    if (!existingGoal) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Goal not found'
        }
      });
    }

    // Delete goal (this will cascade delete contributions)
    await prisma.goal.delete({
      where: { id: goalId }
    });

    res.json({
      success: true,
      message: 'Goal deleted successfully',
      data: {
        deletedGoal: existingGoal.name,
        deletedContributions: existingGoal._count.contributions
      }
    });

  } catch (error) {
    logger.error('Error deleting goal:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete goal'
      }
    });
  }
});

// POST /api/goals/:id/contribute - Add contribution to goal
router.post('/:id/contribute', async (req, res) => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;
    
    // Validate request body
    const { error, value: contributionData } = goalContributeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid contribution data',
          details: error.details.map(d => d.message)
        }
      });
    }

    // Check if goal exists and belongs to user
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId
      }
    });

    if (!existingGoal) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Goal not found'
        }
      });
    }

    // Check if goal is already completed
    if (existingGoal.isCompleted) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'GOAL_COMPLETED',
          message: 'Cannot add contribution to completed goal'
        }
      });
    }

    // Use transaction to update goal and create contribution atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create contribution
      const contribution = await tx.goalContribution.create({
        data: {
          goalId,
          amount: contributionData.amount,
          notes: contributionData.notes
        }
      });

      // Calculate new current amount
      const newCurrentAmount = existingGoal.currentAmount + contributionData.amount;
      
      // Update goal with new current amount and completion status
      const updatedGoal = await tx.goal.update({
        where: { id: goalId },
        data: {
          currentAmount: newCurrentAmount,
          isCompleted: newCurrentAmount >= existingGoal.targetAmount
        },
        include: {
          contributions: {
            orderBy: { date: 'desc' },
            take: 5
          },
          _count: {
            select: { contributions: true }
          }
        }
      });

      return { updatedGoal, contribution };
    });

    // Calculate progress
    const goalWithProgress = {
      ...result.updatedGoal,
      progressPercentage: result.updatedGoal.targetAmount > 0 ? 
        Math.min((result.updatedGoal.currentAmount / result.updatedGoal.targetAmount) * 100, 100) : 0,
      remainingAmount: Math.max(result.updatedGoal.targetAmount - result.updatedGoal.currentAmount, 0)
    };

    res.status(201).json({
      success: true,
      message: `Contribution of ₹${contributionData.amount} added successfully`,
      data: {
        goal: goalWithProgress,
        contribution: result.contribution,
        goalCompleted: result.updatedGoal.isCompleted && !existingGoal.isCompleted
      }
    });

  } catch (error) {
    logger.error('Error adding contribution:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to add contribution'
      }
    });
  }
});

export default router;