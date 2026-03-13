import express from 'express';
import multer from 'multer';
import { TransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { 
  createTransactionSchema, 
  updateTransactionSchema, 
  transactionFiltersSchema,
  transactionStatsSchema 
} from '../utils/validators';
import { logger } from '../utils/logger';
import * as XLSX from 'xlsx';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV, XLS, XLSX files
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, XLS, and XLSX files are allowed.'), false);
    }
  }
});

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Types
interface TransactionFilters {
  page?: number;
  limit?: number;
  accountId?: string;
  type?: TransactionType;
  categoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
  search?: string;
  isRecurring?: boolean;
  tags?: string[];
}

interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
  averageTransaction: number;
  categoryBreakdown: Array<{
    categoryName: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}

// GET /api/transactions - List all transactions with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate query parameters
    const { error, value: filters } = transactionFiltersSchema.validate(req.query);
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
      accountId,
      type,
      categoryId,
      dateFrom,
      dateTo,
      amountFrom,
      amountTo,
      search,
      isRecurring,
      tags
    }: TransactionFilters = filters;

    // Build where clause
    const where: any = {
      userId,
      ...(accountId && { accountId }),
      ...(type && { type }),
      ...(categoryId && { categoryId }),
      ...(isRecurring !== undefined && { isRecurring }),
      ...(dateFrom || dateTo) && {
        date: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) })
        }
      },
      ...(amountFrom !== undefined || amountTo !== undefined) && {
        amount: {
          ...(amountFrom !== undefined && { gte: amountFrom }),
          ...(amountTo !== undefined && { lte: amountTo })
        }
      },
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { merchantName: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(tags && tags.length > 0 && {
        tags: {
          hasSome: tags
        }
      })
    };

    // Get total count
    const total = await prisma.transaction.count({ where });

    // Get transactions with pagination
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true, type: true }
        },
        category: {
          select: { id: true, name: true, icon: true, color: true }
        },
        document: {
          select: { id: true, fileName: true, type: true }
        }
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: {
        data: transactions,
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
    logger.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch transactions'
      }
    });
  }
});

// GET /api/transactions/stats - Get transaction statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate query parameters
    const { error, value: filters } = transactionStatsSchema.validate(req.query);
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

    const { accountId, dateFrom, dateTo } = filters;

    // Build where clause
    const where: any = {
      userId,
      ...(accountId && { accountId }),
      ...(dateFrom || dateTo) && {
        date: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) })
        }
      }
    };

    // Get aggregate statistics
    const [incomeResult, expenseResult, totalCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.transaction.count({ where })
    ]);

    const totalIncome = Number(incomeResult._sum.amount || 0);
    const totalExpenses = Number(expenseResult._sum.amount || 0);
    const netIncome = totalIncome - totalExpenses;
    const averageTransaction = totalCount > 0 ? (totalIncome + totalExpenses) / totalCount : 0;

    // Get category breakdown
    const categoryBreakdown = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { ...where, categoryId: { not: null } },
      _sum: { amount: true },
      _count: true
    });

    // Fetch category details
    const categoryIds = categoryBreakdown.map(cb => cb.categoryId!);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true }
    });

    const categoryMap = categories.reduce((map, cat) => {
      map[cat.id] = cat.name;
      return map;
    }, {} as Record<string, string>);

    const totalCategoryAmount = categoryBreakdown.reduce((sum, cb) => sum + Number(cb._sum.amount || 0), 0);
    
    const formattedCategoryBreakdown = categoryBreakdown.map(cb => ({
      categoryName: categoryMap[cb.categoryId!] || 'Uncategorized',
      amount: Number(cb._sum.amount || 0),
      count: cb._count,
      percentage: totalCategoryAmount > 0 ? (Number(cb._sum.amount || 0) / totalCategoryAmount) * 100 : 0
    }));

    const stats: TransactionStats = {
      totalIncome,
      totalExpenses,
      netIncome,
      transactionCount: totalCount,
      averageTransaction,
      categoryBreakdown: formattedCategoryBreakdown
    };

    res.json({
      success: true,
      message: 'Transaction statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching transaction statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch transaction statistics'
      }
    });
  }
});

