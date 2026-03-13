import Joi from 'joi';
import { FileValidationResult } from '@/types';
import { config } from './config';

// File validation schemas
export const fileUploadSchema = Joi.object({
  fieldname: Joi.string().required(),
  originalname: Joi.string().required(),
  encoding: Joi.string(),
  mimetype: Joi.string().valid(
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png'
  ).required(),
  size: Joi.number().max(config.upload.maxFileSize).required(),
  destination: Joi.string(),
  filename: Joi.string(),
  path: Joi.string()
});

// Document validation functions
export const validateFile = (file: Express.Multer.File): FileValidationResult => {
  const errors: string[] = [];
  
  // Validate file existence
  if (!file) {
    return {
      isValid: false,
      errors: ['No file provided']
    };
  }

  // Extract file extension
  const extension = file.originalname.split('.').pop()?.toLowerCase();
  if (!extension) {
    errors.push('File must have a valid extension');
  }

  // Validate file size
  if (file.size > config.upload.maxFileSize) {
    errors.push(`File size exceeds maximum allowed size of ${formatFileSize(config.upload.maxFileSize)}`);
  }

  // Validate file type
  const allowedTypes = config.upload.allowedTypes;
  if (extension && !allowedTypes.includes(extension)) {
    errors.push(`File type '.${extension}' not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Validate MIME type
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`MIME type '${file.mimetype}' not allowed`);
  }

  // Check for suspicious file characteristics
  if (file.originalname.includes('../') || file.originalname.includes('..\\')) {
    errors.push('File path contains suspicious characters');
  }

  if (file.originalname.length > 255) {
    errors.push('Filename too long (max 255 characters)');
  }

  // Basic filename sanitization check
  const suspiciousPatterns = [
    /[<>:"|?*\x00-\x1f]/,  // Windows reserved characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i  // Windows reserved names
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.originalname)) {
      errors.push('Filename contains invalid characters');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fileInfo: {
      size: file.size,
      mimeType: file.mimetype,
      extension: extension || ''
    }
  };
};

export const validateBatchUpload = (files: Express.Multer.File[]): FileValidationResult => {
  const errors: string[] = [];
  
  if (!files || files.length === 0) {
    return {
      isValid: false,
      errors: ['No files provided']
    };
  }

  // Check batch size limits
  const maxBatchSize = 10; // Allow max 10 files per batch
  if (files.length > maxBatchSize) {
    errors.push(`Too many files in batch. Maximum allowed: ${maxBatchSize}`);
  }

  // Calculate total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxBatchSizeBytes = config.upload.maxFileSize * 5; // Allow 5x single file limit for batch
  
  if (totalSize > maxBatchSizeBytes) {
    errors.push(`Total batch size exceeds limit of ${formatFileSize(maxBatchSizeBytes)}`);
  }

  // Validate each file individually
  for (let i = 0; i < files.length; i++) {
    const fileValidation = validateFile(files[i]);
    if (!fileValidation.isValid) {
      errors.push(`File ${i + 1} (${files[i].originalname}): ${fileValidation.errors.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fileInfo: {
      size: totalSize,
      mimeType: 'batch',
      extension: 'batch'
    }
  };
};

// Document type validation
export const documentTypeSchema = Joi.object({
  type: Joi.string().valid(
    'bank_statement',
    'credit_card_statement', 
    'investment_statement',
    'loan_statement',
    'receipt',
    'invoice',
    'other'
  ).required()
});

// Transaction validation
export const transactionSchema = Joi.object({
  date: Joi.date().required(),
  description: Joi.string().min(1).max(500).required(),
  amount: Joi.number().precision(2).required(),
  type: Joi.string().valid('debit', 'credit').required(),
  balance: Joi.number().precision(2).optional(),
  category: Joi.string().max(100).optional(),
  merchant: Joi.string().max(200).optional(),
  reference: Joi.string().max(100).optional(),
  accountNumber: Joi.string().max(50).optional(),
  confidence: Joi.number().min(0).max(100).required()
});

// API Transaction validation schemas
export const createTransactionSchema = Joi.object({
  accountId: Joi.string().min(1).optional(),
  documentId: Joi.string().min(1).optional(),
  date: Joi.date().required(),
  description: Joi.string().min(1).max(500).required(),
  merchantName: Joi.string().max(200).optional(),
  amount: Joi.number().precision(2).required(),
  type: Joi.string().valid('INCOME', 'EXPENSE', 'TRANSFER').required(),
  categoryId: Joi.string().min(1).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  isRecurring: Joi.boolean().optional().default(false),
  notes: Joi.string().max(1000).optional()
});

export const updateTransactionSchema = Joi.object({
  accountId: Joi.string().min(1).optional(),
  date: Joi.date().optional(),
  description: Joi.string().min(1).max(500).optional(),
  merchantName: Joi.string().max(200).optional(),
  amount: Joi.number().precision(2).optional(),
  type: Joi.string().valid('INCOME', 'EXPENSE', 'TRANSFER').optional(),
  categoryId: Joi.string().min(1).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  isRecurring: Joi.boolean().optional(),
  notes: Joi.string().max(1000).optional()
});

export const transactionFiltersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  accountId: Joi.string().min(1).optional(),
  type: Joi.string().valid('INCOME', 'EXPENSE', 'TRANSFER').optional(),
  categoryId: Joi.string().min(1).optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  amountFrom: Joi.number().precision(2).optional(),
  amountTo: Joi.number().precision(2).optional(),
  search: Joi.string().max(100).optional(),
  isRecurring: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional()
});

