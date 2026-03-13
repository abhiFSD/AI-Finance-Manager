/**
 * Account Manager Service
 * Intelligently finds or creates accounts based on extracted data
 * - Smart matching using account number last 4 digits and bank name
 * - Auto-creates accounts from statement data
 * - Generates account names in standard format
 * - Handles duplicate detection and balance updates
 */

import prisma from '../lib/prisma';
import { AccountType } from '@prisma/client';
import type { ParsedAccountInfo } from './parsers/ai-parser';

export interface FindOrCreateAccountInput {
  userId: string;
  bankName?: string;
  accountNumberLastFour?: string;
  accountNumber?: string;
  accountType?: AccountType;
  currency?: string;
  accountHolder?: string;
}

export interface AccountMatchResult {
  id: string;
  name: string;
  type: AccountType;
  institution: string;
  accountNumber?: string;
  balance: number;
  currency: string;
  isExisting: boolean;
  matchConfidence: number;
}

/**
 * Generate a standardized account name
 * Format: "BankName Type - LastFour"
 * Example: "HDFC Bank Savings - 5432"
 */
export function generateAccountName(
  bankName?: string,
  accountType?: AccountType,
  accountNumberLastFour?: string
): string {
  const parts: string[] = [];

  // Add bank name (capitalize properly)
  if (bankName) {
    const normalizedBank = bankName.trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    parts.push(normalizedBank);
  } else {
    parts.push('Personal');
  }

  // Add account type
  if (accountType) {
    const typeDisplay = accountType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    parts.push(typeDisplay);
  } else {
    parts.push('Account');
  }

  // Add last 4 digits if available
  if (accountNumberLastFour && accountNumberLastFour.length > 0) {
    return `${parts.join(' ')} - ${accountNumberLastFour}`;
  }

  return parts.join(' ');
}

/**
 * Extract last 4 digits from account number
 */
function getLastFourDigits(accountNumber?: string): string | undefined {
  if (!accountNumber) return undefined;
  const digits = accountNumber.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : undefined;
}

/**
 * Normalize bank name for comparison
 */
function normalizeBankName(bankName?: string): string {
  if (!bankName) return '';
  return bankName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Calculate match confidence between existing account and search criteria
 * Returns score 0-100
 */
function calculateMatchConfidence(
  existingAccount: any,
  searchCriteria: {
    bankName?: string;
    accountNumberLastFour?: string;
    accountType?: AccountType;
  }
): number {
  let score = 0;
  let factorCount = 0;

  // Check bank name match (40% weight)
  if (searchCriteria.bankName && existingAccount.institution) {
    factorCount++;
    const normExisting = normalizeBankName(existingAccount.institution);
    const normSearch = normalizeBankName(searchCriteria.bankName);
    
    if (normExisting === normSearch) {
      score += 40;
    } else if (normExisting.includes(normSearch) || normSearch.includes(normExisting)) {
      score += 30;
    } else {
      score += 10;
    }
  }

  // Check account number last 4 match (50% weight)
  if (searchCriteria.accountNumberLastFour && existingAccount.accountNumber) {
    factorCount++;
    const existingLastFour = getLastFourDigits(existingAccount.accountNumber);
    
    if (existingLastFour === searchCriteria.accountNumberLastFour) {
      score += 50;
    }
  }

  // Check account type match (10% weight)
  if (searchCriteria.accountType && existingAccount.type === searchCriteria.accountType) {
    factorCount++;
    score += 10;
  }

  return factorCount > 0 ? Math.round(score / factorCount) : 0;
}

/**
 * Find existing account or create new one
 * Uses unique constraint and smart matching to prevent race conditions
 * Unique constraint: [userId, institution, accountNumber]
 * 
 * Smart matching logic:
 * 1. Try to match by account number + bank name (highest priority)
 * 2. Try to match by bank name + account type
 * 3. Create new account if no match
 */
export async function findOrCreateAccount(
  input: FindOrCreateAccountInput
): Promise<AccountMatchResult> {
  const {
    userId,
    bankName,
    accountNumberLastFour,
    accountNumber,
    accountType = 'SAVINGS',
    currency = 'INR',
    accountHolder,
  } = input;

  // Normalize search criteria
  const lastFour = accountNumberLastFour || getLastFourDigits(accountNumber);
  const normalizedBankName = bankName ? bankName.trim() : 'Unknown Bank';
  const accountName = generateAccountName(normalizedBankName, accountType, lastFour);

  // If we have an account number, try to find exact match first (most reliable)
  if (accountNumber) {
    const existingByNumber = await prisma.account.findFirst({
      where: {
        userId,
        institution: normalizedBankName,
        accountNumber: accountNumber,
        isActive: true,
      },
    });

    if (existingByNumber) {
      return {
        id: existingByNumber.id,
        name: existingByNumber.name,
        type: existingByNumber.type,
        institution: existingByNumber.institution,
        accountNumber: existingByNumber.accountNumber || undefined,
        balance: existingByNumber.balance,
        currency: existingByNumber.currency,
        isExisting: true,
        matchConfidence: 100,
      };
    }
  }

  // Search for existing accounts for smart matching
  const existingAccounts = await prisma.account.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Try to find best match
  let bestMatch: any = null;
  let bestConfidence = 0;

  for (const account of existingAccounts) {
    const confidence = calculateMatchConfidence(account, {
      bankName: normalizedBankName,
      accountNumberLastFour: lastFour,
      accountType,
    });

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = account;
    }
  }

  // If we found a high-confidence match (>60), return it
  if (bestMatch && bestConfidence >= 60) {
    return {
      id: bestMatch.id,
      name: bestMatch.name,
      type: bestMatch.type,
      institution: bestMatch.institution,
      accountNumber: bestMatch.accountNumber,
      balance: bestMatch.balance,
      currency: bestMatch.currency,
      isExisting: true,
      matchConfidence: bestConfidence,
    };
  }

  // No good match found, create new account with race condition protection
  // The unique constraint [userId, institution, accountNumber] will prevent duplicates
  try {
    const newAccount = await prisma.account.create({
      data: {
        userId,
        name: accountName,
        type: accountType,
        institution: normalizedBankName,
        accountNumber: accountNumber || undefined,
        currency,
        balance: 0,
        isActive: true,
      },
    });

    return {
      id: newAccount.id,
      name: newAccount.name,
      type: newAccount.type,
      institution: newAccount.institution,
      accountNumber: newAccount.accountNumber || undefined,
      balance: newAccount.balance,
      currency: newAccount.currency,
      isExisting: false,
      matchConfidence: 0,
    };
  } catch (error: any) {
    // Handle unique constraint violation by finding the existing account
    if (error.code === 'P2002') {
      // Unique constraint violation - account was created concurrently
      // Find and return the account that was created
      const existingAccount = await prisma.account.findFirst({
        where: {
          userId,
          institution: normalizedBankName,
          accountNumber: accountNumber || undefined,
          isActive: true,
        },
      });

      if (existingAccount) {
        return {
          id: existingAccount.id,
          name: existingAccount.name,
          type: existingAccount.type,
          institution: existingAccount.institution,
          accountNumber: existingAccount.accountNumber || undefined,
          balance: existingAccount.balance,
          currency: existingAccount.currency,
          isExisting: true,
          matchConfidence: 100,
        };
      }
    }
    // Re-throw if it's a different error
    throw error;
  }
}

