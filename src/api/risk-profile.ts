import express from 'express';
import { RiskCategory } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/risk-profile - Get user's risk profile
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;

    const riskProfile = await prisma.riskProfile.findUnique({
      where: { userId }
    });

    if (!riskProfile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Risk profile not found. Complete the assessment to create one.'
        }
      });
    }

    res.json({
      success: true,
      message: 'Risk profile retrieved successfully',
      data: {
        ...riskProfile,
        answers: riskProfile.answers ? JSON.parse(riskProfile.answers) : null
      }
    });

  } catch (error) {
    logger.error('Error fetching risk profile:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch risk profile'
      }
    });
  }
});

// POST /api/risk-profile - Create or update risk profile
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      age,
      incomeStability, // 1-5: 1=unstable, 5=very stable
      investmentHorizon, // short, medium, long (years)
      lossTolerance, // 1-5: 1=can't tolerate, 5=can tolerate high loss
      experience, // 1-5: 1=beginner, 5=expert
      monthlyIncome,
      monthlySavings
    } = req.body;

    // Basic validation
    if (!age || !incomeStability || !investmentHorizon || !lossTolerance || !experience) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All assessment fields are required: age, incomeStability, investmentHorizon, lossTolerance, experience'
        }
      });
    }

    // Calculate risk score (1-100)
    let riskScore = 0;

    // Age factor (max 20 points) - younger = higher risk tolerance
    if (age < 25) {
      riskScore += 20;
    } else if (age < 35) {
      riskScore += 18;
    } else if (age < 45) {
      riskScore += 15;
    } else if (age < 55) {
      riskScore += 10;
    } else {
      riskScore += 5;
    }

    // Income stability (max 20 points)
    riskScore += incomeStability * 4;

    // Investment horizon (max 25 points)
    const horizonMapping: any = {
      'short': 5,
      'medium': 15,
      'long': 25
    };
    riskScore += horizonMapping[investmentHorizon.toLowerCase()] || 10;

    // Loss tolerance (max 25 points)
    riskScore += lossTolerance * 5;

    // Experience (max 10 points)
    riskScore += experience * 2;

    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    // Map score to category
    let riskCategory: RiskCategory;
    if (riskScore <= 20) {
      riskCategory = RiskCategory.CONSERVATIVE;
    } else if (riskScore <= 40) {
      riskCategory = RiskCategory.MODERATE;
    } else if (riskScore <= 60) {
      riskCategory = RiskCategory.BALANCED;
    } else if (riskScore <= 80) {
      riskCategory = RiskCategory.GROWTH;
    } else {
      riskCategory = RiskCategory.AGGRESSIVE;
    }

    // Store answers as JSON
    const answers = JSON.stringify({
      age,
      incomeStability,
      investmentHorizon,
      lossTolerance,
      experience
    });

    // Upsert risk profile
    const riskProfile = await prisma.riskProfile.upsert({
      where: { userId },
      create: {
        userId,
        riskScore,
        riskCategory,
        investmentHorizon,
        monthlyIncome,
        monthlySavings,
        answers
      },
      update: {
        riskScore,
        riskCategory,
        investmentHorizon,
        monthlyIncome,
        monthlySavings,
        answers,
        assessedAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Risk profile saved successfully',
      data: {
        ...riskProfile,
        answers: JSON.parse(riskProfile.answers || '{}')
      }
    });

  } catch (error) {
    logger.error('Error saving risk profile:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to save risk profile'
      }
    });
  }
});

// GET /api/risk-profile/recommendations - Get investment recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.user!.id;

    const riskProfile = await prisma.riskProfile.findUnique({
      where: { userId }
    });

    if (!riskProfile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Risk profile not found. Complete the assessment first.'
        }
      });
    }

    // Asset allocation recommendations based on risk category
    const recommendations: any = {
      CONSERVATIVE: {
        allocation: {
          'Fixed Deposits': 50,
          'Debt Funds': 30,
          'Conservative Mutual Funds': 15,
          'Gold/ETFs': 5
        },
        description: 'Focus on capital preservation with minimal risk',
        expectedReturn: '6-8% annually',
        riskLevel: 'Low',
        recommendations: [
          'Prioritize fixed-income instruments',
          'Keep 6-12 months emergency fund',
          'Invest in high-rated debt funds',
          'Consider PPF and NSC for tax benefits'
        ]
      },
      MODERATE: {
        allocation: {
          'Fixed Deposits': 30,
          'Debt Funds': 30,
          'Balanced Mutual Funds': 25,
          'Large Cap Equity': 10,
          'Gold/ETFs': 5
        },
        description: 'Balanced approach with moderate growth potential',
        expectedReturn: '8-10% annually',
        riskLevel: 'Low to Medium',
        recommendations: [
          'Mix of debt and equity for stability',
          'Start SIPs in balanced funds',
          'Diversify across asset classes',
          'Review portfolio quarterly'
        ]
      },
      BALANCED: {
        allocation: {
          'Debt Funds': 20,
          'Balanced/Hybrid Funds': 30,
          'Large Cap Equity': 25,
          'Mid Cap Equity': 15,
          'Gold/International ETFs': 10
        },
        description: 'Equal focus on growth and stability',
        expectedReturn: '10-12% annually',
        riskLevel: 'Medium',
        recommendations: [
          'Diversify across market caps',
          'Maintain 40-50% in equity',
          'Use SIPs for rupee cost averaging',
          'Rebalance portfolio semi-annually'
        ]
      },
      GROWTH: {
        allocation: {
          'Debt Funds': 10,
          'Large Cap Equity': 25,
          'Mid Cap Equity': 30,
          'Small Cap/Sectoral': 20,
          'International Funds': 10,
          'Alternative Investments': 5
        },
        description: 'Growth-focused with higher risk tolerance',
        expectedReturn: '12-15% annually',
        riskLevel: 'Medium to High',
        recommendations: [
          'Majority allocation to equity',
          'Explore mid and small cap opportunities',
          'Consider international diversification',
          'Stay invested for 5+ years'
        ]
      },
      AGGRESSIVE: {
        allocation: {
          'Large Cap Equity': 20,
          'Mid Cap Equity': 25,
          'Small Cap Equity': 25,
          'Sectoral/Thematic Funds': 15,
          'International Equity': 10,
          'Alternative/Crypto': 5
        },
        description: 'Maximum growth potential with high risk',
        expectedReturn: '15%+ annually (volatile)',
        riskLevel: 'High',
        recommendations: [
          'Focus on high-growth sectors',
          'Accept short-term volatility',
          'Maintain long investment horizon (7+ years)',
          'Keep small emergency debt allocation',
          'Active portfolio monitoring'
        ]
      }
    };

    const recommendation = recommendations[riskProfile.riskCategory];

    res.json({
      success: true,
      message: 'Investment recommendations retrieved successfully',
      data: {
        riskCategory: riskProfile.riskCategory,
        riskScore: riskProfile.riskScore,
        ...recommendation
      }
    });

  } catch (error) {
    logger.error('Error fetching recommendations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch recommendations'
      }
    });
  }
});

export default router;
