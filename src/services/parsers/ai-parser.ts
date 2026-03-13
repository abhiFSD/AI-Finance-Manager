/**
 * AI Parser Service
 * Uses OpenClaw Gateway AI to parse raw financial data
 * - Sends raw data to AI for intelligent parsing
 * - Requests structured JSON response with account info and transactions
 * - Validates and normalizes AI responses
 * - Handles errors gracefully with fallbacks
 */

import Anthropic from '@anthropic-ai/sdk';

export interface RawFinancialData {
  content: string;
  fileName?: string;
  fileType?: string;
  metadata?: Record<string, any>;
}

export interface ParsedAccountInfo {
  accountNumber?: string;
  accountNumberLastFour?: string;
  bankName?: string;
  accountHolder?: string;
  accountType?: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'LOAN' | 'WALLET';
  currency?: string;
  balance?: number;
  statement_period?: {
    start?: string;
    end?: string;
  };
}

export interface ParsedTransactionData {
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  merchantName?: string;
  reference?: string;
  category?: string;
  notes?: string;
}

export interface AIParseResult {
  success: boolean;
  accountInfo?: ParsedAccountInfo;
  transactions?: ParsedTransactionData[];
  rawResponse?: any;
  error?: string;
  confidence?: number;
  parsingTime?: number;
  validationErrors?: string[];
}

/**
 * Build an AI prompt that requests structured JSON response
 */
function buildParsingPrompt(rawData: RawFinancialData): string {
  return `You are a financial document parsing expert. Analyze the following financial document and extract structured data.

DOCUMENT CONTENT:
${rawData.content}

INSTRUCTIONS:
1. Extract account information if available (account number, bank name, account holder, type)
2. Parse all transactions with: date, description, amount, type (INCOME/EXPENSE/TRANSFER)
3. Normalize data:
   - Dates should be in YYYY-MM-DD format
   - Amounts should be positive numbers
   - Descriptions should be cleaned up and normalized
   - Types must be INCOME, EXPENSE, or TRANSFER
4. Include merchant names when identifiable
5. Flag any suspicious or ambiguous data

RESPOND ONLY WITH A JSON OBJECT (no markdown, no explanations):
{
  "accountInfo": {
    "accountNumber": "string or null",
    "accountNumberLastFour": "string or null",
    "bankName": "string or null",
    "accountHolder": "string or null",
    "accountType": "CHECKING|SAVINGS|CREDIT_CARD|INVESTMENT|LOAN|WALLET|null",
    "currency": "string or null",
    "balance": "number or null",
    "statement_period": {
      "start": "YYYY-MM-DD or null",
      "end": "YYYY-MM-DD or null"
    }
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": "number (positive)",
      "type": "INCOME|EXPENSE|TRANSFER",
      "merchantName": "string or null",
      "reference": "string or null",
      "category": "string or null",
      "notes": "string or null"
    }
  ],
  "metadata": {
    "dataQuality": "high|medium|low",
    "issues": ["array of any parsing issues"],
    "confidence": "number between 0-100"
  }
}`;
}

/**
 * Validate parsed AI response structure
 */
