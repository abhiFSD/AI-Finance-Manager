export const APP_CONSTANTS = {
  APP_NAME: 'Finance App',
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  TOKEN_STORAGE_KEY: 'finance_app_tokens',
  USER_STORAGE_KEY: 'finance_app_user',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg', 
    'image/png', 
    'application/pdf', 
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  
  // Validation
  PASSWORD_MIN_LENGTH: 8,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Currencies
  SUPPORTED_CURRENCIES: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
  DEFAULT_CURRENCY: 'INR',
  
  // Date Formats
  DATE_FORMATS: {
    SHORT: 'DD/MM/YYYY',
    LONG: 'DD MMMM, YYYY',
    ISO: 'YYYY-MM-DD',
  },
  
  // Theme Colors
  COLORS: {
    PRIMARY: '#1976d2',
    SECONDARY: '#dc004e',
    SUCCESS: '#2e7d32',
    ERROR: '#d32f2f',
    WARNING: '#ed6c02',
    INFO: '#0288d1',
    
    // Transaction Types
    INCOME: '#2e7d32',
    EXPENSE: '#d32f2f',
    TRANSFER: '#ed6c02',
    
    // Account Types
    CHECKING: '#1976d2',
    SAVINGS: '#388e3c',
    CREDIT: '#f57c00',
    INVESTMENT: '#7b1fa2',
    CASH: '#5d4037',
  },
  
  // Chart Colors
  CHART_COLORS: [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1',
    '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
  ],
} as const;

export const TRANSACTION_CATEGORIES = {
  INCOME: [
    'Salary',
    'Freelance',
    'Investment',
    'Gift',
    'Refund',
    'Other Income'
  ],
  EXPENSE: [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Education',
    'Travel',
    'Insurance',
    'Other Expenses'
  ],
  TRANSFER: [
    'Account Transfer',
    'Investment Transfer',
    'Savings Transfer'
  ]
} as const;

export const ROUTE_PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  TRANSACTIONS: '/transactions',
  DOCUMENTS: '/documents',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  CHAT: '/chat',
} as const;

export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
  INVALID_FILE_TYPE: 'File type is not supported.',
} as const;

export const SUCCESS_MESSAGES = {
  LOGIN: 'Login successful!',
  REGISTER: 'Registration successful!',
  LOGOUT: 'Logged out successfully!',
  TRANSACTION_CREATED: 'Transaction created successfully!',
  TRANSACTION_UPDATED: 'Transaction updated successfully!',
  TRANSACTION_DELETED: 'Transaction deleted successfully!',
  DOCUMENT_UPLOADED: 'Document uploaded successfully!',
  SETTINGS_UPDATED: 'Settings updated successfully!',
} as const;