export const transactionStatsSchema = Joi.object({
  accountId: Joi.string().min(1).optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').default('monthly')
});

// Goals validation schemas
export const createGoalSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  targetAmount: Joi.number().min(0).precision(2).required(),
  currentAmount: Joi.number().min(0).precision(2).default(0),
  deadline: Joi.date().optional(),
  category: Joi.string().valid(
    'EMERGENCY_FUND', 
    'VACATION', 
    'HOME_PURCHASE', 
    'CAR_PURCHASE', 
    'RETIREMENT', 
    'EDUCATION', 
    'DEBT_PAYOFF', 
    'INVESTMENT', 
    'OTHER'
  ).default('OTHER'),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM'),
  description: Joi.string().max(500).optional()
});

export const updateGoalSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  targetAmount: Joi.number().min(0).precision(2).optional(),
  currentAmount: Joi.number().min(0).precision(2).optional(),
  deadline: Joi.date().optional(),
  category: Joi.string().valid(
    'EMERGENCY_FUND', 
    'VACATION', 
    'HOME_PURCHASE', 
    'CAR_PURCHASE', 
    'RETIREMENT', 
    'EDUCATION', 
    'DEBT_PAYOFF', 
    'INVESTMENT', 
    'OTHER'
  ).optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  description: Joi.string().max(500).optional(),
  isCompleted: Joi.boolean().optional()
});

export const goalContributeSchema = Joi.object({
  amount: Joi.number().min(0.01).precision(2).required(),
  notes: Joi.string().max(500).optional()
});

export const goalFiltersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  category: Joi.string().valid(
    'EMERGENCY_FUND', 
    'VACATION', 
    'HOME_PURCHASE', 
    'CAR_PURCHASE', 
    'RETIREMENT', 
    'EDUCATION', 
    'DEBT_PAYOFF', 
    'INVESTMENT', 
    'OTHER'
  ).optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  isCompleted: Joi.boolean().optional(),
  deadlineFrom: Joi.date().optional(),
  deadlineTo: Joi.date().optional(),
  search: Joi.string().max(100).optional()
});

// Credit Cards validation schemas
export const createCreditCardSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  lastFourDigits: Joi.string().regex(/^\d{4}$/).required(),
  cardType: Joi.string().valid(
    'VISA', 
    'MASTERCARD', 
    'AMERICAN_EXPRESS', 
    'DISCOVER', 
    'RUPAY', 
    'DINERS_CLUB', 
    'OTHER'
  ).required(),
  issuer: Joi.string().min(1).max(100).required(),
  creditLimit: Joi.number().min(0).precision(2).required(),
  currentBalance: Joi.number().min(0).precision(2).default(0),
  apr: Joi.number().min(0).max(100).precision(2).default(0),
  annualFee: Joi.number().min(0).precision(2).default(0),
  dueDate: Joi.date().optional(),
  minimumPayment: Joi.number().min(0).precision(2).default(0)
});

export const updateCreditCardSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  lastFourDigits: Joi.string().regex(/^\d{4}$/).optional(),
  cardType: Joi.string().valid(
    'VISA', 
    'MASTERCARD', 
    'AMERICAN_EXPRESS', 
    'DISCOVER', 
    'RUPAY', 
    'DINERS_CLUB', 
    'OTHER'
  ).optional(),
  issuer: Joi.string().min(1).max(100).optional(),
  creditLimit: Joi.number().min(0).precision(2).optional(),
  currentBalance: Joi.number().min(0).precision(2).optional(),
  apr: Joi.number().min(0).max(100).precision(2).optional(),
  annualFee: Joi.number().min(0).precision(2).optional(),
  dueDate: Joi.date().optional(),
  minimumPayment: Joi.number().min(0).precision(2).optional(),
  isActive: Joi.boolean().optional()
});

