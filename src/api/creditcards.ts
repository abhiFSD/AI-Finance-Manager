import express from 'express';
import { CreditCardType, PaymentType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { 
  createCreditCardSchema, 
  updateCreditCardSchema,
  creditCardPaymentSchema,
  creditCardFiltersSchema
} from '../utils/validators';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Types
interface CreditCardFilters {
  page?: number;
  limit?: number;
  cardType?: CreditCardType;
  issuer?: string;
  isActive?: boolean;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
}

// GET /api/credit-cards - List all credit cards with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate query parameters
    const { error, value: filters } = creditCardFiltersSchema.validate(req.query);
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
      cardType,
      issuer,
      isActive,
      dueDateFrom,
      dueDateTo,
      search
    }: CreditCardFilters = filters;

    // Build where clause
    const where: any = {
      userId,
      ...(cardType && { cardType }),
      ...(issuer && { issuer: { contains: issuer, mode: 'insensitive' } }),
      ...(isActive !== undefined && { isActive }),
      ...(dueDateFrom || dueDateTo) && {
        dueDate: {
          ...(dueDateFrom && { gte: new Date(dueDateFrom) }),
          ...(dueDateTo && { lte: new Date(dueDateTo) })
        }
      },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { issuer: { contains: search, mode: 'insensitive' } },
          { lastFourDigits: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    // Get total count
    const total = await prisma.creditCard.count({ where });

    // Get credit cards with pagination
    const creditCards = await prisma.creditCard.findMany({
      where,
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 5 // Get latest 5 payments
        },
        _count: {
          select: { payments: true }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    // Calculate utilization percentage for each card
    const cardsWithUtilization = creditCards.map(card => {
      const utilizationPercentage = card.creditLimit > 0 ? 
        Math.min((card.currentBalance / card.creditLimit) * 100, 100) : 0;
      const availableCredit = Math.max(card.creditLimit - card.currentBalance, 0);
      
      // Calculate days until due date
      let daysUntilDue = null;
      if (card.dueDate) {
        const today = new Date();
        const dueDate = new Date(card.dueDate);
        daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        ...card,
        utilizationPercentage,
        availableCredit,
        daysUntilDue
      };
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: 'Credit cards retrieved successfully',
      data: {
        data: cardsWithUtilization,
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
    logger.error('Error fetching credit cards:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch credit cards'
      }
    });
  }
});

// GET /api/credit-cards/stats - Get credit card statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get all user credit cards
    const creditCards = await prisma.creditCard.findMany({
      where: { userId },
      include: {
        _count: {
          select: { payments: true }
        }
      }
    });

    // Calculate statistics
    const totalCards = creditCards.length;
    const activeCards = creditCards.filter(c => c.isActive).length;
    const inactiveCards = totalCards - activeCards;
    const totalLimit = creditCards.reduce((sum, c) => sum + c.creditLimit, 0);
    const totalBalance = creditCards.reduce((sum, c) => sum + c.currentBalance, 0);
    const totalAvailableCredit = totalLimit - totalBalance;
    const avgUtilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

    // Get cards by type
    const cardsByType = creditCards.reduce((acc: any, card) => {
      const type = card.cardType;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalLimit: 0,
          totalBalance: 0
        };
      }
      acc[type].count++;
      acc[type].totalLimit += card.creditLimit;
      acc[type].totalBalance += card.currentBalance;
      return acc;
    }, {});

    // Get high utilization cards (>70%)
    const highUtilizationCards = creditCards.filter(c => 
      c.isActive && 
      c.creditLimit > 0 && 
      (c.currentBalance / c.creditLimit) > 0.7
    ).length;

    // Get cards with upcoming due dates (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const upcomingPayments = creditCards.filter(c => 
      c.dueDate && 
      c.isActive && 
      new Date(c.dueDate) <= sevenDaysFromNow &&
      new Date(c.dueDate) >= new Date()
    ).length;

    // Calculate total annual fees
    const totalAnnualFees = creditCards.reduce((sum, c) => sum + c.annualFee, 0);

    res.json({
      success: true,
      message: 'Credit card statistics retrieved successfully',
      data: {
        summary: {
          totalCards,
          activeCards,
          inactiveCards,
          totalLimit,
          totalBalance,
          totalAvailableCredit,
          avgUtilization: Math.round(avgUtilization * 100) / 100,
          highUtilizationCards,
          upcomingPayments,
          totalAnnualFees
        },
        byType: cardsByType
      }
    });

  } catch (error) {
    logger.error('Error fetching credit card statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch credit card statistics'
      }
    });
  }
});

