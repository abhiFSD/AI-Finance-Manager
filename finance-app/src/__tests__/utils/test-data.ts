import { faker } from '@faker-js/faker'

// Transaction data factory
export interface MockTransaction {
  id: string
  amount: number
  description: string
  category: string
  date: string
  merchant: string
  account: string
  type: 'income' | 'expense'
  status: 'pending' | 'completed' | 'failed'
  currency: string
}

export const createMockTransaction = (overrides?: Partial<MockTransaction>): MockTransaction => ({
  id: faker.string.uuid(),
  amount: faker.number.float({ min: -5000, max: 5000, fractionDigits: 2 }),
  description: faker.commerce.productDescription(),
  category: faker.helpers.arrayElement([
    'Food & Dining',
    'Transportation', 
    'Entertainment',
    'Shopping',
    'Bills & Utilities',
    'Healthcare',
    'Income',
    'Transfer'
  ]),
  date: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
  merchant: faker.company.name(),
  account: faker.helpers.arrayElement(['Checking', 'Savings', 'Credit Card']),
  type: faker.helpers.arrayElement(['income', 'expense']),
  status: faker.helpers.arrayElement(['pending', 'completed', 'failed']),
  currency: 'USD',
  ...overrides,
})

export const createMockTransactions = (count: number, overrides?: Partial<MockTransaction>): MockTransaction[] => {
  return Array.from({ length: count }, () => createMockTransaction(overrides))
}

// Account data factory
export interface MockAccount {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'investment'
  balance: number
  currency: string
  bank: string
  accountNumber: string
  isActive: boolean
}

export const createMockAccount = (overrides?: Partial<MockAccount>): MockAccount => ({
  id: faker.string.uuid(),
  name: faker.finance.accountName(),
  type: faker.helpers.arrayElement(['checking', 'savings', 'credit', 'investment']),
  balance: faker.number.float({ min: -10000, max: 50000, fractionDigits: 2 }),
  currency: 'USD',
  bank: faker.company.name(),
  accountNumber: faker.finance.accountNumber(),
  isActive: faker.datatype.boolean(),
  ...overrides,
})

export const createMockAccounts = (count: number): MockAccount[] => {
  return Array.from({ length: count }, () => createMockAccount())
}

// Document data factory
export interface MockDocument {
  id: string
  name: string
  type: 'pdf' | 'image' | 'csv'
  size: number
  uploadDate: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  extractedTransactions?: number
  downloadUrl?: string
}

export const createMockDocument = (overrides?: Partial<MockDocument>): MockDocument => ({
  id: faker.string.uuid(),
  name: faker.system.fileName(),
  type: faker.helpers.arrayElement(['pdf', 'image', 'csv']),
  size: faker.number.int({ min: 1024, max: 10 * 1024 * 1024 }),
  uploadDate: faker.date.recent({ days: 7 }).toISOString(),
  status: faker.helpers.arrayElement(['uploading', 'processing', 'completed', 'error']),
  extractedTransactions: faker.number.int({ min: 1, max: 100 }),
  downloadUrl: faker.internet.url(),
  ...overrides,
})

// User data factory
export interface MockUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  createdAt: string
  isVerified: boolean
  preferences: {
    currency: string
    dateFormat: string
    theme: 'light' | 'dark' | 'system'
    notifications: boolean
  }
}

export const createMockUser = (overrides?: Partial<MockUser>): MockUser => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  avatar: faker.image.avatar(),
  createdAt: faker.date.past().toISOString(),
  isVerified: faker.datatype.boolean(),
  preferences: {
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    theme: faker.helpers.arrayElement(['light', 'dark', 'system']),
    notifications: faker.datatype.boolean(),
  },
  ...overrides,
})

// Chart data factory
export interface MockChartData {
  name: string
  value: number
  color?: string
}

export const createMockChartData = (count: number): MockChartData[] => {
  const categories = [
    'Food & Dining',
    'Transportation', 
    'Entertainment',
    'Shopping',
    'Bills & Utilities',
    'Healthcare',
    'Income',
    'Transfer'
  ]
  
  return Array.from({ length: Math.min(count, categories.length) }, (_, index) => ({
    name: categories[index],
    value: faker.number.float({ min: 100, max: 5000, fractionDigits: 2 }),
    color: `hsl(${(index * 45) % 360}, 70%, 50%)`,
  }))
}

export const createMockMonthlyData = (months: number = 12) => {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  return Array.from({ length: months }, (_, index) => ({
    name: monthNames[index % 12],
    income: faker.number.float({ min: 3000, max: 6000, fractionDigits: 2 }),
    expenses: faker.number.float({ min: 2000, max: 4500, fractionDigits: 2 }),
    savings: faker.number.float({ min: 500, max: 2000, fractionDigits: 2 }),
  }))
}

// Budget data factory
export interface MockBudget {
  id: string
  category: string
  allocated: number
  spent: number
  period: 'monthly' | 'yearly'
  startDate: string
  endDate: string
  isActive: boolean
}

export const createMockBudget = (overrides?: Partial<MockBudget>): MockBudget => {
  const allocated = faker.number.float({ min: 100, max: 2000, fractionDigits: 2 })
  const spent = faker.number.float({ min: 0, max: allocated * 1.2, fractionDigits: 2 })
  
  return {
    id: faker.string.uuid(),
    category: faker.helpers.arrayElement([
      'Food & Dining',
      'Transportation', 
      'Entertainment',
      'Shopping',
      'Bills & Utilities',
    ]),
    allocated,
    spent,
    period: faker.helpers.arrayElement(['monthly', 'yearly']),
    startDate: faker.date.past().toISOString().split('T')[0],
    endDate: faker.date.future().toISOString().split('T')[0],
    isActive: faker.datatype.boolean(),
    ...overrides,
  }
}

// API Response factories
export const createMockApiResponse = <T>(data: T, success = true) => ({
  data,
  success,
  message: success ? 'Operation successful' : 'Operation failed',
  timestamp: new Date().toISOString(),
})

export const createMockApiError = (message: string, code = 400) => ({
  error: {
    message,
    code,
    timestamp: new Date().toISOString(),
  },
})

// Large dataset generators for performance testing
export const createLargeTransactionDataset = (size: number) => {
  console.time(`Creating ${size} transactions`)
  const transactions = createMockTransactions(size)
  console.timeEnd(`Creating ${size} transactions`)
  return transactions
}

// Realistic financial scenarios
export const financialScenarios = {
  newUser: {
    user: createMockUser({ isVerified: false }),
    accounts: [],
    transactions: [],
    documents: [],
  },
  
  activeUser: {
    user: createMockUser({ isVerified: true }),
    accounts: createMockAccounts(3),
    transactions: createMockTransactions(50),
    documents: Array.from({ length: 5 }, () => createMockDocument({ status: 'completed' })),
  },
  
  heavyUser: {
    user: createMockUser({ isVerified: true }),
    accounts: createMockAccounts(8),
    transactions: createMockTransactions(500),
    documents: Array.from({ length: 20 }, () => createMockDocument()),
  },
  
  debtUser: {
    user: createMockUser({ isVerified: true }),
    accounts: [
      createMockAccount({ type: 'checking', balance: 250.50 }),
      createMockAccount({ type: 'credit', balance: -2500.75 }),
      createMockAccount({ type: 'savings', balance: 1000.00 }),
    ],
    transactions: createMockTransactions(30, { type: 'expense' }),
    documents: [],
  },
}