export const creditCardPaymentSchema = Joi.object({
  amount: Joi.number().min(0.01).precision(2).required(),
  paymentType: Joi.string().valid('MANUAL', 'AUTOMATIC', 'MINIMUM_PAYMENT', 'FULL_PAYMENT').default('MANUAL'),
  notes: Joi.string().max(500).optional()
});

export const creditCardFiltersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  cardType: Joi.string().valid(
    'VISA', 
    'MASTERCARD', 
    'AMERICAN_EXPRESS', 
    'DISCOVER', 
    'RUPAY', 
    'DINERS_CLUB', 
    'OTHER'
  ).optional(),
  issuer: Joi.string().max(100).optional(),
  isActive: Joi.boolean().optional(),
  dueDateFrom: Joi.date().optional(),
  dueDateTo: Joi.date().optional(),
  search: Joi.string().max(100).optional()
});

// OCR result validation
export const ocrResultSchema = Joi.object({
  text: Joi.string().required(),
  confidence: Joi.number().min(0).max(100).required(),
  words: Joi.array().items(Joi.object({
    text: Joi.string().required(),
    confidence: Joi.number().min(0).max(100).required(),
    bbox: Joi.object({
      x: Joi.number().required(),
      y: Joi.number().required(),
      width: Joi.number().required(),
      height: Joi.number().required()
    }).required()
  })).required(),
  processingTime: Joi.number().min(0).required(),
  engine: Joi.string().valid('tesseract', 'aws_textract', 'google_vision').required()
});

// Queue job validation
export const queueJobSchema = Joi.object({
  documentId: Joi.string().min(1).required(),
  type: Joi.string().valid(
    'document_process',
    'ocr_extract', 
    'parse_document',
    'extract_transactions',
    'virus_scan'
  ).required(),
  data: Joi.object().required(),
  priority: Joi.number().min(0).max(10).default(5),
  delay: Joi.number().min(0).optional(),
  maxAttempts: Joi.number().min(1).max(10).default(3)
});

// Helper functions
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
};

export const sanitizeFilename = (filename: string): string => {
  // Remove or replace unsafe characters
  let sanitized = filename
    .replace(/[<>:"|?*\x00-\x1f]/g, '')  // Remove unsafe characters
    .replace(/\s+/g, '_')  // Replace spaces with underscores
    .replace(/\.+/g, '.')  // Replace multiple dots with single dot
    .trim();

  // Ensure filename isn't empty
  if (!sanitized || sanitized === '.') {
    sanitized = 'document.pdf';
  }

  // Limit filename length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const extension = sanitized.split('.').pop() || '';
    const nameWithoutExt = sanitized.substring(0, sanitized.length - extension.length - 1);
    sanitized = nameWithoutExt.substring(0, maxLength - extension.length - 1) + '.' + extension;
  }

  return sanitized;
};

export const validateAmount = (amountStr: string): { isValid: boolean; amount?: number; error?: string } => {
  // Handle Indian number formatting (commas, etc.)
  const cleanAmount = amountStr
    .replace(/[^\d.-]/g, '')  // Remove everything except digits, dots, and minus
    .replace(/,/g, '');  // Remove commas

  const amount = parseFloat(cleanAmount);
  
  if (isNaN(amount)) {
    return {
      isValid: false,
      error: 'Invalid amount format'
    };
  }

  if (amount < 0) {
    return {
      isValid: true,
      amount: Math.abs(amount)  // Convert to positive for processing
    };
  }

  return {
    isValid: true,
    amount
  };
};

export const validateDate = (dateStr: string): { isValid: boolean; date?: Date; error?: string } => {
  // Common Indian date formats
  const formats = [
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,  // DD/MM/YYYY or DD-MM-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,  // DD/MM/YY or DD-MM-YY
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,  // YYYY/MM/DD or YYYY-MM-DD
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let day: number, month: number, year: number;
      
      if (format === formats[2]) {  // YYYY/MM/DD format
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
      } else {  // DD/MM/YYYY formats
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
        
        // Handle 2-digit year
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
      }

      // Validate date components
      if (month < 1 || month > 12) {
        return {
          isValid: false,
          error: 'Invalid month'
        };
      }

      if (day < 1 || day > 31) {
        return {
          isValid: false,
          error: 'Invalid day'
        };
      }

      const date = new Date(year, month - 1, day);
      
      // Check if date is valid
      if (date.getFullYear() !== year || 
          date.getMonth() !== month - 1 || 
          date.getDate() !== day) {
        return {
          isValid: false,
          error: 'Invalid date'
        };
      }

      return {
        isValid: true,
        date
      };
    }
  }

  return {
    isValid: false,
    error: 'Unrecognized date format'
  };
};