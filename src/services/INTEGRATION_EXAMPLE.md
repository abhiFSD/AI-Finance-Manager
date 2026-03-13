# AI Parser & Smart Account Manager - Integration Guide

## Overview

The new AI Parser and Smart Account Manager services provide an intelligent workflow for importing financial statements and managing accounts automatically.

## Architecture

### 1. **AI Parser (`src/services/parsers/ai-parser.ts`)**
Converts raw financial data into structured JSON using Claude AI.

**Key Features:**
- Sends raw document content to Claude AI
- Builds intelligent prompts for account info + transaction extraction
- Validates and normalizes AI responses
- Graceful error handling with detailed error messages
- Confidence scoring for parsed data

**Usage:**
```typescript
import { parseTransactions } from '@/services/parsers/ai-parser';

const result = await parseTransactions({
  content: csvContent,
  fileName: 'bank-statement.csv',
  fileType: 'csv'
});

if (result.success) {
  console.log('Parsed transactions:', result.transactions);
  console.log('Account info:', result.accountInfo);
  console.log('Confidence:', result.confidence);
}
```

### 2. **Account Manager (`src/services/account-manager.ts`)**
Intelligently finds or creates accounts with smart matching.

**Key Features:**
- Smart matching using account number last 4 digits + bank name
- Confidence scoring for matches
- Auto-generates account names: "BankName Type - LastFour"
- Duplicate detection within time windows
- Balance management

**Usage:**
```typescript
import { findOrCreateAccount, generateAccountName } from '@/services/account-manager';

// Find or create account
const account = await findOrCreateAccount({
  userId: 'user-123',
  bankName: 'HDFC Bank',
  accountNumberLastFour: '5432',
  accountType: 'SAVINGS',
  currency: 'INR'
});

console.log(`Account: ${account.name}`);
console.log(`Match Confidence: ${account.matchConfidence}%`);
console.log(`Is Existing: ${account.isExisting}`);
```

### 3. **AI Import Service (`src/services/ai-import-service.ts`)**
Orchestrates the complete import workflow.

**Key Features:**
- Combines AI parsing + account detection + transaction saving
- Duplicate detection and prevention
- Balance updates
- Bulk import support
- Import history and rollback

**Usage:**
```typescript
import { parseAndImport } from '@/services/ai-import-service';

const result = await parseAndImport(
  'user-123',
  {
    content: csvContent,
    fileName: 'march-statement.csv'
  },
  {
    skipDuplicateDetection: false,
    updateBalance: true,
    categoryMapping: {
      'Groceries': 'cat-food',
      'Transport': 'cat-transport'
    }
  }
);

console.log(`Imported: ${result.transactionsImported} transactions`);
console.log(`Skipped: ${result.duplicatesSkipped} duplicates`);
console.log(`Account: ${result.accountName}`);
```

## Complete Workflow Example

### Step-by-Step Integration

