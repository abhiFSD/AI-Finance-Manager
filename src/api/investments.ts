import express from 'express';
import { InvestmentType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/investments - List user's investments
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { type, isActive, goalId } = req.query;

    // Build where clause
    const where: any = {
      userId,
      ...(type && { type: type as InvestmentType }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(goalId && { goalId: goalId as string })
    };

    const investments = await prisma.investment.findMany({
      where,
      include: {
        goal: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { lastUpdated: 'desc' }
      ]
    });

    // Calculate returns for each investment
    const investmentsWithReturns = investments.map(inv => ({
      ...inv,
      returns: inv.currentValue - inv.investedAmount,
      returnPercentage: inv.investedAmount > 0 ? 
        ((inv.currentValue - inv.investedAmount) / inv.investedAmount) * 100 : 0
    }));

    res.json({
      success: true,
      message: 'Investments retrieved successfully',
      data: investmentsWithReturns
    });

  } catch (error) {
    logger.error('Error fetching investments:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch investments'
      }
    });
  }
});

// GET /api/investments/stats - Portfolio summary
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user!.id;

    const investments = await prisma.investment.findMany({
      where: { userId, isActive: true }
    });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
    const currentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalReturns = currentValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    // Group by type
    const byType = investments.reduce((acc: any, inv) => {
      const type = inv.type;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          invested: 0,
          currentValue: 0,
          returns: 0
        };
      }
      acc[type].count++;
      acc[type].invested += inv.investedAmount;
      acc[type].currentValue += inv.currentValue;
      acc[type].returns += (inv.currentValue - inv.investedAmount);
      return acc;
    }, {});

    res.json({
      success: true,
      message: 'Portfolio stats retrieved successfully',
      data: {
        totalInvested,
        currentValue,
        totalReturns,
        returnPercentage: Math.round(returnPercentage * 100) / 100,
        byType
      }
    });

  } catch (error) {
    logger.error('Error fetching investment stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch investment stats'
      }
    });
  }
});

// GET /api/investments/allocation - Asset allocation breakdown
router.get('/allocation', async (req, res) => {
  try {
    const userId = req.user!.id;

    const investments = await prisma.investment.findMany({
      where: { userId, isActive: true }
    });

    const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);

    const allocation = investments.reduce((acc: any, inv) => {
      const type = inv.type;
      if (!acc[type]) {
        acc[type] = {
          value: 0,
          percentage: 0
        };
      }
      acc[type].value += inv.currentValue;
      return acc;
    }, {});

    // Calculate percentages
    Object.keys(allocation).forEach(type => {
      allocation[type].percentage = totalValue > 0 ? 
        (allocation[type].value / totalValue) * 100 : 0;
    });

    res.json({
      success: true,
      message: 'Asset allocation retrieved successfully',
      data: {
        totalValue,
        allocation
      }
    });

  } catch (error) {
    logger.error('Error fetching asset allocation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch asset allocation'
      }
    });
  }
});

// GET /api/investments/suggestions - Investment suggestions based on risk profile
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.user!.id;

    const riskProfile = await prisma.riskProfile.findUnique({
      where: { userId }
    });

    if (!riskProfile) {
      return res.json({
        success: true,
        message: 'No risk profile found. Complete risk assessment first.',
        data: {
          suggestions: [],
          note: 'Please complete your risk profile assessment to get personalized suggestions.'
        }
      });
    }

    // Define allocation recommendations based on risk category
    const allocations: any = {
      CONSERVATIVE: {
        FIXED_DEPOSIT: 50,
        DEBT_FUND: 30,
        MUTUAL_FUND: 15,
        ETF: 5
      },
      MODERATE: {
        FIXED_DEPOSIT: 30,
        DEBT_FUND: 30,
        MUTUAL_FUND: 30,
        ETF: 10
      },
      BALANCED: {
        DEBT_FUND: 20,
        MUTUAL_FUND: 40,
        ETF: 25,
        EQUITY: 15
      },
      GROWTH: {
        DEBT_FUND: 10,
        MUTUAL_FUND: 30,
        ETF: 35,
        EQUITY: 25
      },
      AGGRESSIVE: {
        MUTUAL_FUND: 20,
        ETF: 30,
        EQUITY: 40,
        CRYPTO: 10
      }
    };

    const recommendedAllocation = allocations[riskProfile.riskCategory] || allocations.BALANCED;

    res.json({
      success: true,
      message: 'Investment suggestions retrieved successfully',
      data: {
        riskCategory: riskProfile.riskCategory,
        riskScore: riskProfile.riskScore,
        recommendedAllocation,
        tips: [
          'Diversify across asset classes to minimize risk',
          'Review and rebalance your portfolio quarterly',
          'Consider SIPs for rupee cost averaging',
          'Keep emergency fund separate from investments'
        ]
      }
    });

  } catch (error) {
    logger.error('Error fetching investment suggestions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch investment suggestions'
      }
    });
  }
});