// GET /api/transactions/by-category - Get transactions grouped by category
router.get('/by-category', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const { accountId, dateFrom, dateTo } = req.query;

    // Build where clause
    const where: any = {
      userId,
      ...(accountId && { accountId: accountId as string }),
      ...(dateFrom || dateTo) && {
        date: {
          ...(dateFrom && { gte: new Date(dateFrom as string) }),
          ...(dateTo && { lte: new Date(dateTo as string) })
        }
      }
    };

    // Get transactions grouped by category
    const categoryData = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: true
    });

    // Fetch category details
    const categoryIds = categoryData
      .filter(cd => cd.categoryId)
      .map(cd => cd.categoryId!);
    
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true }
    });

    const categoryMap = categories.reduce((map, cat) => {
      map[cat.id] = cat.name;
      return map;
    }, {} as Record<string, string>);

    const result = categoryData.map(cd => ({
      category: cd.categoryId ? categoryMap[cd.categoryId] || 'Uncategorized' : 'Uncategorized',
      amount: Number(cd._sum.amount || 0),
      count: cd._count
    }));

    res.json({
      success: true,
      message: 'Transactions by category retrieved successfully',
      data: result
    });

  } catch (error) {
    logger.error('Error fetching transactions by category:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch transactions by category'
      }
    });
  }
});

// GET /api/transactions/trends - Get transaction trends over time
router.get('/trends', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const { 
      accountId, 
      period = 'monthly', 
      dateFrom, 
      dateTo 
    } = req.query;

    // Build where clause
    const where: any = {
      userId,
      ...(accountId && { accountId: accountId as string }),
      ...(dateFrom || dateTo) && {
        date: {
          ...(dateFrom && { gte: new Date(dateFrom as string) }),
          ...(dateTo && { lte: new Date(dateTo as string) })
        }
      }
    };

    // Get date range for trend analysis
    let startDate = dateFrom ? new Date(dateFrom as string) : new Date();
    let endDate = dateTo ? new Date(dateTo as string) : new Date();

    // If no date range specified, use last 12 months for monthly, 30 days for daily, 12 weeks for weekly
    if (!dateFrom && !dateTo) {
      endDate = new Date();
      switch (period) {
        case 'daily':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
          break;
        case 'weekly':
          startDate = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000); // 12 weeks ago
          break;
        case 'monthly':
        default:
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 12); // 12 months ago
          break;
      }
    }

    // Update where clause with calculated date range
    where.date = {
      gte: startDate,
      lte: endDate
    };

    // Get transactions for the period
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        date: true,
        amount: true,
        type: true
      },
      orderBy: { date: 'asc' }
    });

    // Group transactions by period
    const trendsMap = new Map<string, { date: string; income: number; expenses: number }>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      let periodKey: string;

      switch (period) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
        default:
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
          break;
      }

      if (!trendsMap.has(periodKey)) {
        trendsMap.set(periodKey, {
          date: periodKey,
          income: 0,
          expenses: 0
        });
      }

      const trend = trendsMap.get(periodKey)!;
      const amount = Number(transaction.amount);

      if (transaction.type === 'INCOME') {
        trend.income += amount;
      } else if (transaction.type === 'EXPENSE') {
        trend.expenses += amount;
      }
    });

    // Convert map to sorted array
    const trends = Array.from(trendsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      message: 'Transaction trends retrieved successfully',
      data: trends
    });

  } catch (error) {
    logger.error('Error fetching transaction trends:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch transaction trends'
      }
    });
  }
});

