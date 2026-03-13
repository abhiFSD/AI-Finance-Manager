import express from 'express';
import Joi from 'joi';
import { AccountType, TransactionType } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation schemas
export const createAccountSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid(...Object.values(AccountType)).required(),
  institution: Joi.string().min(1).max(100).required(),
  accountNumber: Joi.string().max(50).optional(),
  balance: Joi.number().precision(2).default(0),
  currency: Joi.string().length(3).default('INR')
});

export const updateAccountSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  type: Joi.string().valid(...Object.values(AccountType)).optional(),
  institution: Joi.string().min(1).max(100).optional(),
  accountNumber: Joi.string().max(50).optional(),
  balance: Joi.number().precision(2).optional(),
  currency: Joi.string().length(3).optional()
});

// Account balance calculation helper
const calculateAccountBalance = async (accountId: string): Promise<number> => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { accountId },
      select: {
        amount: true,
        type: true
      }
    });

    let balance = 0;
    for (const transaction of transactions) {
      const amount = transaction.amount;
      
      switch (transaction.type) {
        case TransactionType.INCOME:
          balance += amount;
          break;
        case TransactionType.EXPENSE:
          balance -= amount;
          break;
        case TransactionType.TRANSFER:
          // For transfers, the amount could be positive or negative depending on direction
          // This might need more sophisticated handling based on your business logic
          balance += amount;
          break;
      }
    }

    return balance;
  } catch (error) {
    logger.error('Error calculating account balance', { accountId, error });
    throw new Error('Failed to calculate account balance');
  }
};

// GET /api/accounts - List all user accounts
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const [accounts, totalCount] = await Promise.all([
      prisma.account.findMany({
        where: { userId },
        include: {
          _count: {
            select: { transactions: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.account.count({
        where: { userId }
      })
    ]);

    res.json({
      success: true,
      data: {
        accounts,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching accounts', { userId: req.user!.id, error });
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch accounts'
      }
    });
  }
});

// GET /api/accounts/:id - Get single account details
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    const account = await prisma.account.findFirst({
      where: { 
        id: accountId,
        userId 
      },
      include: {
        _count: {
          select: { transactions: true }
        },
        transactions: {
          orderBy: { date: 'desc' },
          take: 10, // Get latest 10 transactions
          select: {
            id: true,
            date: true,
            description: true,
            amount: true,
            type: true,
            merchantName: true
          }
        }
      }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found'
        }
      });
    }

    res.json({
      success: true,
      data: { account }
    });

  } catch (error) {
    logger.error('Error fetching account', { userId: req.user!.id, accountId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch account'
      }
    });
  }
});

// POST /api/accounts - Create new account
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const { error, value } = createAccountSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const account = await prisma.account.create({
      data: {
        ...value,
        userId,
        balance: value.balance
      },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    logger.info('Account created', { userId, accountId: account.id });

    res.status(201).json({
      success: true,
      data: { account },
      message: 'Account created successfully'
    });

  } catch (error) {
    logger.error('Error creating account', { userId: req.user!.id, error });
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create account'
      }
    });
  }
});

// PUT /api/accounts/:id - Update account
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    // Validate request body
    const { error, value } = updateAccountSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    // Check if account exists and belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: { 
        id: accountId,
        userId 
      }
    });

    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found'
        }
      });
    }

    const account = await prisma.account.update({
      where: { id: accountId },
      data: value,
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    logger.info('Account updated', { userId, accountId });

    res.json({
      success: true,
      data: { account },
      message: 'Account updated successfully'
    });

  } catch (error) {
    logger.error('Error updating account', { userId: req.user!.id, accountId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update account'
      }
    });
  }
});

// DELETE /api/accounts/:id - Delete account
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    // Check if account exists and belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: { 
        id: accountId,
        userId 
      }
    });

    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found'
        }
      });
    }

    // Check if account has transactions
    const transactionCount = await prisma.transaction.count({
      where: { accountId }
    });

    if (transactionCount > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ACCOUNT_HAS_TRANSACTIONS',
          message: 'Cannot delete account with existing transactions. Archive the account instead.'
        }
      });
    }

    await prisma.account.delete({
      where: { id: accountId }
    });

    logger.info('Account deleted', { userId, accountId });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting account', { userId: req.user!.id, accountId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete account'
      }
    });
  }
});

