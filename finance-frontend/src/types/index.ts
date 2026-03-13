export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: string;
  emailVerified?: string;
  createdAt: string;
  updatedAt: string;
  isEmailVerified?: boolean;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark';
  notifications: {
    email: boolean;
    push: boolean;
  };
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'cash';

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  attachments?: string[];
  account?: {
    id: string;
    name: string;
    type: string;
  };
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  isDefault: boolean;
}

export interface Document {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  tags?: string[];
  uploadedAt: string;
  category: DocumentCategory;
}

export type DocumentCategory = 'receipt' | 'invoice' | 'statement' | 'tax' | 'contract' | 'other';

export interface Budget {
  id: string;
  userId: string;
  name: string;
  amount: number;
  spent: number;
  period: BudgetPeriod;
  categories: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: GoalCategory;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  milestones: GoalMilestone[];
  createdAt: string;
  updatedAt: string;
}

export type GoalCategory = 'emergency_fund' | 'vacation' | 'home' | 'retirement' | 'education' | 'debt_payoff' | 'investment' | 'other';

export interface GoalMilestone {
  id: string;
  goalId: string;
  name: string;
  targetAmount: number;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  lastFourDigits: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  apr: number;
  minimumPayment: number;
  paymentDueDate: string;
  issuer: string;
  cardType: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  rewardType?: 'cashback' | 'points' | 'miles' | 'none';
  rewardBalance?: number;
  annualFee: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardPayment {
  id: string;
  creditCardId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  confirmationNumber?: string;
  createdAt: string;
}

export interface GoalFormData {
  name: string;
  description?: string;
  category: GoalCategory;
  targetAmount: number;
  targetDate: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CreditCardFormData {
  name: string;
  lastFourDigits: string;
  creditLimit: number;
  currentBalance: number;
  apr: number;
  minimumPayment: number;
  paymentDueDate: string;
  issuer: string;
  cardType: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  rewardType?: 'cashback' | 'points' | 'miles' | 'none';
  annualFee: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Form Types
export interface TransactionFormData {
  accountId: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string;
  tags?: string[];
}

export interface AccountFormData {
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
}

// Filter Types
export interface DocumentFilters {
  category?: DocumentCategory;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TransactionFilters {
  accountId?: string;
  type?: TransactionType;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  amountFrom?: number;
  amountTo?: number;
  search?: string;
}

// Chart Data Types
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

// App State Types
export interface AppState {
  isLoading: boolean;
  error: string | null;
  accounts: Account[];
  categories: Category[];
  selectedAccount: Account | null;
}

// Error Types
export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

// Document Upload Type
export interface DocumentUpload {
  file: File;
  category: DocumentCategory;
  tags?: string[];
}