// GET /api/transactions/export - Export transactions to CSV/Excel
router.get('/export', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { format = 'csv', ...queryFilters } = req.query;
    
    // Validate query parameters (exclude pagination for export)
    const { error, value: filters } = transactionFiltersSchema.validate({
      ...queryFilters,
      page: 1,
      limit: 10000 // Max export limit
    });
    
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
      accountId,
      type,
      categoryId,
      dateFrom,
      dateTo,
      amountFrom,
      amountTo,
      search,
      isRecurring,
      tags
    }: TransactionFilters = filters;

    // Build where clause
    const where: any = {
      userId,
      ...(accountId && { accountId }),
      ...(type && { type }),
      ...(categoryId && { categoryId }),
      ...(isRecurring !== undefined && { isRecurring }),
      ...(dateFrom || dateTo) && {
        date: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) })
        }
      },
      ...(amountFrom !== undefined || amountTo !== undefined) && {
        amount: {
          ...(amountFrom !== undefined && { gte: amountFrom }),
          ...(amountTo !== undefined && { lte: amountTo })
        }
      },
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { merchantName: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(tags && tags.length > 0 && {
        tags: {
          hasSome: tags
        }
      })
    };

    // Get transactions for export
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: {
          select: { name: true, type: true }
        },
        category: {
          select: { name: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Format data for export
    const exportData = transactions.map(transaction => ({
      Date: transaction.date.toISOString().split('T')[0],
      Description: transaction.description,
      'Merchant Name': transaction.merchantName || '',
      Amount: Number(transaction.amount),
      Type: transaction.type,
      Account: transaction.account?.name || '',
      'Account Type': transaction.account?.type || '',
      Category: transaction.category?.name || 'Uncategorized',
      Tags: transaction.tags?.join(', ') || '',
      'Is Recurring': transaction.isRecurring ? 'Yes' : 'No',
      Notes: transaction.notes || '',
      'Created At': transaction.createdAt.toISOString(),
      'Updated At': transaction.updatedAt.toISOString()
    }));

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = Object.keys(exportData[0] || {});
      const csvRows = exportData.map(row => 
        csvHeaders.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      );
      
      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=transactions-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } else if (format === 'xlsx') {
      // Generate Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
      
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=transactions-${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(excelBuffer);
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: 'Invalid export format. Supported formats: csv, xlsx'
        }
      });
    }

  } catch (error) {
    logger.error('Error exporting transactions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to export transactions'
      }
    });
  }
});

// POST /api/transactions/import - Import transactions from CSV/Excel file
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { accountId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        }
      });
    }

    // Verify account belongs to user
    if (accountId) {
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId }
      });
      
      if (!account) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Account not found or access denied'
          }
        });
      }
    }

    // Parse file based on type
    let data: any[];
    
    if (req.file.mimetype === 'text/csv') {
      // Parse CSV
      const csvText = req.file.buffer.toString();
      const lines = csvText.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE',
            message: 'File must contain at least a header and one data row'
          }
        });
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = { _rowIndex: index + 2 };
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });
    } else {
      // Parse Excel
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    }

    // Process and validate transactions
    const imported: any[] = [];
    const errors: Array<{ row: number; error: string }> = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = row._rowIndex || i + 2;
      
      try {
        // Map common column names
        const transactionData = {
          date: new Date(
            row.Date || 
            row.date || 
            row['Transaction Date'] || 
            row.transactionDate
          ),
          description: 
            row.Description || 
            row.description || 
            row.Details || 
            row.details || 
            'Imported Transaction',
          merchantName: 
            row['Merchant Name'] || 
            row.merchantName || 
            row.Merchant || 
            row.merchant || 
            null,
          amount: parseFloat(
            (row.Amount || 
             row.amount || 
             row.Value || 
             row.value || 
             '0').toString().replace(/[^\d.-]/g, '')
          ),
          type: (
            row.Type || 
            row.type || 
            (parseFloat(row.Amount || '0') >= 0 ? 'INCOME' : 'EXPENSE')
          ).toUpperCase() as TransactionType,
          accountId: accountId || null,
          notes: row.Notes || row.notes || null,
          tags: row.Tags ? row.Tags.split(',').map((t: string) => t.trim()) : []
        };

        // Validate transaction data
        const { error } = createTransactionSchema.validate(transactionData);
        if (error) {
          errors.push({
            row: rowNumber,
            error: error.details.map(d => d.message).join(', ')
          });
          continue;
        }

        // Create transaction
        const transaction = await prisma.transaction.create({
          data: {
            ...transactionData,
            userId
          }
        });
        
        imported.push(transaction);
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      message: `Import completed. ${imported.length} transactions imported, ${errors.length} errors.`,
      data: {
        imported: imported.length,
        errors
      }
    });

  } catch (error) {
    logger.error('Error importing transactions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to import transactions'
      }
    });
  }
});

