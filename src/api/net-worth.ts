import express from 'express';
import { AccountType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/net-worth - Calculate and return net worth
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get all accounts (assets)
    const accounts = await prisma.account.findMany({
      where: { userId, isActive: true }
    });

    // Get all investments
    const investments = await prisma.investment.findMany({
      where: { userId, isActive: true }
    });

    // Get credit cards (liabilities)
    const creditCards = await prisma.creditCard.findMany({
      where: { userId, isActive: true }
    });

    // Get loans (liabilities)
    const loans = await prisma.loan.findMany({
      where: { userId, isActive: true }
    });

    // Calculate assets
    const accountsTotal = accounts
      .filter(acc => [AccountType.CHECKING, AccountType.SAVINGS, AccountType.WALLET].includes(acc.type))
      .reduce((sum, acc) => sum + acc.balance, 0);

    const investmentsTotal = investments.reduce((sum, inv) => sum + inv.currentValue, 0);

    const totalAssets = accountsTotal + investmentsTotal;

    // Calculate liabilities
    const creditCardDebt = creditCards.reduce((sum, card) => sum + card.currentBalance, 0);
    const loanDebt = loans.reduce((sum, loan) => sum + loan.outstandingBalance, 0);

    const totalLiabilities = creditCardDebt + loanDebt;

    // Calculate net worth
    const netWorth = totalAssets - totalLiabilities;

    // Breakdown by account
    const accountBreakdown = accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      balance: acc.balance
    }));

    const investmentBreakdown = investments.map(inv => ({
      id: inv.id,
      name: inv.name,
      type: inv.type,
      currentValue: inv.currentValue,
      returns: inv.currentValue - inv.investedAmount
    }));

    const creditCardBreakdown = creditCards.map(card => ({
      id: card.id,
      name: card.name,
      currentBalance: card.currentBalance,
      creditLimit: card.creditLimit,
      utilization: card.creditLimit > 0 ? (card.currentBalance / card.creditLimit) * 100 : 0
    }));

    const loanBreakdown = loans.map(loan => ({
      id: loan.id,
      name: loan.name,
      type: loan.type,
      outstandingBalance: loan.outstandingBalance,
      interestRate: loan.interestRate
    }));

    res.json({
      success: true,
      message: 'Net worth calculated successfully',
      data: {
        netWorth: Math.round(netWorth * 100) / 100,
        assets: {
          accounts: Math.round(accountsTotal * 100) / 100,
          investments: Math.round(investmentsTotal * 100) / 100,
          total: Math.round(totalAssets * 100) / 100,
          breakdown: {
            accounts: accountBreakdown,
            investments: investmentBreakdown
          }
        },
        liabilities: {
          creditCards: Math.round(creditCardDebt * 100) / 100,
          loans: Math.round(loanDebt * 100) / 100,
          total: Math.round(totalLiabilities * 100) / 100,
          breakdown: {
            creditCards: creditCardBreakdown,
            loans: loanBreakdown
          }
        },
        ratios: {
          debtToAssetRatio: totalAssets > 0 ? 
            Math.round((totalLiabilities / totalAssets) * 100 * 100) / 100 : 0,
          liquidityRatio: totalLiabilities > 0 ? 
            Math.round((accountsTotal / totalLiabilities) * 100) / 100 : 0
        }
      }
    });

  } catch (error) {
    logger.error('Error calculating net worth:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to calculate net worth'
      }
    });
  }
});

// GET /api/net-worth/history - Track net worth over time (optional)
router.get('/history', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { months = '12' } = req.query;

    // This is a simplified version - in production, you'd want to store
    // monthly snapshots in a separate table for accurate historical data
    
    // For now, we'll return a message indicating this needs implementation
    res.json({
      success: true,
      message: 'Net worth history (feature coming soon)',
      data: {
        note: 'Historical net worth tracking requires periodic snapshots. Consider implementing a monthly cron job to save net worth snapshots.',
        suggestion: 'Create a NetWorthSnapshot model to store monthly calculations'
      }
    });

  } catch (error) {
    logger.error('Error fetching net worth history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch net worth history'
      }
    });
  }
});

export default router;