// GET /api/investments/:id - Single investment detail
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const investmentId = req.params.id;

    const investment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId
      },
      include: {
        goal: true
      }
    });

    if (!investment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Investment not found'
        }
      });
    }

    const returns = investment.currentValue - investment.investedAmount;
    const returnPercentage = investment.investedAmount > 0 ? 
      (returns / investment.investedAmount) * 100 : 0;

    res.json({
      success: true,
      message: 'Investment retrieved successfully',
      data: {
        ...investment,
        returns,
        returnPercentage: Math.round(returnPercentage * 100) / 100
      }
    });

  } catch (error) {
    logger.error('Error fetching investment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch investment'
      }
    });
  }
});

// POST /api/investments - Create new investment
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      name,
      type,
      platform,
      currentValue,
      investedAmount,
      units,
      purchaseDate,
      expectedReturn,
      goalId,
      notes
    } = req.body;

    // Basic validation
    if (!name || !type || !purchaseDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, type, and purchase date are required'
        }
      });
    }

    // Validate investment type
    if (!Object.values(InvestmentType).includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid investment type'
        }
      });
    }

    const investment = await prisma.investment.create({
      data: {
        userId,
        name,
        type,
        platform,
        currentValue: currentValue || 0,
        investedAmount: investedAmount || 0,
        units,
        purchaseDate: new Date(purchaseDate),
        expectedReturn,
        goalId,
        notes
      },
      include: {
        goal: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Investment created successfully',
      data: investment
    });

  } catch (error) {
    logger.error('Error creating investment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create investment'
      }
    });
  }
});

// PUT /api/investments/:id - Update investment
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const investmentId = req.params.id;

    // Check if investment exists
    const existingInvestment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId
      }
    });

    if (!existingInvestment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Investment not found'
        }
      });
    }

    const {
      name,
      type,
      platform,
      currentValue,
      investedAmount,
      units,
      purchaseDate,
      expectedReturn,
      goalId,
      notes,
      isActive
    } = req.body;

    const investment = await prisma.investment.update({
      where: { id: investmentId },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(platform !== undefined && { platform }),
        ...(currentValue !== undefined && { currentValue, lastUpdated: new Date() }),
        ...(investedAmount !== undefined && { investedAmount }),
        ...(units !== undefined && { units }),
        ...(purchaseDate && { purchaseDate: new Date(purchaseDate) }),
        ...(expectedReturn !== undefined && { expectedReturn }),
        ...(goalId !== undefined && { goalId }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        goal: true
      }
    });

    res.json({
      success: true,
      message: 'Investment updated successfully',
      data: investment
    });

  } catch (error) {
    logger.error('Error updating investment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update investment'
      }
    });
  }
});

// DELETE /api/investments/:id - Delete investment
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const investmentId = req.params.id;

    const existingInvestment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId
      }
    });

    if (!existingInvestment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Investment not found'
        }
      });
    }

    await prisma.investment.delete({
      where: { id: investmentId }
    });

    res.json({
      success: true,
      message: 'Investment deleted successfully',
      data: {
        deletedInvestment: existingInvestment.name
      }
    });

  } catch (error) {
    logger.error('Error deleting investment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete investment'
      }
    });
  }
});

export default router;