// GET /api/transactions/:id - Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const transactionId = req.params.id;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId
      },
      include: {
        account: {
          select: { id: true, name: true, type: true }
        },
        category: {
          select: { id: true, name: true, icon: true, color: true }
        },
        document: {
          select: { id: true, fileName: true, type: true }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Transaction not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Transaction retrieved successfully',
      data: transaction
    });

  } catch (error) {
    logger.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch transaction'
      }
    });
  }
});

// POST /api/transactions - Create new transaction
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const { error, value: transactionData } = createTransactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid transaction data',
          details: error.details.map(d => d.message)
        }
      });
    }

    // Verify account belongs to user (if provided)
    if (transactionData.accountId) {
      const account = await prisma.account.findFirst({
        where: {
          id: transactionData.accountId,
          userId
        }
      });

      if (!account) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Account not found or access denied'
          }
        });
      }
    }

    // Verify category belongs to user (if provided)
    if (transactionData.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: transactionData.categoryId,
          OR: [
            { userId },
            { isSystem: true } // Allow system categories
          ]
        }
      });

      if (!category) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Category not found or access denied'
          }
        });
      }
    }

    // Create transaction - convert tags array to comma-separated string for Prisma
    const prismaData = {
      ...transactionData,
      tags: Array.isArray(transactionData.tags) ? transactionData.tags.join(',') : (transactionData.tags || ''),
      userId
    };
    const transaction = await prisma.transaction.create({
      data: prismaData,
      include: {
        account: {
          select: { id: true, name: true, type: true }
        },
        category: {
          select: { id: true, name: true, icon: true, color: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });

  } catch (error) {
    logger.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create transaction'
      }
    });
  }
});

// PUT /api/transactions/:id - Update transaction
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const transactionId = req.params.id;
    
    // Validate request body
    const { error, value: updateData } = updateTransactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid transaction data',
          details: error.details.map(d => d.message)
        }
      });
    }

    // Check if transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId
      }
    });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Transaction not found'
        }
      });
    }

    // Verify account belongs to user (if being updated)
    if (updateData.accountId) {
      const account = await prisma.account.findFirst({
        where: {
          id: updateData.accountId,
          userId
        }
      });

      if (!account) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Account not found or access denied'
          }
        });
      }
    }

    // Verify category belongs to user (if being updated)
    if (updateData.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: updateData.categoryId,
          OR: [
            { userId },
            { isSystem: true }
          ]
        }
      });

      if (!category) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Category not found or access denied'
          }
        });
      }
    }

    // Update transaction
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: updateData,
      include: {
        account: {
          select: { id: true, name: true, type: true }
        },
        category: {
          select: { id: true, name: true, icon: true, color: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });

  } catch (error) {
    logger.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update transaction'
      }
    });
  }
});

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const transactionId = req.params.id;

    // Check if transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId
      }
    });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Transaction not found'
        }
      });
    }

    // Delete transaction
    await prisma.transaction.delete({
      where: { id: transactionId }
    });

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
      data: null
    });

  } catch (error) {
    logger.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete transaction'
      }
    });
  }
});

export default router;