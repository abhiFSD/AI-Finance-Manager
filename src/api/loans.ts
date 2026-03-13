import express from 'express';
import { LoanType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/loans - List user's loans
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { type, isActive } = req.query;

    const where: any = {
      userId,
      ...(type && { type: type as LoanType }),
      ...(isActive !== undefined && { isActive: isActive === 'true' })
    };

    const loans = await prisma.loan.findMany({
      where,
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 3
        },
        _count: {
          select: { payments: true }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { nextPaymentDate: 'asc' }
      ]
    });

    res.json({
      success: true,
      message: 'Loans retrieved successfully',
      data: loans
    });

  } catch (error) {
    logger.error('Error fetching loans:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch loans'
      }
    });
  }
});

// GET /api/loans/stats - Loan statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user!.id;

    const loans = await prisma.loan.findMany({
      where: { userId, isActive: true }
    });

    const totalDebt = loans.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
    const totalEMI = loans.reduce((sum, loan) => sum + (loan.emiAmount || 0), 0);
    const avgInterestRate = loans.length > 0 ? 
      loans.reduce((sum, loan) => sum + loan.interestRate, 0) / loans.length : 0;

    // Group by type
    const byType = loans.reduce((acc: any, loan) => {
      const type = loan.type;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalDebt: 0,
          totalEMI: 0,
          avgInterestRate: 0
        };
      }
      acc[type].count++;
      acc[type].totalDebt += loan.outstandingBalance;
      acc[type].totalEMI += loan.emiAmount || 0;
      acc[type].avgInterestRate += loan.interestRate;
      return acc;
    }, {});

    // Calculate average interest rate per type
    Object.keys(byType).forEach(type => {
      byType[type].avgInterestRate = byType[type].avgInterestRate / byType[type].count;
    });

    res.json({
      success: true,
      message: 'Loan stats retrieved successfully',
      data: {
        totalDebt,
        totalEMI,
        avgInterestRate: Math.round(avgInterestRate * 100) / 100,
        loanCount: loans.length,
        byType
      }
    });

  } catch (error) {
    logger.error('Error fetching loan stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch loan stats'
      }
    });
  }
});

// GET /api/loans/payoff-strategy - Calculate payoff strategies
router.get('/payoff-strategy', async (req, res) => {
  try {
    const userId = req.user!.id;

    const loans = await prisma.loan.findMany({
      where: { userId, isActive: true }
    });

    if (loans.length === 0) {
      return res.json({
        success: true,
        message: 'No active loans found',
        data: {
          avalanche: [],
          snowball: []
        }
      });
    }

    const extraPayment = parseFloat(req.query.extraPayment as string) || 0;

    // Avalanche strategy: highest interest rate first
    const avalancheLoans = [...loans].sort((a, b) => b.interestRate - a.interestRate);
    
    // Snowball strategy: smallest balance first
    const snowballLoans = [...loans].sort((a, b) => a.outstandingBalance - b.outstandingBalance);

    // Calculate payoff timeline and interest for both strategies
    const calculatePayoffPlan = (loanOrder: any[], strategy: string) => {
      let totalMonths = 0;
      let totalInterestPaid = 0;
      const plan: any[] = [];

      loanOrder.forEach((loan, index) => {
        const monthlyInterestRate = loan.interestRate / 100 / 12;
        const emi = loan.emiAmount || 0;
        let balance = loan.outstandingBalance;
        let monthsToPayoff = 0;
        let interestPaid = 0;

        // Add extra payment to this loan if it's the priority
        const effectiveEMI = index === 0 && extraPayment > 0 ? emi + extraPayment : emi;

        while (balance > 0 && monthsToPayoff < 600) { // max 50 years
          const interest = balance * monthlyInterestRate;
          const principal = Math.min(effectiveEMI - interest, balance);
          
          if (principal <= 0) break; // EMI too low to cover interest
          
          balance -= principal;
          interestPaid += interest;
          monthsToPayoff++;
        }

        totalMonths = Math.max(totalMonths, monthsToPayoff);
        totalInterestPaid += interestPaid;

        plan.push({
          loanId: loan.id,
          loanName: loan.name,
          monthsToPayoff,
          interestPaid: Math.round(interestPaid * 100) / 100,
          order: index + 1
        });
      });

      return {
        strategy,
        totalMonths,
        totalYears: Math.round((totalMonths / 12) * 10) / 10,
        totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
        payoffOrder: plan
      };
    };

    const avalanchePlan = calculatePayoffPlan(avalancheLoans, 'Avalanche (Highest Interest First)');
    const snowballPlan = calculatePayoffPlan(snowballLoans, 'Snowball (Smallest Balance First)');

    const interestSaved = snowballPlan.totalInterestPaid - avalanchePlan.totalInterestPaid;

    res.json({
      success: true,
      message: 'Payoff strategies calculated successfully',
      data: {
        avalanche: avalanchePlan,
        snowball: snowballPlan,
        comparison: {
          interestSaved: Math.round(interestSaved * 100) / 100,
          timeSavedMonths: snowballPlan.totalMonths - avalanchePlan.totalMonths,
          recommendation: interestSaved > 0 ? 
            'Avalanche strategy saves more on interest' : 
            'Snowball strategy provides psychological wins'
        },
        extraPaymentUsed: extraPayment
      }
    });

  } catch (error) {
    logger.error('Error calculating payoff strategy:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to calculate payoff strategy'
      }
    });
  }
});

