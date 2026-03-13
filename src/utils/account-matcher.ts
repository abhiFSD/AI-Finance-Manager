/**
 * Account Matcher Utility
 * Matches documents to accounts by institution name
 */

interface Account {
  id: string;
  name: string;
  institution?: string;
  type: string;
}

const BANK_NAME_MAPPINGS: { [key: string]: string[] } = {
  'HDFC Bank': ['hdfc', 'hdfc bank', 'housing development finance'],
  'State Bank of India': ['sbi', 'state bank', 'state bank of india'],
  'ICICI Bank': ['icici', 'icici bank'],
  'Axis Bank': ['axis', 'axis bank'],
  'Kotak Mahindra Bank': ['kotak', 'kotak mahindra', 'kotak bank'],
  'IndusInd Bank': ['indusind', 'indusind bank'],
  'Yes Bank': ['yes', 'yes bank'],
  'Bank of Baroda': ['bob', 'baroda', 'bank of baroda'],
  'Canara Bank': ['canara', 'canara bank'],
  'Punjab National Bank': ['pnb', 'punjab national', 'punjab national bank'],
};

/**
 * Normalize bank name for matching
 */
function normalizeBankName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

/**
 * Find matching account by institution name
 */
export function findMatchingAccount(
  accounts: Account[],
  bankName: string | undefined
): Account | null {
  if (!bankName || accounts.length === 0) {
    return null;
  }

  const normalizedBank = normalizeBankName(bankName);

  // First, try exact match on institution field
  for (const account of accounts) {
    if (account.institution) {
      const normalizedInstitution = normalizeBankName(account.institution);
      if (normalizedInstitution === normalizedBank) {
        return account;
      }
    }
  }

  // Try fuzzy matching using mappings
  for (const [fullName, aliases] of Object.entries(BANK_NAME_MAPPINGS)) {
    if (aliases.some(alias => normalizedBank.includes(alias))) {
      // Bank detected, find account with this bank
      for (const account of accounts) {
        if (account.institution) {
          const normalizedInstitution = normalizeBankName(account.institution);
          if (aliases.some(alias => normalizedInstitution.includes(alias))) {
            return account;
          }
        }
        // Also check account name
        const normalizedName = normalizeBankName(account.name);
        if (aliases.some(alias => normalizedName.includes(alias))) {
          return account;
        }
      }
    }
  }

  return null;
}

/**
 * Get full bank name from code
 */
export function getBankFullName(bankCode: string | undefined): string {
  if (!bankCode) return '';

  const normalized = normalizeBankName(bankCode);

  for (const [fullName, aliases] of Object.entries(BANK_NAME_MAPPINGS)) {
    if (aliases.some(alias => normalized.includes(alias))) {
      return fullName;
    }
  }

  // Return formatted version of input
  return bankCode.split(/[-_\s]/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Suggest account creation data based on document metadata
 */
export function suggestAccountCreationData(metadata: any): {
  name: string;
  institution: string;
  type: string;
  accountNumber?: string;
} {
  const bankDetected = metadata?.bankDetected || 'Unknown';
  const fullBankName = getBankFullName(bankDetected);

  return {
    name: `${fullBankName} Savings Account`,
    institution: fullBankName,
    type: 'SAVINGS',
    accountNumber: metadata?.accountNumber || undefined,
  };
}