```typescript
import { TextExtractor } from '@/services/extractors/text-extractor';
import { parseAndImport } from '@/services/ai-import-service';
import { getUserAccounts } from '@/services/account-manager';

async function importBankStatement(userId: string, filePath: string) {
  try {
    // Step 1: Extract file content
    const extractionResult = TextExtractor.extract(filePath);
    if (!extractionResult.success) {
      throw new Error(`Extraction failed: ${extractionResult.error}`);
    }

    // Step 2: Parse and import in one go
    const importResult = await parseAndImport(
      userId,
      {
        content: extractionResult.data!,
        fileName: extractionResult.fileName,
        fileType: extractionResult.mimeType
      },
      {
        skipDuplicateDetection: false,
        updateBalance: true
      }
    );

    if (!importResult.success) {
      console.error('Import failed:', importResult.errors);
      return;
    }

    // Step 3: Display results
    console.log(`✓ Imported ${importResult.transactionsImported} transactions`);
    console.log(`✓ Account: ${importResult.accountName}`);
    console.log(`✓ New Balance: ₹${importResult.accountBalance?.toLocaleString()}`);
    
    if (importResult.duplicatesSkipped > 0) {
      console.log(`⚠ Skipped ${importResult.duplicatesSkipped} duplicate transactions`);
    }

    if (importResult.warnings) {
      console.log(`⚠ Warnings:`, importResult.warnings);
    }

    // Step 4: Show updated accounts
    const accounts = await getUserAccounts(userId);
    console.log('Current Accounts:', accounts);

    return importResult;
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## API Endpoints Integration

### Create an API endpoint for document upload

```typescript
// src/app/api/documents/import/route.ts
import { parseAndImport } from '@/services/ai-import-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = request.headers.get('x-user-id');

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Missing file or user ID' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Run import
    const result = await parseAndImport(userId, {
      content,
      fileName: file.name,
      fileType: file.type
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
```

## Data Flow

```
Raw Financial Document
        ↓
TextExtractor
        ↓
AI Parser (parseTransactions)
        ↓
   Account Manager (findOrCreateAccount)
        ↓
   Duplicate Detection
        ↓
   Save Transactions to DB
        ↓
   Update Account Balance
        ↓
Import Result
```

## Key Features & Benefits

### 1. **Intelligent Account Matching**
- Matches by account number last 4 digits + bank name
- Calculates confidence scores
- Prevents duplicate accounts
- Auto-generates standardized names

### 2. **AI-Powered Parsing**
- Handles multiple document formats
- Extracts structured data automatically
- Validates responses
- Provides confidence scores

### 3. **Duplicate Prevention**
- Detects duplicate transactions within time windows
- Configurable tolerance (default: 3 days)
- Prevents duplicate charges

### 4. **Transaction Management**
- Automatic categorization support
- Type inference (Income/Expense/Transfer)
- Tag and note support
- Merchant name normalization

## Error Handling

All services return detailed error information:

```typescript
const result = await parseAndImport(userId, data);

if (!result.success) {
  // Errors array contains detailed error messages
  console.error('Errors:', result.errors);
  
  // Warnings for non-critical issues
  console.warn('Warnings:', result.warnings);
  
  // Metadata for debugging
  console.log('Metadata:', result.metadata);
}
```

## Testing

### Unit Tests for AI Parser
```typescript
import { parseTransactions } from '@/services/parsers/ai-parser';

describe('AI Parser', () => {
  it('should parse a valid bank statement', async () => {
    const result = await parseTransactions({
      content: mockCSVContent,
      fileName: 'test.csv'
    });

    expect(result.success).toBe(true);
    expect(result.transactions).toHaveLength(5);
    expect(result.accountInfo?.bankName).toBeDefined();
  });
});
```

### Unit Tests for Account Manager
```typescript
import { findOrCreateAccount, generateAccountName } from '@/services/account-manager';

describe('Account Manager', () => {
  it('should generate correct account names', () => {
    const name = generateAccountName('HDFC Bank', 'SAVINGS', '5432');
    expect(name).toBe('HDFC Bank Savings - 5432');
  });

  it('should find existing accounts with high confidence', async () => {
    const result = await findOrCreateAccount({
      userId: 'test-user',
      bankName: 'HDFC Bank',
      accountNumberLastFour: '5432',
      accountType: 'SAVINGS'
    });

    expect(result.matchConfidence).toBeGreaterThan(60);
  });
});
```

## Configuration & Environment

Requires `ANTHROPIC_API_KEY` in `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

## Performance Considerations

- **AI Parsing**: ~2-5 seconds per document (depends on size)
- **Account Matching**: O(n) where n = number of user's accounts
- **Duplicate Detection**: O(m) where m = transactions in time window
- **Bulk Import**: Can process up to 100 documents sequentially

## Future Enhancements

1. **Batch Processing**: Queue-based import for large files
2. **Machine Learning**: Learn from user corrections
3. **Document Type Detection**: Auto-detect document type (bank/credit card/investment)
4. **Multi-language Support**: Parse statements in multiple languages
5. **Receipt Processing**: Handle receipt images and PDFs
6. **Scheduled Imports**: Automated monthly statement imports

## Support

For issues or questions about these services:
1. Check error messages in `result.errors` and `result.warnings`
2. Review `result.metadata` for debugging info
3. Verify API key is configured
4. Check database connectivity
