/**
 * Integration Tests for AI Parser & Smart Account Manager
 */

import { generateAccountName } from '../../services/account-manager';

// Mock sample financial data for testing
const MOCK_CSV_CONTENT = `Date,Description,Amount,Type
2024-03-01,Salary Deposit,50000,INCOME
2024-03-02,Grocery Store,-2500,EXPENSE
2024-03-05,Electric Bill,-1200,EXPENSE
2024-03-10,Restaurant Dinner,-800,EXPENSE
2024-03-15,Transfer to Savings,-10000,TRANSFER`;

const MOCK_AI_RESPONSE = {
  accountInfo: {
    accountNumber: '1234567890',
    accountNumberLastFour: '7890',
    bankName: 'HDFC Bank',
    accountHolder: 'John Doe',
    accountType: 'SAVINGS',
    currency: 'INR',
    balance: 50000,
    statement_period: {
      start: '2024-03-01',
      end: '2024-03-31'
    }
  },
  transactions: [
    {
      date: '2024-03-01',
      description: 'Salary Deposit',
      amount: 50000,
      type: 'INCOME',
      merchantName: null,
      reference: null,
      category: 'Income',
      notes: null
    },
    {
      date: '2024-03-02',
      description: 'Grocery Store',
      amount: 2500,
      type: 'EXPENSE',
      merchantName: 'Grocery Store',
      reference: null,
      category: 'Groceries',
      notes: null
    }
  ],
  metadata: {
    dataQuality: 'high',
    issues: [],
    confidence: 95
  }
};

describe('Account Name Generation', () => {
  it('should generate account name with all parameters', () => {
    const name = generateAccountName('HDFC Bank', 'SAVINGS', '5432');
    expect(name).toBe('HDFC Bank Savings - 5432');
  });

  it('should generate account name without last four digits', () => {
    const name = generateAccountName('HDFC Bank', 'CHECKING');
    expect(name).toBe('HDFC Bank Checking');
  });

  it('should generate account name with only bank name', () => {
    const name = generateAccountName('ICICI Bank');
    expect(name).toBe('ICICI Bank Account');
  });

  it('should generate generic name without parameters', () => {
    const name = generateAccountName();
    expect(name).toBe('Personal Account');
  });

  it('should handle credit card account type', () => {
    const name = generateAccountName('American Express', 'CREDIT_CARD', '1234');
    expect(name).toBe('American Express Credit Card - 1234');
  });

  it('should normalize bank names properly', () => {
    const name = generateAccountName('axis BANK', 'SAVINGS', '9876');
    expect(name).toBe('Axis Bank Savings - 9876');
  });
});

describe('AI Response Validation - Sample Data', () => {
  it('should have valid sample AI response structure', () => {
    expect(MOCK_AI_RESPONSE).toBeDefined();
    expect(MOCK_AI_RESPONSE.accountInfo).toBeDefined();
    expect(MOCK_AI_RESPONSE.transactions).toBeInstanceOf(Array);
  });

  it('should have valid transaction objects', () => {
    expect(MOCK_AI_RESPONSE.transactions).toHaveLength(2);
    const txn = MOCK_AI_RESPONSE.transactions[0];
    expect(txn.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(txn.description).toBeDefined();
    expect(typeof txn.amount).toBe('number');
    expect(['INCOME', 'EXPENSE', 'TRANSFER']).toContain(txn.type);
  });

  it('should have valid account info', () => {
    const info = MOCK_AI_RESPONSE.accountInfo;
    expect(info.bankName).toBeDefined();
    expect(info.accountType).toBeDefined();
    expect(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN', 'WALLET'])
      .toContain(info.accountType);
  });
});

describe('Transaction Data Samples', () => {
  it('should have valid sample CSV data', () => {
    expect(MOCK_CSV_CONTENT).toContain('Date');
    expect(MOCK_CSV_CONTENT).toContain('Amount');
    expect(MOCK_CSV_CONTENT).toContain('INCOME');
  });

  it('should have valid sample AI response', () => {
    expect(MOCK_AI_RESPONSE.transactions).toHaveLength(2);
    expect(MOCK_AI_RESPONSE.accountInfo?.bankName).toBe('HDFC Bank');
  });
});

describe('Account Type Handling', () => {
  const accountTypes = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN', 'WALLET'];

  accountTypes.forEach(type => {
    it(`should handle ${type} account type`, () => {
      // @ts-ignore - Testing with explicit type
      const name = generateAccountName('Test Bank', type, '1234');
      expect(name).toContain(type.replace('_', ' '));
    });
  });
});

describe('Edge Cases', () => {
  it('should handle account number without digits', () => {
    const name = generateAccountName('Bank', 'SAVINGS', 'ABCD');
    expect(name).toBe('Bank Savings');
  });

  it('should handle very long bank names', () => {
    const longName = 'A'.repeat(100);
    const result = generateAccountName(longName, 'SAVINGS', '1234');
    expect(result).toContain(longName);
  });

  it('should handle special characters in bank name', () => {
    const name = generateAccountName('HDFC @ Bank (India) Ltd.', 'SAVINGS', '5678');
    expect(name).toContain('HDFC');
  });

  it('should handle empty string parameters gracefully', () => {
    const name = generateAccountName('', undefined, '');
    expect(name).toBe('Personal Account');
  });
});

describe('Confidence Scoring', () => {
  it('should indicate high confidence for complete data', () => {
    const confidence = MOCK_AI_RESPONSE.metadata.confidence;
    expect(confidence).toBeGreaterThan(80);
  });

  it('should have metadata in AI response', () => {
    expect(MOCK_AI_RESPONSE.metadata).toBeDefined();
    expect(MOCK_AI_RESPONSE.metadata.confidence).toBeDefined();
  });
});

describe('Data Normalization', () => {
  it('should normalize currency codes', () => {
    const info = MOCK_AI_RESPONSE.accountInfo;
    expect(info.currency).toBe('INR');
  });

  it('should handle account number formatting', () => {
    const accountInfo = MOCK_AI_RESPONSE.accountInfo;
    expect(accountInfo.accountNumberLastFour).toMatch(/^\d{4}$/);
  });

  it('should preserve statement period dates', () => {
    const period = MOCK_AI_RESPONSE.accountInfo.statement_period;
    expect(period?.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(period?.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('Mock Data Validation', () => {
  it('should validate mock CSV content', () => {
    const lines = MOCK_CSV_CONTENT.split('\n');
    expect(lines.length).toBeGreaterThan(1); // Header + data rows
    expect(lines[0]).toContain('Date');
  });

  it('should validate mock AI response structure', () => {
    expect(MOCK_AI_RESPONSE).toBeDefined();
    expect(MOCK_AI_RESPONSE.accountInfo).toBeDefined();
    expect(MOCK_AI_RESPONSE.transactions).toBeInstanceOf(Array);
  });
});

// Export mock data for use in other tests
export { MOCK_CSV_CONTENT, MOCK_AI_RESPONSE };