/**
 * Create account from parsed statement data
 * Extracts all relevant info and creates account
 */
export async function createAccountFromStatement(
  userId: string,
  accountInfo: ParsedAccountInfo,
  accountType?: AccountType
): Promise<AccountMatchResult> {
  // Determine account type from data or use provided
  let type = accountType;
  if (!type && accountInfo.accountType) {
    type = accountInfo.accountType as AccountType;
  }
  if (!type) {
    type = 'SAVINGS';
  }

  // Try to find or create account
  return findOrCreateAccount({
    userId,
    bankName: accountInfo.bankName,
    accountNumber: accountInfo.accountNumber,
    accountNumberLastFour: accountInfo.accountNumberLastFour,
    accountType: type,
    currency: accountInfo.currency,
    accountHolder: accountInfo.accountHolder,
  });
}

/**
 * Check for duplicate transactions within a time window
 * Uses improved duplicate detection:
 * - Matches first 3 words of description (not just 1)
 * - Amount tolerance check (±2%)
 * - Date proximity check
 */
export async function findDuplicateTransaction(
  userId: string,
  accountId: string,
  description: string,
  amount: number,
  date: Date,
  dateToleranceDays: number = 3,
  amountTolerance: number = 0.02 // ±2% by default
): Promise<any | null> {
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - dateToleranceDays);

  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + dateToleranceDays);

  // Calculate amount tolerance bounds
  const minAmount = amount * (1 - amountTolerance);
  const maxAmount = amount * (1 + amountTolerance);

  // Extract first 3 words from description for matching (more robust than 1 word)
  const descriptionWords = description.trim().split(/\s+/);
  const firstThreeWords = descriptionWords.slice(0, 3).join(' ');

  // Find transactions with similar amount and description
  const similar = await prisma.transaction.findFirst({
    where: {
      userId,
      accountId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      amount: {
        gte: minAmount,
        lte: maxAmount,
      },
      description: {
        contains: firstThreeWords, // Match first 3 words
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  return similar;
}

/**
 * Update account balance from statement
 */
export async function updateAccountBalance(
  accountId: string,
  balance: number,
  lastSynced: Date = new Date()
): Promise<void> {
  await prisma.account.update({
    where: { id: accountId },
    data: {
      balance,
      lastSynced,
    },
  });
}

/**
 * Get account with recent transactions
 */
export async function getAccountWithTransactions(
  accountId: string,
  limit: number = 10
): Promise<any> {
  return prisma.account.findUnique({
    where: { id: accountId },
    include: {
      transactions: {
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          category: {
            select: { id: true, name: true, icon: true },
          },
        },
      },
    },
  });
}

/**
 * Deactivate an account (soft delete)
 */
export async function deactivateAccount(accountId: string): Promise<void> {
  await prisma.account.update({
    where: { id: accountId },
    data: { isActive: false },
  });
}

/**
 * Get all active accounts for a user
 */
export async function getUserAccounts(userId: string): Promise<any[]> {
  return prisma.account.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: {
      balance: 'desc',
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });
}

export default {
  generateAccountName,
  findOrCreateAccount,
  createAccountFromStatement,
  findDuplicateTransaction,
  updateAccountBalance,
  getAccountWithTransactions,
  deactivateAccount,
  getUserAccounts,
};