// GET /api/credit-cards/:id - Get single credit card
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const cardId = req.params.id;

    const creditCard = await prisma.creditCard.findFirst({
      where: {
        id: cardId,
        userId
      },
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' }
        },
        _count: {
          select: { payments: true }
        }
      }
    });

    if (!creditCard) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Credit card not found'
        }
      });
    }

    // Calculate utilization and other metrics
    const utilizationPercentage = creditCard.creditLimit > 0 ? 
      Math.min((creditCard.currentBalance / creditCard.creditLimit) * 100, 100) : 0;
    const availableCredit = Math.max(creditCard.creditLimit - creditCard.currentBalance, 0);
    
    // Calculate days until due date
    let daysUntilDue = null;
    if (creditCard.dueDate) {
      const today = new Date();
      const dueDate = new Date(creditCard.dueDate);
      daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calculate total payments this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const monthlyPayments = await prisma.creditCardPayment.aggregate({
      where: {
        creditCardId: cardId,
        paymentDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: {
        amount: true
      },
      _count: true
    });

    const cardWithMetrics = {
      ...creditCard,
      utilizationPercentage,
      availableCredit,
      daysUntilDue,
      monthlyPayments: {
        total: Number(monthlyPayments._sum.amount || 0),
        count: monthlyPayments._count
      }
    };

    res.json({
      success: true,
      message: 'Credit card retrieved successfully',
      data: cardWithMetrics
    });

  } catch (error) {
    logger.error('Error fetching credit card:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch credit card'
      }
    });
  }
});

// POST /api/credit-cards - Create new credit card
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const { error, value: cardData } = createCreditCardSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid credit card data',
          details: error.details.map(d => d.message)
        }
      });
    }

    // Check if current balance doesn't exceed credit limit
    if (cardData.currentBalance > cardData.creditLimit) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Current balance cannot exceed credit limit'
        }
      });
    }

    // Check if due date is in the future (if provided)
    if (cardData.dueDate && new Date(cardData.dueDate) < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Due date must be in the future'
        }
      });
    }

    // Create credit card
    const creditCard = await prisma.creditCard.create({
      data: {
        ...cardData,
        userId
      },
      include: {
        payments: true,
        _count: {
          select: { payments: true }
        }
      }
    });

    // Calculate utilization
    const utilizationPercentage = creditCard.creditLimit > 0 ? 
      Math.min((creditCard.currentBalance / creditCard.creditLimit) * 100, 100) : 0;
    const availableCredit = Math.max(creditCard.creditLimit - creditCard.currentBalance, 0);

    const cardWithMetrics = {
      ...creditCard,
      utilizationPercentage,
      availableCredit
    };

    res.status(201).json({
      success: true,
      message: 'Credit card created successfully',
      data: cardWithMetrics
    });

  } catch (error) {
    logger.error('Error creating credit card:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create credit card'
      }
    });
  }
});

// PUT /api/credit-cards/:id - Update credit card
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const cardId = req.params.id;
    
    // Validate request body
    const { error, value: updateData } = updateCreditCardSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid credit card data',
          details: error.details.map(d => d.message)
        }
      });
    }

    // Check if credit card exists and belongs to user
    const existingCard = await prisma.creditCard.findFirst({
      where: {
        id: cardId,
        userId
      }
    });

    if (!existingCard) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Credit card not found'
        }
      });
    }

    // Validate current balance vs credit limit
    const newCreditLimit = updateData.creditLimit || existingCard.creditLimit;
    const newCurrentBalance = updateData.currentBalance || existingCard.currentBalance;
    
    if (newCurrentBalance > newCreditLimit) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Current balance cannot exceed credit limit'
        }
      });
    }

    // Check if due date is in the future (if being updated)
    if (updateData.dueDate && new Date(updateData.dueDate) < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Due date must be in the future'
        }
      });
    }

    // Update credit card
    const creditCard = await prisma.creditCard.update({
      where: { id: cardId },
      data: updateData,
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 5
        },
        _count: {
          select: { payments: true }
        }
      }
    });

    // Calculate metrics
    const utilizationPercentage = creditCard.creditLimit > 0 ? 
      Math.min((creditCard.currentBalance / creditCard.creditLimit) * 100, 100) : 0;
    const availableCredit = Math.max(creditCard.creditLimit - creditCard.currentBalance, 0);
    
    let daysUntilDue = null;
    if (creditCard.dueDate) {
      const today = new Date();
      const dueDate = new Date(creditCard.dueDate);
      daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    const cardWithMetrics = {
      ...creditCard,
      utilizationPercentage,
      availableCredit,
      daysUntilDue
    };

    res.json({
      success: true,
      message: 'Credit card updated successfully',
      data: cardWithMetrics
    });

  } catch (error) {
    logger.error('Error updating credit card:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update credit card'
      }
    });
  }
});