// GET /api/loans/:id - Single loan with payment history
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const loanId = req.params.id;

    const loan = await prisma.loan.findFirst({
      where: {
        id: loanId,
        userId
      },
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Loan not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Loan retrieved successfully',
      data: loan
    });

  } catch (error) {
    logger.error('Error fetching loan:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch loan'
      }
    });
  }
});

// POST /api/loans - Create new loan
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      name,
      type,
      lender,
      principalAmount,
      outstandingBalance,
      interestRate,
      emiAmount,
      tenure,
      startDate,
      endDate,
      nextPaymentDate,
      notes
    } = req.body;

    // Basic validation
    if (!name || !type || !lender || !principalAmount || !interestRate || !startDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Required fields: name, type, lender, principalAmount, interestRate, startDate'
        }
      });
    }

    // Validate loan type
    if (!Object.values(LoanType).includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid loan type'
        }
      });
    }

    const loan = await prisma.loan.create({
      data: {
        userId,
        name,
        type,
        lender,
        principalAmount,
        outstandingBalance: outstandingBalance || principalAmount,
        interestRate,
        emiAmount,
        tenure,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : null,
        notes
      }
    });

    res.status(201).json({
      success: true,
      message: 'Loan created successfully',
      data: loan
    });

  } catch (error) {
    logger.error('Error creating loan:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create loan'
      }
    });
  }
});

// PUT /api/loans/:id - Update loan
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const loanId = req.params.id;

    const existingLoan = await prisma.loan.findFirst({
      where: {
        id: loanId,
        userId
      }
    });

    if (!existingLoan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Loan not found'
        }
      });
    }

    const {
      name,
      type,
      lender,
      principalAmount,
      outstandingBalance,
      interestRate,
      emiAmount,
      tenure,
      startDate,
      endDate,
      nextPaymentDate,
      isActive,
      notes
    } = req.body;

    const loan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(lender && { lender }),
        ...(principalAmount !== undefined && { principalAmount }),
        ...(outstandingBalance !== undefined && { outstandingBalance }),
        ...(interestRate !== undefined && { interestRate }),
        ...(emiAmount !== undefined && { emiAmount }),
        ...(tenure !== undefined && { tenure }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(nextPaymentDate !== undefined && { nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : null }),
        ...(isActive !== undefined && { isActive }),
        ...(notes !== undefined && { notes })
      }
    });

    res.json({
      success: true,
      message: 'Loan updated successfully',
      data: loan
    });

  } catch (error) {
    logger.error('Error updating loan:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update loan'
      }
    });
  }
});

// DELETE /api/loans/:id - Delete loan
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const loanId = req.params.id;

    const existingLoan = await prisma.loan.findFirst({
      where: {
        id: loanId,
        userId
      },
      include: {
        _count: {
          select: { payments: true }
        }
      }
    });

    if (!existingLoan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Loan not found'
        }
      });
    }

    await prisma.loan.delete({
      where: { id: loanId }
    });

    res.json({
      success: true,
      message: 'Loan deleted successfully',
      data: {
        deletedLoan: existingLoan.name,
        deletedPayments: existingLoan._count.payments
      }
    });

  } catch (error) {
    logger.error('Error deleting loan:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete loan'
      }
    });
  }
});

// POST /api/loans/:id/payments - Record loan payment
router.post('/:id/payments', async (req, res) => {
  try {
    const userId = req.user!.id;
    const loanId = req.params.id;
    const { amount, principal, interest, paymentDate, notes } = req.body;

    // Basic validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payment amount is required and must be greater than 0'
        }
      });
    }

    // Check if loan exists
    const existingLoan = await prisma.loan.findFirst({
      where: {
        id: loanId,
        userId
      }
    });

    if (!existingLoan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Loan not found'
        }
      });
    }

    // Use transaction to create payment and update loan balance
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.loanPayment.create({
        data: {
          loanId,
          amount,
          principal,
          interest,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes
        }
      });

      // Update loan outstanding balance
      const newBalance = Math.max(existingLoan.outstandingBalance - (principal || amount), 0);
      
      // Update next payment date (add 1 month)
      const nextDate = existingLoan.nextPaymentDate ? new Date(existingLoan.nextPaymentDate) : new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);

      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          outstandingBalance: newBalance,
          isActive: newBalance > 0,
          nextPaymentDate: newBalance > 0 ? nextDate : null
        }
      });

      return { payment, updatedLoan };
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment: result.payment,
        loan: result.updatedLoan,
        paidOff: result.updatedLoan.outstandingBalance === 0
      }
    });

  } catch (error) {
    logger.error('Error recording loan payment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to record loan payment'
      }
    });
  }
});

export default router;
