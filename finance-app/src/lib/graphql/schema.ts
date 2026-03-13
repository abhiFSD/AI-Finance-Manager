import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar Date
  scalar JSON
  scalar Upload

  # User types
  type User {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    avatar: String
    createdAt: Date!
    updatedAt: Date!
    accounts: [Account!]!
    transactions: [Transaction!]!
    preferences: UserPreferences
  }

  type UserPreferences {
    currency: String!
    timezone: String!
    theme: String!
    notifications: NotificationSettings!
  }

  type NotificationSettings {
    email: Boolean!
    push: Boolean!
    sms: Boolean!
    transactionAlerts: Boolean!
    budgetAlerts: Boolean!
  }

  # Account types
  type Account {
    id: ID!
    name: String!
    type: AccountType!
    balance: Float!
    currency: String!
    isActive: Boolean!
    institution: String
    accountNumber: String
    routing: String
    createdAt: Date!
    updatedAt: Date!
    user: User!
    transactions: [Transaction!]!
    categories: [Category!]!
  }

  enum AccountType {
    CHECKING
    SAVINGS
    CREDIT_CARD
    INVESTMENT
    LOAN
  }

  # Transaction types
  type Transaction {
    id: ID!
    amount: Float!
    description: String!
    date: Date!
    type: TransactionType!
    status: TransactionStatus!
    category: Category
    account: Account!
    user: User!
    merchant: String
    reference: String
    location: String
    tags: [String!]!
    attachments: [Document!]!
    createdAt: Date!
    updatedAt: Date!
  }

  enum TransactionType {
    INCOME
    EXPENSE
    TRANSFER
  }

  enum TransactionStatus {
    PENDING
    COMPLETED
    CANCELLED
    FAILED
  }

  # Category types
  type Category {
    id: ID!
    name: String!
    color: String!
    icon: String
    parent: Category
    children: [Category!]!
    transactions: [Transaction!]!
    budget: Budget
    createdAt: Date!
    updatedAt: Date!
  }

  # Budget types
  type Budget {
    id: ID!
    name: String!
    amount: Float!
    period: BudgetPeriod!
    category: Category!
    spent: Float!
    remaining: Float!
    percentage: Float!
    alerts: BudgetAlerts!
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  enum BudgetPeriod {
    WEEKLY
    MONTHLY
    QUARTERLY
    YEARLY
  }

  type BudgetAlerts {
    threshold50: Boolean!
    threshold75: Boolean!
    threshold90: Boolean!
    exceeded: Boolean!
  }

  # Document types
  type Document {
    id: ID!
    filename: String!
    originalName: String!
    mimeType: String!
    size: Int!
    url: String!
    transaction: Transaction
    user: User!
    createdAt: Date!
  }

  # Analytics types
  type SpendingAnalytics {
    totalSpending: Float!
    categoryBreakdown: [CategorySpending!]!
    monthlyTrend: [MonthlySpending!]!
    averageTransaction: Float!
    transactionCount: Int!
    topMerchants: [MerchantSpending!]!
  }

  type CategorySpending {
    category: Category!
    amount: Float!
    percentage: Float!
    transactionCount: Int!
  }

  type MonthlySpending {
    month: String!
    amount: Float!
    transactionCount: Int!
  }

  type MerchantSpending {
    merchant: String!
    amount: Float!
    transactionCount: Int!
  }

  type DashboardData {
    totalBalance: Float!
    monthlyIncome: Float!
    monthlyExpenses: Float!
    savingsRate: Float!
    accounts: [Account!]!
    recentTransactions: [Transaction!]!
    upcomingBills: [Transaction!]!
    budgetSummary: [Budget!]!
    analytics: SpendingAnalytics!
  }

  # Input types
  input TransactionInput {
    amount: Float!
    description: String!
    date: Date!
    type: TransactionType!
    categoryId: ID
    accountId: ID!
    merchant: String
    reference: String
    location: String
    tags: [String!]
  }

  input TransactionFilter {
    accountIds: [ID!]
    categoryIds: [ID!]
    types: [TransactionType!]
    statuses: [TransactionStatus!]
    dateFrom: Date
    dateTo: Date
    amountMin: Float
    amountMax: Float
    search: String
  }

  input AccountInput {
    name: String!
    type: AccountType!
    balance: Float!
    currency: String!
    institution: String
    accountNumber: String
    routing: String
  }

  input CategoryInput {
    name: String!
    color: String!
    icon: String
    parentId: ID
  }

  input BudgetInput {
    name: String!
    amount: Float!
    period: BudgetPeriod!
    categoryId: ID!
    alerts: BudgetAlertsInput!
  }

  input BudgetAlertsInput {
    threshold50: Boolean!
    threshold75: Boolean!
    threshold90: Boolean!
    exceeded: Boolean!
  }

  input UserPreferencesInput {
    currency: String
    timezone: String
    theme: String
    notifications: NotificationSettingsInput
  }

  input NotificationSettingsInput {
    email: Boolean
    push: Boolean
    sms: Boolean
    transactionAlerts: Boolean
    budgetAlerts: Boolean
  }

  # Pagination types
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type TransactionConnection {
    edges: [TransactionEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type TransactionEdge {
    node: Transaction!
    cursor: String!
  }

  # Queries
  type Query {
    # User queries
    me: User
    user(id: ID!): User

    # Account queries
    accounts: [Account!]!
    account(id: ID!): Account

    # Transaction queries
    transactions(
      first: Int
      after: String
      filter: TransactionFilter
    ): TransactionConnection!
    transaction(id: ID!): Transaction

    # Category queries
    categories: [Category!]!
    category(id: ID!): Category

    # Budget queries
    budgets: [Budget!]!
    budget(id: ID!): Budget

    # Analytics queries
    spendingAnalytics(
      dateFrom: Date!
      dateTo: Date!
      accountIds: [ID!]
    ): SpendingAnalytics!

    # Dashboard
    dashboard: DashboardData!

    # Search
    search(query: String!): SearchResults!
  }

  type SearchResults {
    transactions: [Transaction!]!
    accounts: [Account!]!
    categories: [Category!]!
    merchants: [String!]!
  }

  # Mutations
  type Mutation {
    # Transaction mutations
    createTransaction(input: TransactionInput!): Transaction!
    updateTransaction(id: ID!, input: TransactionInput!): Transaction!
    deleteTransaction(id: ID!): Boolean!
    bulkCreateTransactions(inputs: [TransactionInput!]!): [Transaction!]!
    bulkDeleteTransactions(ids: [ID!]!): Boolean!

    # Account mutations
    createAccount(input: AccountInput!): Account!
    updateAccount(id: ID!, input: AccountInput!): Account!
    deleteAccount(id: ID!): Boolean!

    # Category mutations
    createCategory(input: CategoryInput!): Category!
    updateCategory(id: ID!, input: CategoryInput!): Category!
    deleteCategory(id: ID!): Boolean!

    # Budget mutations
    createBudget(input: BudgetInput!): Budget!
    updateBudget(id: ID!, input: BudgetInput!): Budget!
    deleteBudget(id: ID!): Boolean!

    # User mutations
    updateProfile(input: UserPreferencesInput!): User!
    uploadDocument(file: Upload!, transactionId: ID): Document!
    deleteDocument(id: ID!): Boolean!

    # Import/Export
    importTransactions(file: Upload!): ImportResult!
    exportTransactions(format: ExportFormat!, filter: TransactionFilter): String!
  }

  type ImportResult {
    success: Boolean!
    imported: Int!
    failed: Int!
    errors: [String!]!
  }

  enum ExportFormat {
    CSV
    JSON
    PDF
  }

  # Subscriptions
  type Subscription {
    transactionAdded(accountId: ID): Transaction!
    transactionUpdated(id: ID!): Transaction!
    balanceUpdated(accountId: ID!): Account!
    budgetAlert(budgetId: ID!): Budget!
  }
`;