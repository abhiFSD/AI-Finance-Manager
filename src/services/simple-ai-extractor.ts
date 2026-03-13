/**
 * Simple AI-powered transaction extractor
 * No intermediate parsing - just raw text to AI
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/utils/logger';

const aiLogger = logger.child({ module: 'simple-ai-extractor' });

interface AIExtractedData {
  accountInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder?: string;
    accountType?: string;
  };
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    balance?: number;
  }>;
}

export async function extractTransactionsWithAI(
  rawText: string,
  userId: string
): Promise<AIExtractedData> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = `You are a bank statement transaction extractor.

TASK: Extract ALL transactions from this bank statement.

RAW DATA:
${rawText}

OUTPUT FORMAT (JSON):
{
  "accountInfo": {
    "bankName": "detected bank name",
    "accountNumber": "account number (last 4 digits if masked)",
    "accountHolder": "if found",
    "accountType": "SAVINGS" | "CURRENT" | "CREDIT_CARD"
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description",
      "amount": 500.00,
      "type": "DEBIT" | "CREDIT",
      "balance": 10000.00
    }
  ]
}

RULES:
- Extract EVERY transaction you can find (skip header/footer rows)
- Convert dates to YYYY-MM-DD format
- Amount should be positive number (type indicates debit/credit)
- If withdrawal/debit, type = "DEBIT"
- If deposit/credit, type = "CREDIT"
- Combine multi-line descriptions into one
- Skip non-transaction rows (headers, summaries, page numbers)
- Return valid JSON only`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from AI');
    }

    // Extract JSON from response
    let jsonText = content.text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/\n?```/g, '');
    
    const extracted: AIExtractedData = JSON.parse(jsonText);

    aiLogger.info('AI extraction successful', {
      userId,
      bankName: extracted.accountInfo.bankName,
      transactionCount: extracted.transactions.length,
    });

    return extracted;
  } catch (error) {
    aiLogger.error('AI extraction failed', { error: String(error), userId });
    throw new Error(`AI extraction failed: ${error}`);
  }
}
