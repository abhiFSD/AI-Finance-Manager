// Phase 4: Analytics & Automation Engine
// Export all services for the finance app

// AI Parsing & Import Services
export { parseTransactions, parseFinancialDocument } from './parsers/ai-parser';
export type { RawFinancialData, ParsedAccountInfo, ParsedTransactionData, AIParseResult } from './parsers/ai-parser';

// Account Management Services
export {
  generateAccountName,
  findOrCreateAccount,
  createAccountFromStatement,
  findDuplicateTransaction,
  updateAccountBalance,
  getAccountWithTransactions,
  deactivateAccount,
  getUserAccounts,
} from './account-manager';
export type { FindOrCreateAccountInput, AccountMatchResult } from './account-manager';

// AI Import Service (Orchestration)
export { parseAndImport, parseAndImportBulk, getImportHistory, rollbackImport } from './ai-import-service';
export type { ImportResult } from './ai-import-service';

// Transaction Categorization Services
export * from './categorization';

// Analytics Services
export * from './analytics';

// Budget Management Services
export * from './budgets';

// Report Generation Services
export * from './reports';

// Automation Services
export * from './automation';

// Main service aggregator
export { FinanceAppServices } from './finance-app-services';