/**
 * Parsers Index
 * Exports all parsing services
 */

export { parseTransactions, parseFinancialDocument } from './ai-parser';
export type { RawFinancialData, ParsedAccountInfo, ParsedTransactionData, AIParseResult } from './ai-parser';

export default {
  parseTransactions: require('./ai-parser').parseTransactions,
  parseFinancialDocument: require('./ai-parser').parseFinancialDocument,
};