// DELETE /api/credit-cards/:id - Delete credit card
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const cardId = req.params.id;

    // Check if credit card exists and belongs to user
    const existingCard = await prisma.creditCard.findFirst({
      where: {
        id: cardId,
        userId
      },
      include: {
        _count: {
          select: { payments: true }
        }
      }
    });

    if (!existingCard) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Credit card not found'
        }
      });
    }

    // Check if card has outstanding balance
    if (existingCard.currentBalance > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CARD_HAS_BALANCE',
          message: 'Cannot delete credit card with outstanding balance. Please pay off the balance first.'
        }
      });
    }

    // Delete credit card (this will cascade delete payments)
    await prisma.creditCard.delete({
      where: { id: cardId }
    });

    res.json({
      success: true,
      message: 'Credit card deleted successfully',
      data: {
        deletedCard: `${existingCard.name} (*${existingCard.lastFourDigits})`,
        deletedPayments: existingCard._count.payments
      }
    });

  } catch (error) {
    logger.error('Error deleting credit card:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete credit card'
      }
    });
  }
});

// POST /api/credit-cards/:id/payment - Make payment
router.post('/:id/payment', async (req, res) => {
  try {
    const userId = req.user!.id;
    const cardId = req.params.id;
    
    // Validate request body
    const { error, value: paymentData } = creditCardPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid payment data',
          details: error.details.map(d => d.message)
        }
      });
    }

    // Check if credit card exists and belongs to user
    const existingCard = await prisma.creditCard.findFirst({
      where: {
        id: cardId,
        userId,
        isActive: true
      }
    });

    if (!existingCard) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Active credit card not found'
        }
      });
    }

    // Check if payment amount doesn't exceed current balance
    if (paymentData.amount > existingCard.currentBalance) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payment amount cannot exceed current balance'
        }
      });
    }

    // Use transaction to update card balance and create payment atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.creditCardPayment.create({
        data: {
          creditCardId: cardId,
          amount: paymentData.amount,
          paymentType: paymentData.paymentType,
          notes: paymentData.notes
        }
      });

      // Calculate new balance
      const newBalance = existingCard.currentBalance - paymentData.amount;
      
      // Update credit card balance
      const updatedCard = await tx.creditCard.update({
        where: { id: cardId },
        data: {
          currentBalance: newBalance
        },
        include: {
          payments: {
            orderBy: { paymentDate: 'desc' },
            take: 5
          },
          _count: {
            select: { payments: true }
          }
        }
      });

      return { updatedCard, payment };
    });

    // Calculate metrics
    const utilizationPercentage = result.updatedCard.creditLimit > 0 ? 
      Math.min((result.updatedCard.currentBalance / result.updatedCard.creditLimit) * 100, 100) : 0;
    const availableCredit = Math.max(result.updatedCard.creditLimit - result.updatedCard.currentBalance, 0);

    let daysUntilDue = null;
    if (result.updatedCard.dueDate) {
      const today = new Date();
      const dueDate = new Date(result.updatedCard.dueDate);
      daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    const cardWithMetrics = {
      ...result.updatedCard,
      utilizationPercentage,
      availableCredit,
      daysUntilDue
    };

    res.status(201).json({
      success: true,
      message: `Payment of ₹${paymentData.amount} processed successfully`,
      data: {
        creditCard: cardWithMetrics,
        payment: result.payment,
        balanceReduction: paymentData.amount,
        newBalance: result.updatedCard.currentBalance
      }
    });

  } catch (error) {
    logger.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process payment'
      }
    });
  }
});

export default router;