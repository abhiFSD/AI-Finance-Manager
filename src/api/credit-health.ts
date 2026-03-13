import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/credit-health - Get user's credit health history
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { limit = '10' } = req.query;

    const creditHealthRecords = await prisma.creditHealth.findMany({
      where: { userId },
      orderBy: { reportDate: 'desc' },
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      message: 'Credit health history retrieved successfully',
      data: creditHealthRecords
    });

  } catch (error) {
    logger.error('Error fetching credit health:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch credit health'
      }
    });
  }
});

// GET /api/credit-health/latest - Get most recent credit health record
router.get('/latest', async (req, res) => {
  try {
    const userId = req.user!.id;

    const latestRecord = await prisma.creditHealth.findFirst({
      where: { userId },
      orderBy: { reportDate: 'desc' }
    });

    if (!latestRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No credit health records found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Latest credit health record retrieved successfully',
      data: latestRecord
    });

  } catch (error) {
    logger.error('Error fetching latest credit health:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch latest credit health'
      }
    });
  }
});

// GET /api/credit-health/suggestions - Get improvement suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get latest credit health record
    const latestRecord = await prisma.creditHealth.findFirst({
      where: { userId },
      orderBy: { reportDate: 'desc' }
    });

    // Get credit cards to calculate utilization if not provided
    const creditCards = await prisma.creditCard.findMany({
      where: { userId, isActive: true }
    });

    let utilization = latestRecord?.creditUtilization || 0;
    
    // Calculate from credit cards if not in record
    if (!latestRecord || !latestRecord.creditUtilization) {
      const totalLimit = creditCards.reduce((sum, card) => sum + card.creditLimit, 0);
      const totalUsed = creditCards.reduce((sum, card) => sum + card.currentBalance, 0);
      utilization = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
    }

    const creditScore = latestRecord?.creditScore || 0;
    const missedPayments = latestRecord?.missedPayments || 0;

    const suggestions: any[] = [];

    // High utilization suggestions
    if (utilization > 30) {
      suggestions.push({
        category: 'Credit Utilization',
        severity: utilization > 50 ? 'HIGH' : 'MEDIUM',
        issue: `Your credit utilization is ${Math.round(utilization)}%`,
        recommendation: 'Try to keep credit utilization below 30% for optimal credit score',
        actionItems: [
          'Pay down existing balances',
          'Request credit limit increase',
          'Distribute spending across multiple cards',
          'Consider making mid-cycle payments'
        ]
      });
    } else if (utilization < 10) {
      suggestions.push({
        category: 'Credit Utilization',
        severity: 'INFO',
        issue: `Excellent credit utilization at ${Math.round(utilization)}%`,
        recommendation: 'Maintain this healthy utilization rate',
        actionItems: [
          'Continue using credit responsibly',
          'Keep old credit accounts active'
        ]
      });
    }

    // Missed payments
    if (missedPayments > 0) {
      suggestions.push({
        category: 'Payment History',
        severity: 'HIGH',
        issue: `You have ${missedPayments} missed payment(s) on record`,
        recommendation: 'Payment history is the most important factor for credit score',
        actionItems: [
          'Set up automatic payments for minimum due',
          'Set payment reminders 3-5 days before due date',
          'Pay all current dues on time for next 6 months',
          'Contact lenders to negotiate removal of negative marks'
        ]
      });
    } else {
      suggestions.push({
        category: 'Payment History',
        severity: 'INFO',
        issue: 'No missed payments - excellent!',
        recommendation: 'Continue making all payments on time',
        actionItems: [
          'Maintain your perfect payment record',
          'Consider autopay for minimum dues'
        ]
      });
    }

    // Credit score specific suggestions
    if (creditScore > 0) {
      if (creditScore < 650) {
        suggestions.push({
          category: 'Credit Score',
          severity: 'HIGH',
          issue: `Credit score is ${creditScore} (Fair/Poor range)`,
          recommendation: 'Focus on rebuilding credit health',
          actionItems: [
            'Pay all bills on time for at least 6 months',
            'Keep credit utilization below 30%',
            'Don\'t apply for new credit frequently',
            'Check credit report for errors',
            'Consider secured credit card to rebuild'
          ]
        });
      } else if (creditScore < 750) {
        suggestions.push({
          category: 'Credit Score',
          severity: 'MEDIUM',
          issue: `Credit score is ${creditScore} (Good range)`,
          recommendation: 'You\'re on the right track, push towards excellent',
          actionItems: [
            'Maintain low credit utilization',
            'Keep older credit accounts active',
            'Diversify credit mix (cards + loans)',
            'Avoid hard inquiries'
          ]
        });
      } else {
        suggestions.push({
          category: 'Credit Score',
          severity: 'INFO',
          issue: `Excellent credit score of ${creditScore}!`,
          recommendation: 'Maintain this outstanding credit health',
          actionItems: [
            'Continue current responsible habits',
            'Leverage for better loan rates',
            'Monitor for identity theft'
          ]
        });
      }
    }

    // Credit age
    const oldestAccountAge = latestRecord?.oldestAccountAge || 0;
    if (oldestAccountAge < 12) {
      suggestions.push({
        category: 'Credit Age',
        severity: 'MEDIUM',
        issue: 'Thin credit history',
        recommendation: 'Building credit history takes time',
        actionItems: [
          'Keep your oldest accounts open and active',
          'Use old cards occasionally to keep them active',
          'Avoid closing old credit cards',
          'Consider becoming authorized user on parent\'s card'
        ]
      });
    }

    // General healthy habits
    suggestions.push({
      category: 'Best Practices',
      severity: 'INFO',
      issue: 'Maintaining credit health',
      recommendation: 'Follow these ongoing practices',
      actionItems: [
        'Check credit report quarterly for errors',
        'Monitor credit score monthly',
        'Keep total debt below 30% of income',
        'Maintain emergency fund to avoid credit dependency',
        'Avoid co-signing loans unless absolutely necessary'
      ]
    });

    res.json({
      success: true,
      message: 'Credit health suggestions generated successfully',
      data: {
        currentStatus: {
          creditScore: creditScore || 'Not available',
          utilization: Math.round(utilization * 100) / 100,
          missedPayments,
          oldestAccountAge: oldestAccountAge || 'Not available'
        },
        suggestions
      }
    });

  } catch (error) {
    logger.error('Error generating credit health suggestions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate suggestions'
      }
    });
  }
});

// POST /api/credit-health - Add credit health record
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      creditScore,
      creditUtilization,
      totalCreditLimit,
      totalCreditUsed,
      onTimePayments,
      missedPayments,
      oldestAccountAge,
      reportDate,
      source,
      notes
    } = req.body;

    // Basic validation
    if (creditScore && (creditScore < 300 || creditScore > 900)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Credit score must be between 300 and 900'
        }
      });
    }

    const creditHealth = await prisma.creditHealth.create({
      data: {
        userId,
        creditScore,
        creditUtilization,
        totalCreditLimit,
        totalCreditUsed,
        onTimePayments,
        missedPayments,
        oldestAccountAge,
        reportDate: reportDate ? new Date(reportDate) : new Date(),
        source,
        notes
      }
    });

    res.status(201).json({
      success: true,
      message: 'Credit health record added successfully',
      data: creditHealth
    });

  } catch (error) {
    logger.error('Error adding credit health record:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to add credit health record'
      }
    });
  }
});

export default router;
