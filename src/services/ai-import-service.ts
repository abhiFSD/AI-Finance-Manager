/**
 * AI Import Service
 * Orchestrates the complete import workflow:
 * 1. Parse document using AI
 * 2. Detect/create account
 * 3. Save transactions with duplicate detection
 * 4. Update account balance
 */

import prisma from '../lib/prisma';
import { parseTransactions, type RawFinancialData, type ParsedTransactionData } from './parsers/ai-parser';
import {
  findOrCreateAccount,
  findDuplicateTransaction,
  updateAccountBalance,
  type FindOrCreateAccountInput,
} from './account-manager';
import type { TransactionType } from '@prisma/client';

export interface ImportResult {
  success: boolean;
  accountId?: string;
  accountName?: string;
  transactionsImported?: number;
  duplicatesSkipped?: number;
  transactions?: any[];
  accountBalance?: number;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    parsingTime?: number;
    importTime?: number;
    confidence?: number;
  };
}

/**
 * Calculate transaction type based on amount and description patterns
 */
function inferTransactionType(
  parsed: ParsedTransactionData,
  accountType?: string
): TransactionType {
  // If already specified, use it
  if (parsed.type && ['INCOME', 'EXPENSE', 'TRANSFER'].includes(parsed.type)) {
    return parsed.type as TransactionType;
  }

  // For credit cards, treat as expenses by default
  if (accountType === 'CREDIT_CARD') {
    return 'EXPENSE';
  }

  // Default to EXPENSE
  return 'EXPENSE';
}

/**
 * Validate transaction data before saving
 */