function validateAIResponse(response: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!response || typeof response !== 'object') {
    errors.push('Response must be a valid JSON object');
    return { valid: false, errors };
  }

  // Validate accountInfo structure
  if (response.accountInfo) {
    if (typeof response.accountInfo !== 'object') {
      errors.push('accountInfo must be an object');
    }
  }

  // Validate transactions array
  if (!Array.isArray(response.transactions)) {
    errors.push('transactions must be an array');
  } else {
    response.transactions.forEach((txn: any, idx: number) => {
      if (!txn.date || !/^\d{4}-\d{2}-\d{2}$/.test(txn.date)) {
        errors.push(`Transaction ${idx}: invalid date format, expected YYYY-MM-DD`);
      }
      if (!txn.description || typeof txn.description !== 'string') {
        errors.push(`Transaction ${idx}: missing or invalid description`);
      }
      if (typeof txn.amount !== 'number' || txn.amount < 0) {
        errors.push(`Transaction ${idx}: invalid amount, must be positive number`);
      }
      if (!['INCOME', 'EXPENSE', 'TRANSFER'].includes(txn.type)) {
        errors.push(`Transaction ${idx}: invalid type, must be INCOME, EXPENSE, or TRANSFER`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Normalize and clean parsed transaction data
 */
function normalizeTransaction(txn: any): ParsedTransactionData {
  return {
    date: txn.date,
    description: (txn.description || '').trim(),
    amount: Math.abs(parseFloat(txn.amount) || 0),
    type: (txn.type?.toUpperCase() || 'EXPENSE') as 'INCOME' | 'EXPENSE' | 'TRANSFER',
    merchantName: txn.merchantName ? txn.merchantName.trim() : undefined,
    reference: txn.reference ? txn.reference.trim() : undefined,
    category: txn.category ? txn.category.trim() : undefined,
    notes: txn.notes ? txn.notes.trim() : undefined,
  };
}

/**
 * Validate normalized transaction data
 */
function validateNormalizedTransaction(txn: ParsedTransactionData): boolean {
  return (
    txn.amount > 0 &&
    txn.amount < 1_000_000_000 &&
    txn.date &&
    txn.description &&
    txn.description.length > 0
  );
}

/**
 * Normalize and clean parsed account info
 */
function normalizeAccountInfo(accountInfo: any): ParsedAccountInfo {
  const normalized: ParsedAccountInfo = {};

  if (accountInfo?.accountNumber) {
    normalized.accountNumber = accountInfo.accountNumber.toString().replace(/\D/g, '');
    normalized.accountNumberLastFour = normalized.accountNumber.slice(-4);
  }

  if (accountInfo?.bankName) {
    normalized.bankName = accountInfo.bankName.trim();
  }

  if (accountInfo?.accountHolder) {
    normalized.accountHolder = accountInfo.accountHolder.trim();
  }

  if (accountInfo?.accountType && ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN', 'WALLET'].includes(accountInfo.accountType)) {
    normalized.accountType = accountInfo.accountType;
  }

  if (accountInfo?.currency) {
    normalized.currency = accountInfo.currency.toUpperCase();
  }

  if (typeof accountInfo?.balance === 'number') {
    normalized.balance = accountInfo.balance;
  }

  if (accountInfo?.statement_period) {
    normalized.statement_period = {
      start: accountInfo.statement_period.start,
      end: accountInfo.statement_period.end,
    };
  }

  return normalized;
}

/**
 * Extract JSON from text that might contain markdown or extra content
 */
function extractJSONFromText(text: string): any {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Try to remove markdown code blocks (```json ... ```)
    const withoutMarkdown = text.replace(/```json\n?|\n?```/g, '').trim();
    try {
      return JSON.parse(withoutMarkdown);
    } catch {
      // Try to extract JSON object from text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error('Failed to extract valid JSON from response');
        }
      }
      throw new Error('No JSON object found in response');
    }
  }
}

/**
 * Main method: Parse raw financial data using AI
 * Sends data to Claude AI via Anthropic SDK
 */
export async function parseTransactions(rawData: RawFinancialData): Promise<AIParseResult> {
  const startTime = Date.now();

  try {
    // Validate input
    if (!rawData || !rawData.content) {
      return {
        success: false,
        error: 'Raw data content is required',
        parsingTime: Date.now() - startTime,
      };
    }

    // Validate input size (max 1MB)
    const inputSizeBytes = new TextEncoder().encode(rawData.content).length;
    const maxSizeBytes = 1024 * 1024; // 1MB
    if (inputSizeBytes > maxSizeBytes) {
      return {
        success: false,
        error: `Input data too large: ${(inputSizeBytes / 1024 / 1024).toFixed(2)}MB. Maximum allowed is 1MB.`,
        parsingTime: Date.now() - startTime,
      };
    }

    // Validate API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'ANTHROPIC_API_KEY not configured',
        parsingTime: Date.now() - startTime,
      };
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Build the parsing prompt
    const prompt = buildParsingPrompt(rawData);

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const textContent = response.content.find((block: any) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return {
        success: false,
        error: 'No text response from AI',
        parsingTime: Date.now() - startTime,
      };
    }

    // Parse JSON from AI response
    let parsedData: any;
    try {
      parsedData = extractJSONFromText(textContent.text);
    } catch (jsonError) {
      return {
        success: false,
        error: `Failed to parse AI response as JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`,
        rawResponse: textContent.text,
        parsingTime: Date.now() - startTime,
      };
    }

    // Validate structure
    const validation = validateAIResponse(parsedData);
    if (!validation.valid) {
      return {
        success: false,
        error: 'AI response validation failed',
        validationErrors: validation.errors,
        rawResponse: parsedData,
        parsingTime: Date.now() - startTime,
      };
    }

    // Normalize account info
    const accountInfo = parsedData.accountInfo ? normalizeAccountInfo(parsedData.accountInfo) : undefined;

    // Normalize transactions
    let transactions = (parsedData.transactions || []).map(normalizeTransaction);
    
    // Filter out invalid transactions
    const validTransactions: ParsedTransactionData[] = [];
    const invalidTransactions: string[] = [];
    
    transactions.forEach((txn, idx) => {
      if (validateNormalizedTransaction(txn)) {
        validTransactions.push(txn);
      } else {
        invalidTransactions.push(`Transaction ${idx}: failed validation (amount: ${txn.amount}, description: ${txn.description})`);
      }
    });

    // Calculate confidence
    const confidence = parsedData.metadata?.confidence || (validTransactions.length > 0 ? 85 : 70);

    return {
      success: true,
      accountInfo,
      transactions: validTransactions,
      rawResponse: parsedData,
      confidence,
      parsingTime: Date.now() - startTime,
      validationErrors: invalidTransactions.length > 0 ? invalidTransactions : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `AI Parser error: ${errorMessage}`,
      parsingTime: Date.now() - startTime,
    };
  }
}

/**
 * Parse transactions from multiple file types
 * Wrapper that handles different input formats
 */
export async function parseFinancialDocument(
  fileContent: string,
  fileName?: string,
  fileType?: string
): Promise<AIParseResult> {
  return parseTransactions({
    content: fileContent,
    fileName,
    fileType,
  });
}

export default {
  parseTransactions,
  parseFinancialDocument,
};
