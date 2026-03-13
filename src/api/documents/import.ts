import express, { Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';

const router = express.Router();

/**
 * POST /api/documents/:documentId/import
 * Import transactions with smart account selection
 * 
 * Request Body:
 * {
 *   "accountId": "string" (required if createAccount is false),
 *   "createAccount": boolean (optional, default false),
 *   "accountData": {...} (optional, required if createAccount is true),
 *   "transactions": [
 *     {
 *       "date": "2026-02-09",
 *       "description": "...",
 *       "amount": 214365.48,
 *       "type": "INCOME|EXPENSE",
 *       "balance": 221878.23,
 *       "categoryId": null,
 *       "merchantName": "...",
 *       "tags": ["tag1", "tag2"],
 *       "notes": "..."
 *     }
 *   ]
 * }
 */
router.post('/:documentId/import', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { documentId } = req.params;
    const { transactions, accountId, createAccount, accountData } = req.body;

    // ===== VALIDATION =====
    // Check transactions array
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Transactions array is required and must not be empty'
        }
      });
    }

    // Check account requirement
    if (!accountId && !createAccount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Either accountId or createAccount is required'
        }
      });
    }

    // ===== DOCUMENT VALIDATION =====
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { transactions: true }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found'
        }
      });
    }

    // Check user ownership
    if (document.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied - you do not own this document'
        }
      });
    }

    // Check document status
    if (document.status !== 'EXTRACTED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Document must be in EXTRACTED status, current status: ${document.status}`
        }
      });
    }

    // ===== ACCOUNT HANDLING =====
    let targetAccountId = accountId;

    // Create account if requested
    if (createAccount && accountData) {
      try {
        const newAccount = await prisma.account.create({
          data: {
            userId,
            name: accountData.name || 'New Account',
            institution: accountData.institution || 'Unknown',
            type: accountData.type || 'SAVINGS',
            accountNumber: accountData.accountNumber || null,
            balance: 0,
            currency: accountData.currency || 'INR',
            isActive: true
          }
        });
        targetAccountId = newAccount.id;
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ACCOUNT_CREATION_FAILED',
            message: error instanceof Error ? error.message : 'Failed to create account'
          }
        });
      }
    }

    if (!targetAccountId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_ACCOUNT',
          message: 'No account could be determined'
        }
      });
    }

    // ===== ACCOUNT VERIFICATION =====
    const account = await prisma.account.findUnique({
      where: { id: targetAccountId }
    });

    if (!account || account.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Invalid account or access denied'
        }
      });
    }

    // ===== DUPLICATE DETECTION =====
    const existingTransactionCount = await prisma.transaction.count({
      where: {
        documentId,
        accountId: targetAccountId
      }
    });

    if (existingTransactionCount > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_IMPORT',
          message: 'Transactions from this document have already been imported'
        }
      });
    }

    // ===== ATOMIC TRANSACTION IMPORT =====
    let createdTransactions = [];
    let accountBalanceUpdate = 0;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const txnResults = [];

        for (const txn of transactions) {
          let categoryId = txn.categoryId || null;

          // Create or find category if provided
          if (txn.category && typeof txn.category === 'string' && !categoryId) {
            try {
              const existingCategory = await tx.category.findFirst({
                where: {
                  name: txn.category,
                  userId
                }
              });

              if (existingCategory) {
                categoryId = existingCategory.id;
              } else {
                const newCategory = await tx.category.create({
                  data: {
                    userId,
                    name: txn.category,
                    icon: '📁',
                    color: '#cccccc'
                  }
                });
                categoryId = newCategory.id;
              }
            } catch (catError) {
              console.error('Category creation error:', catError);
              // Continue without category if creation fails
            }
          }

          // Determine transaction type
          const transactionType = txn.type || (txn.amount < 0 ? 'EXPENSE' : 'INCOME');
          const absoluteAmount = Math.abs(txn.amount);

          // Create transaction
          const transaction = await tx.transaction.create({
            data: {
              userId,
              accountId: targetAccountId,
              documentId,
              date: new Date(txn.date),
              description: txn.description || 'Imported transaction',
              amount: absoluteAmount,
              type: transactionType,
              merchantName: txn.merchantName || null,
              categoryId,
              tags: Array.isArray(txn.tags)
                ? txn.tags.join(',')
                : typeof txn.tags === 'string'
                ? txn.tags
                : null,
              notes: txn.notes || null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });

          // Track balance update
          const balanceDelta =
            transactionType === 'INCOME' ? absoluteAmount : -absoluteAmount;
          accountBalanceUpdate += balanceDelta;

          txnResults.push(transaction);
        }

        // Update account balance
        await tx.account.update({
          where: { id: targetAccountId },
          data: {
            balance: {
              increment: accountBalanceUpdate
            }
          }
        });

        // Update document status
        await tx.document.update({
          where: { id: documentId },
          data: {
            status: 'IMPORTED',
            importedAt: new Date(),
            metadata: {
              ...(typeof document.metadata === 'object' ? document.metadata : {}),
              importSummary: {
                transactionsImported: txnResults.length,
                accountId: targetAccountId,
                totalAmount: accountBalanceUpdate,
                importedAt: new Date().toISOString()
              }
            }
          }
        });

        return txnResults;
      });

      createdTransactions = result;
    } catch (error) {
      console.error('Transaction import error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'IMPORT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to import transactions',
          details: 'Rollback completed - no data was modified'
        }
      });
    }

    // ===== SUCCESS RESPONSE =====
    res.json({
      success: true,
      data: {
        documentId,
        accountId: targetAccountId,
        accountCreated: createAccount && accountId === undefined,
        transactionsImported: createdTransactions.length,
        transactionIds: createdTransactions.map((t) => t.id),
        status: 'IMPORTED',
        totalAmount: accountBalanceUpdate,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Import endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during import',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

export default router;