function validateTransaction(txn: ParsedTransactionData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!txn.date) {
    errors.push('Missing transaction date');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(txn.date)) {
    errors.push('Invalid date format, expected YYYY-MM-DD');
  }

  if (!txn.description || txn.description.trim().length === 0) {
    errors.push('Missing transaction description');
  }

  if (typeof txn.amount !== 'number' || txn.amount < 0) {
    errors.push('Invalid transaction amount');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Main import method - orchestrates the entire workflow
 */
export async function parseAndImport(
  userId: string,
  rawData: RawFinancialData,
  options: {
    skipDuplicateDetection?: boolean;
    updateBalance?: boolean;
    categoryMapping?: Record<string, string>;
  } = {}
): Promise<ImportResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let importedCount = 0;
  let duplicateCount = 0;
  const importedTransactions: any[] = [];

  try {
    // Step 1: Parse document using AI
    console.log('Step 1: Parsing document with AI...');
    const parseResult = await parseTransactions(rawData);

    if (!parseResult.success) {
      return {
        success: false,
        errors: [parseResult.error || 'Failed to parse document'],
        metadata: { parsingTime: parseResult.parsingTime },
      };
    }

    console.log(`AI parsing successful: ${parseResult.transactions?.length} transactions found`);

    if (!parseResult.transactions || parseResult.transactions.length === 0) {
      return {
        success: false,
        errors: ['No transactions found in document'],
        metadata: { parsingTime: parseResult.parsingTime, confidence: parseResult.confidence },
      };
    }

    // Step 2: Find or create account
    console.log('Step 2: Finding or creating account...');
    const accountInfo = parseResult.accountInfo;

    const accountInput: FindOrCreateAccountInput = {
      userId,
      bankName: accountInfo?.bankName,
      accountNumber: accountInfo?.accountNumber,
      accountNumberLastFour: accountInfo?.accountNumberLastFour,
      accountType: accountInfo?.accountType,
      currency: accountInfo?.currency || 'INR',
    };

    const accountResult = await findOrCreateAccount(accountInput);
    console.log(`Account: ${accountResult.name} (${accountResult.isExisting ? 'existing' : 'new'})`);

    // Step 3: Save transactions with duplicate detection
    console.log('Step 3: Importing transactions...');
    const transactionDate = new Date();

    for (const parsedTxn of parseResult.transactions) {
      try {
        // Validate transaction
        const validation = validateTransaction(parsedTxn);
        if (!validation.valid) {
          warnings.push(`Transaction skipped: ${validation.errors.join('; ')}`);
          continue;
        }

        const txnDate = new Date(parsedTxn.date);

        // Check for duplicates
        if (!options.skipDuplicateDetection) {
          const duplicate = await findDuplicateTransaction(
            userId,
            accountResult.id,
            parsedTxn.description,
            parsedTxn.amount,
            txnDate,
            3 // 3-day tolerance
          );

          if (duplicate) {
            console.log(`Duplicate detected: ${parsedTxn.description}`);
            duplicateCount++;
            warnings.push(`Duplicate skipped: ${parsedTxn.description} (${parsedTxn.amount})`);
            continue;
          }
        }

        // Determine category ID if mapping provided
        let categoryId: string | undefined;
        if (options.categoryMapping && parsedTxn.category) {
          const categoryName = parsedTxn.category;
          const mapped = options.categoryMapping[categoryName];
          if (mapped) {
            // Try to find category by ID or name
            const category = await prisma.category.findFirst({
              where: {
                OR: [
                  { id: mapped },
                  { name: { contains: categoryName } },
                ],
              },
            });
            categoryId = category?.id;
          }
        }

        // Infer transaction type
        const txnType = inferTransactionType(parsedTxn, accountResult.type);

        // Create transaction
        const transaction = await prisma.transaction.create({
          data: {
            userId,
            accountId: accountResult.id,
            date: txnDate,
            description: parsedTxn.description,
            amount: parsedTxn.amount,
            type: txnType,
            merchantName: parsedTxn.merchantName,
            categoryId: categoryId,
            notes: parsedTxn.notes || `Imported from: ${rawData.fileName || 'document'}`,
          },
          include: {
            category: {
              select: { id: true, name: true, icon: true },
            },
            account: {
              select: { id: true, name: true },
            },
          },
        });

        importedTransactions.push(transaction);
        importedCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to import transaction: ${errorMsg}`);
      }
    }

    console.log(`Imported ${importedCount} transactions, skipped ${duplicateCount} duplicates`);

    // Step 4: Update account balance if provided
    if (options.updateBalance && accountInfo?.balance !== undefined) {
      console.log('Step 4: Updating account balance...');
      await updateAccountBalance(accountResult.id, accountInfo.balance);
    }

    return {
      success: true,
      accountId: accountResult.id,
      accountName: accountResult.name,
      transactionsImported: importedCount,
      duplicatesSkipped: duplicateCount,
      transactions: importedTransactions,
      accountBalance: accountInfo?.balance,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        parsingTime: parseResult.parsingTime,
        importTime: Date.now() - startTime,
        confidence: parseResult.confidence,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      errors: [errorMsg],
      metadata: { importTime: Date.now() - startTime },
    };
  }
}

/**
 * Bulk import multiple documents
 */
export async function parseAndImportBulk(
  userId: string,
  documents: RawFinancialData[],
  options: {
    skipDuplicateDetection?: boolean;
    updateBalance?: boolean;
  } = {}
): Promise<{
  success: boolean;
  results: ImportResult[];
  summary: {
    totalDocuments: number;
    successfulImports: number;
    failedImports: number;
    totalTransactionsImported: number;
    totalDuplicatesSkipped: number;
  };
}> {
  const results: ImportResult[] = [];
  let successCount = 0;
  let totalImported = 0;
  let totalDuplicates = 0;

  for (const doc of documents) {
    const result = await parseAndImport(userId, doc, options);
    results.push(result);

    if (result.success) {
      successCount++;
      totalImported += result.transactionsImported || 0;
      totalDuplicates += result.duplicatesSkipped || 0;
    }
  }

  return {
    success: results.some(r => r.success),
    results,
    summary: {
      totalDocuments: documents.length,
      successfulImports: successCount,
      failedImports: documents.length - successCount,
      totalTransactionsImported: totalImported,
      totalDuplicatesSkipped: totalDuplicates,
    },
  };
}

/**
 * Get import history for a user
 */
export async function getImportHistory(userId: string, limit: number = 20): Promise<any[]> {
  return prisma.transaction.findMany({
    where: {
      userId,
      notes: {
        contains: 'Imported from',
      },
    },
    include: {
      account: {
        select: { id: true, name: true },
      },
      category: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Rollback an import by deleting all transactions created from a specific file
 */
export async function rollbackImport(userId: string, fileName: string): Promise<number> {
  const result = await prisma.transaction.deleteMany({
    where: {
      userId,
      notes: {
        contains: `Imported from: ${fileName}`,
      },
    },
  });

  return result.count;
}

export default {
  parseAndImport,
  parseAndImportBulk,
  getImportHistory,
  rollbackImport,
};