// GET /api/accounts/:id/balance - Get account balance (calculated from transactions)
router.get('/:id/balance', async (req, res) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    // Check if account exists and belongs to user
    const account = await prisma.account.findFirst({
      where: { 
        id: accountId,
        userId 
      },
      select: {
        id: true,
        name: true,
        balance: true,
        currency: true,
        lastSynced: true
      }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found'
        }
      });
    }

    // Calculate balance from transactions
    const calculatedBalance = await calculateAccountBalance(accountId);
    const storedBalance = account.balance;

    res.json({
      success: true,
      data: {
        accountId: account.id,
        accountName: account.name,
        storedBalance,
        calculatedBalance,
        balanceDifference: calculatedBalance - storedBalance,
        currency: account.currency,
        lastSynced: account.lastSynced
      }
    });

  } catch (error) {
    logger.error('Error fetching account balance', { userId: req.user!.id, accountId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: {
        code: 'BALANCE_ERROR',
        message: 'Failed to fetch account balance'
      }
    });
  }
});

// POST /api/accounts/:id/sync - Sync account transactions and update balance
router.post('/:id/sync', async (req, res) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    // Check if account exists and belongs to user
    const account = await prisma.account.findFirst({
      where: { 
        id: accountId,
        userId 
      }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found'
        }
      });
    }

    // Calculate balance from transactions
    const calculatedBalance = await calculateAccountBalance(accountId);

    // Update account balance and last synced time
    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: {
        balance: calculatedBalance,
        lastSynced: new Date()
      },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    logger.info('Account synced', { userId, accountId, newBalance: calculatedBalance });

    res.json({
      success: true,
      data: { 
        account: updatedAccount,
        syncedBalance: calculatedBalance
      },
      message: 'Account synced successfully'
    });

  } catch (error) {
    logger.error('Error syncing account', { userId: req.user!.id, accountId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message: 'Failed to sync account'
      }
    });
  }
});

// Get transactions for a specific account
router.get('/:id/transactions', async (req, res) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, accountId },
        include: {
          category: { select: { id: true, name: true, icon: true, color: true } },
          account: { select: { id: true, name: true, type: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where: { userId, accountId } }),
    ]);

    res.json({
      success: true,
      message: 'Account transactions retrieved',
      data: {
        data: transactions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('Error fetching account transactions', { error });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch transactions' } });
  }
});

// Get account stats
router.get('/:id/stats', async (req, res) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    const [account, totalIncome, totalExpenses, transactionCount] = await Promise.all([
      prisma.account.findFirst({ where: { id: accountId, userId } }),
      prisma.transaction.aggregate({ where: { userId, accountId, type: 'INCOME' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { userId, accountId, type: 'EXPENSE' }, _sum: { amount: true } }),
      prisma.transaction.count({ where: { userId, accountId } }),
    ]);

    res.json({
      success: true,
      data: {
        balance: account?.balance || 0,
        totalIncome: totalIncome._sum.amount || 0,
        totalExpenses: totalExpenses._sum.amount || 0,
        transactionCount,
      },
    });
  } catch (error) {
    logger.error('Error fetching account stats', { error });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch stats' } });
  }
});

// Get balance history for an account
router.get('/:id/balance-history', async (req, res) => {
  try {
    const userId = req.user!.id;
    const accountId = req.params.id;

    // Generate balance history from transactions
    const transactions = await prisma.transaction.findMany({
      where: { userId, accountId },
      orderBy: { date: 'asc' },
      select: { date: true, amount: true, type: true },
    });

    const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
    const currentBalance = account?.balance || 0;

    // Work backwards from current balance
    let balance = currentBalance;
    const history: { date: string; balance: number }[] = [{ date: new Date().toISOString(), balance: currentBalance }];
    
    // Group by day, last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyChanges: Record<string, number> = {};
    for (const t of transactions) {
      if (new Date(t.date) >= thirtyDaysAgo) {
        const day = new Date(t.date).toISOString().split('T')[0];
        if (!dailyChanges[day]) dailyChanges[day] = 0;
        dailyChanges[day] += t.type === 'INCOME' ? t.amount : -t.amount;
      }
    }

    // Build history working backwards
    const result: { date: string; balance: number }[] = [];
    let runningBalance = currentBalance;
    for (let i = 0; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      result.unshift({ date: key, balance: Math.round(runningBalance * 100) / 100 });
      if (dailyChanges[key]) {
        runningBalance -= dailyChanges[key];
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error fetching balance history', { error });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch history' } });
  }
});

export default router;