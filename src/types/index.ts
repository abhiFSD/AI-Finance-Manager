// Base types
export interface BaseDocument {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: Date;
  userId: string;
  status: DocumentStatus;
  metadata?: Record<string, any>;
}

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  VIRUS_DETECTED = 'virus_detected'
}

export enum DocumentType {
  BANK_STATEMENT = 'bank_statement',
  CREDIT_CARD_STATEMENT = 'credit_card_statement',
  INVESTMENT_STATEMENT = 'investment_statement',
  LOAN_STATEMENT = 'loan_statement',
  RECEIPT = 'receipt',
  INVOICE = 'invoice',
  OTHER = 'other'
}

export enum BankType {
  HDFC = 'hdfc',
  SBI = 'sbi',
  ICICI = 'icici',
  AXIS = 'axis',
  PNB = 'pnb',
  KOTAK = 'kotak',
  INDUSIND = 'indusind',
  YES_BANK = 'yes_bank',
  BOI = 'boi',
  UNKNOWN = 'unknown'
}

// Upload related types
export interface UploadProgress {
  documentId: string;
  filename: string;
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  status: UploadStatus;
  error?: string;
}

export enum UploadStatus {
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SCANNING = 'scanning',
  SCANNED = 'scanned'
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  fileInfo?: {
    size: number;
    mimeType: string;
    extension: string;
  };
}

// OCR related types
export interface OCRResult {
  text: string;
  confidence: number;
  words: OCRWord[];
  blocks?: OCRBlock[];
  processingTime: number;
  engine: OCREngine;
}

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface OCRBlock {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  words: OCRWord[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export enum OCREngine {
  TESSERACT = 'tesseract',
  AWS_TEXTRACT = 'aws_textract',
  GOOGLE_VISION = 'google_vision'
}

// Transaction related types
export interface Transaction {
  id?: string;
  date: Date;
  description: string;
  amount: number;
  type: TransactionType;
  balance?: number;
  category?: string;
  merchant?: string;
  reference?: string;
  accountNumber?: string;
  documentId?: string;
  confidence: number;
  rawText?: string;
}

export enum TransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit'
}

export interface Balance {
  amount: number;
  date: Date;
  type: BalanceType;
}

export enum BalanceType {
  OPENING = 'opening',
  CLOSING = 'closing',
  CURRENT = 'current'
}

// Parsing related types
export interface ParsedDocument {
  documentType: DocumentType;
  bankType?: BankType;
  accountNumber: string;
  accountHolder: string;
  statementPeriod: {
    from: Date;
    to: Date;
  };
  transactions: Transaction[];
  balances: Balance[];
  summary: DocumentSummary;
  metadata: ParsedMetadata;
}

export interface DocumentSummary {
  totalTransactions: number;
  totalDebits: number;
  totalCredits: number;
  openingBalance?: number;
  closingBalance?: number;
  statementPeriodDays: number;
}

export interface ParsedMetadata {
  parsingEngine: string;
  parsingTime: number;
  confidence: number;
  errors: string[];
  warnings: string[];
  extractedOn: Date;
}

// Bank-specific parser configurations
export interface BankParserConfig {
  bankType: BankType;
  patterns: {
    transactionPattern: RegExp;
    datePattern: RegExp;
    amountPattern: RegExp;
    balancePattern: RegExp;
    accountPattern: RegExp;
  };
  dateFormat: string;
  currency: string;
  statementIdentifiers: string[];
}

// Queue related types
export interface QueueJob {
  id: string;
  documentId: string;
  type: QueueJobType;
  data: any;
  attempts: number;
  maxAttempts: number;
  priority: number;
  delay?: number;
  createdAt: Date;
  processedAt?: Date;
  failedAt?: Date;
  error?: string;
}

export enum QueueJobType {
  DOCUMENT_PROCESS = 'document_process',
  OCR_EXTRACT = 'ocr_extract',
  PARSE_DOCUMENT = 'parse_document',
  EXTRACT_TRANSACTIONS = 'extract_transactions',
  VIRUS_SCAN = 'virus_scan'
}

export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

// Error types
export class DocumentProcessingError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'DocumentProcessingError';
    this.code = code;
    this.details = details;
  }
}

export class OCRError extends Error {
  public readonly confidence?: number;
  public readonly engine?: OCREngine;

  constructor(message: string, confidence?: number, engine?: OCREngine) {
    super(message);
    this.name = 'OCRError';
    this.confidence = confidence;
    this.engine = engine;
  }
}

export class ParsingError extends Error {
  public readonly documentType?: DocumentType;
  public readonly bankType?: BankType;

  constructor(message: string, documentType?: DocumentType, bankType?: BankType) {
    super(message);
    this.name = 'ParsingError';
    this.documentType = documentType;
    this.bankType = bankType;
  }
}

// Configuration types
export interface AppConfig {
  server: {
    port: number;
    host: string;
    apiVersion: string;
  };
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    uploadDir: string;
    tempDir: string;
  };
  ocr: {
    engine: OCREngine;
    language: string;
    confidenceThreshold: number;
    preprocessing: boolean;
  };
  queue: {
    redis: {
      host: string;
      port: number;
      password?: string;
      url?: string;
    };
    concurrency: number;
    maxRetryAttempts: number;
    retryDelay: number;
  };
  aws?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    textractEnabled: boolean;
  };
  virusScanning: {
    enabled: boolean;
    clamav?: {
      host: string;
      port: number;
    };
  };
  logging: {
    level: string;
    file: string;
  };
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
    auth: {
      windowMs: number;
      maxAttempts: number;
    };
    register: {
      windowMs: number;
      maxAttempts: number;
    };
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Date;
    requestId: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Extraction service types
export interface ExtractionResult {
  transactions: Transaction[];
  accountInfo: AccountInfo;
  summary: ExtractionSummary;
  confidence: number;
  extractionTime: number;
}

export interface AccountInfo {
  accountNumber: string;
  accountHolder: string;
  accountType: string;
  branchCode?: string;
  ifscCode?: string;
  bankName: string;
}

export interface ExtractionSummary {
  totalTransactionsFound: number;
  duplicatesDetected: number;
  validTransactions: number;
  invalidTransactions: number;
  averageConfidence: number;
  processingErrors: string[];
}

// Amount parsing types
export interface AmountParsingResult {
  amount: number;
  currency: string;
  confidence: number;
  originalText: string;
}

// Date parsing types
export interface DateParsingResult {
  date: Date;
  format: string;
  confidence: number;
  originalText: string;
}