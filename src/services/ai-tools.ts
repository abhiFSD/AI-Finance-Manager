import prisma from '../lib/prisma';
import { TransactionType } from '@prisma/client';

// Tool 1: Get Account Summary
async function get_account_summary(userId: string, _input: any) {
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      institution: true,
      balance: true,
      currency: true,
      lastSynced: true,
    },
    orderBy: { balance: 'desc' },
  });

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return {
    accounts,
    totalBalance,
    accountCount: accounts.length,
  };
}

// Tool 2: Get Transactions with filters
async function get_transactions(userId: string, input: any) {
  const {
    startDate,
    endDate,
    type,
    categoryName,
    accountId,
    minAmount,
    maxAmount,
    limit = 50,
  } = input;

  const where: any = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  if (type) where.type = type;
  if (accountId) where.accountId = accountId;

  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amount = {};
    if (minAmount !== undefined) where.amount.gte = minAmount;
    if (maxAmount !== undefined) where.amount.lte = maxAmount;
  }

  // Handle category filter
  if (categoryName) {
    const category = await prisma.category.findFirst({
      where: {
        name: { contains: categoryName },
      },
    });
    if (category) where.categoryId = category.id;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  });

  return {
    transactions,
    count: transactions.length,
  };
}

// Tool 3: Get Spending by Category
async function get_spending_by_category(userId: string, input: any) {
  const { startDate, endDate } = input;

  const where: any = {
    userId,
    type: TransactionType.EXPENSE,
  };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const grouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where,
    _sum: { amount: true },
    _count: true,
  });

  // Fetch category names
  const categoryIds = grouped.map((g) => g.categoryId).filter(Boolean) as string[];
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, icon: true, color: true },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const breakdown = grouped.map((g) => ({
    categoryId: g.categoryId,
    categoryName: g.categoryId ? categoryMap.get(g.categoryId)?.name || 'Unknown' : 'Uncategorized',
    categoryIcon: g.categoryId ? categoryMap.get(g.categoryId)?.icon : null,
    categoryColor: g.categoryId ? categoryMap.get(g.categoryId)?.color : null,
    totalSpent: g._sum.amount || 0,
    transactionCount: g._count,
  }));

  breakdown.sort((a, b) => b.totalSpent - a.totalSpent);

  const totalSpent = breakdown.reduce((sum, cat) => sum + cat.totalSpent, 0);

  return {
    breakdown,
    totalSpent,
    period: { startDate, endDate },
  };
}

// Tool 4: Get Monthly Trends
async function get_monthly_trends(userId: string, input: any) {
  const months = input.months || 6;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate },
    },
    select: {
      date: true,
      amount: true,
      type: true,
    },
    orderBy: { date: 'asc' },
  });

  // Group by month
  const monthlyData: Record<
    string,
    { income: number; expense: number; net: number }
  > = {};

  transactions.forEach((t) => {
    const monthKey = t.date.toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0, net: 0 };
    }

    if (t.type === TransactionType.INCOME) {
      monthlyData[monthKey].income += t.amount;
    } else if (t.type === TransactionType.EXPENSE) {
      monthlyData[monthKey].expense += t.amount;
    }
  });

  // Calculate net for each month
  const trends = Object.keys(monthlyData)
    .sort()
    .map((month) => ({
      month,
      income: monthlyData[month].income,
      expense: monthlyData[month].expense,
      net: monthlyData[month].income - monthlyData[month].expense,
      savingsRate:
        monthlyData[month].income > 0
          ? ((monthlyData[month].income - monthlyData[month].expense) /
              monthlyData[month].income) *
            100
          : 0,
    }));

  return { trends, months };
}

// Tool 5: Get Budget Status
async function get_budget_status(userId: string, _input: any) {
  const now = new Date();

  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
  });

  const budgetStatuses = await Promise.all(
    budgets.map(async (budget) => {
      // Calculate spent in current period
      const spent = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: budget.categoryId,
          type: TransactionType.EXPENSE,
          date: {
            gte: budget.startDate,
            lte: budget.endDate || now,
          },
        },
        _sum: { amount: true },
      });

      const totalSpent = spent._sum.amount || 0;
      const remaining = budget.amount - totalSpent;
      const percentageUsed = (totalSpent / budget.amount) * 100;

      return {
        budgetId: budget.id,
        category: budget.category,
        budgetAmount: budget.amount,
        spent: totalSpent,
        remaining,
        percentageUsed,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        isOverBudget: totalSpent > budget.amount,
        alertEnabled: budget.alertEnabled,
        alertThreshold: budget.alertThreshold,
      };
    })
  );

  return {
    budgets: budgetStatuses,
    totalBudgets: budgetStatuses.length,
    overBudgetCount: budgetStatuses.filter((b) => b.isOverBudget).length,
  };
}

// Tool 6: Get Goals Progress
async function get_goals_progress(userId: string, _input: any) {
  const goals = await prisma.goal.findMany({
    where: { userId },
    include: {
      contributions: {
        orderBy: { date: 'desc' },
        take: 5,
      },
      investments: {
        select: {
          id: true,
          name: true,
          currentValue: true,
          investedAmount: true,
        },
      },
    },
    orderBy: { deadline: 'asc' },
  });

  const goalsWithProgress = goals.map((goal) => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    const remaining = goal.targetAmount - goal.currentAmount;

    let daysUntilDeadline = null;
    if (goal.deadline) {
      const diff = goal.deadline.getTime() - new Date().getTime();
      daysUntilDeadline = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return {
      id: goal.id,
      name: goal.name,
      category: goal.category,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      remaining,
      progress,
      deadline: goal.deadline,
      daysUntilDeadline,
      priority: goal.priority,
      isCompleted: goal.isCompleted,
      recentContributions: goal.contributions,
      linkedInvestments: goal.investments,
    };
  });

  return {
    goals: goalsWithProgress,
    totalGoals: goalsWithProgress.length,
    completedGoals: goalsWithProgress.filter((g) => g.isCompleted).length,
  };
}

// Tool 7: Get Investment Portfolio
async function get_investment_portfolio(userId: string, _input: any) {
  const investments = await prisma.investment.findMany({
    where: { userId, isActive: true },
    include: {
      goal: { select: { id: true, name: true } },
    },
  });

  const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalReturns = totalCurrentValue - totalInvested;
  const overallReturnPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  // Calculate allocation by type
  const allocationByType: Record<string, { value: number; percentage: number }> = {};
  investments.forEach((inv) => {
    if (!allocationByType[inv.type]) {
      allocationByType[inv.type] = { value: 0, percentage: 0 };
    }
    allocationByType[inv.type].value += inv.currentValue;
  });

  Object.keys(allocationByType).forEach((type) => {
    allocationByType[type].percentage =
      totalCurrentValue > 0 ? (allocationByType[type].value / totalCurrentValue) * 100 : 0;
  });

  const investmentsWithReturns = investments.map((inv) => ({
    id: inv.id,
    name: inv.name,
    type: inv.type,
    platform: inv.platform,
    investedAmount: inv.investedAmount,
    currentValue: inv.currentValue,
    returns: inv.currentValue - inv.investedAmount,
    returnPercentage:
      inv.investedAmount > 0 ? ((inv.currentValue - inv.investedAmount) / inv.investedAmount) * 100 : 0,
    purchaseDate: inv.purchaseDate,
    linkedGoal: inv.goal,
  }));

  return {
    investments: investmentsWithReturns,
    totalInvested,
    totalCurrentValue,
    totalReturns,
    overallReturnPercentage,
    allocationByType,
  };
}

// Tool 8: Get Loan Details
async function get_loan_details(userId: string, _input: any) {
  const loans = await prisma.loan.findMany({
    where: { userId, isActive: true },
    include: {
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 5,
      },
    },
  });

  const totalOutstanding = loans.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principalAmount, 0);
  const totalPaid = totalPrincipal - totalOutstanding;

  const loansWithDetails = loans.map((loan) => {
    const paidAmount = loan.principalAmount - loan.outstandingBalance;
    const paidPercentage = (paidAmount / loan.principalAmount) * 100;

    return {
      id: loan.id,
      name: loan.name,
      type: loan.type,
      lender: loan.lender,
      principalAmount: loan.principalAmount,
      outstandingBalance: loan.outstandingBalance,
      paidAmount,
      paidPercentage,
      interestRate: loan.interestRate,
      emiAmount: loan.emiAmount,
      tenure: loan.tenure,
      nextPaymentDate: loan.nextPaymentDate,
      recentPayments: loan.payments,
    };
  });

  return {
    loans: loansWithDetails,
    totalLoans: loans.length,
    totalOutstanding,
    totalPrincipal,
    totalPaid,
  };
}

// Tool 9: Get Net Worth
async function get_net_worth(userId: string, _input: any) {
  // Assets: Account balances + Investments
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true, type: { notIn: ['CREDIT_CARD', 'LOAN'] } },
    select: { balance: true },
  });

  const investments = await prisma.investment.findMany({
    where: { userId, isActive: true },
    select: { currentValue: true },
  });

  const totalAccountBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalInvestmentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalAssets = totalAccountBalance + totalInvestmentValue;

  // Liabilities: Loans + Credit Card balances
  const loans = await prisma.loan.findMany({
    where: { userId, isActive: true },
    select: { outstandingBalance: true },
  });

  const creditCards = await prisma.creditCard.findMany({
    where: { userId, isActive: true },
    select: { currentBalance: true },
  });

  const totalLoanBalance = loans.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const totalCreditCardBalance = creditCards.reduce((sum, cc) => sum + cc.currentBalance, 0);
  const totalLiabilities = totalLoanBalance + totalCreditCardBalance;

  const netWorth = totalAssets - totalLiabilities;

  return {
    assets: {
      accounts: totalAccountBalance,
      investments: totalInvestmentValue,
      total: totalAssets,
    },
    liabilities: {
      loans: totalLoanBalance,
      creditCards: totalCreditCardBalance,
      total: totalLiabilities,
    },
    netWorth,
  };
}

// Tool 10: Get Credit Cards
async function get_credit_cards(userId: string, _input: any) {
  const creditCards = await prisma.creditCard.findMany({
    where: { userId, isActive: true },
    orderBy: { dueDate: 'asc' },
  });

  const cardsWithUtilization = creditCards.map((card) => {
    const utilization = card.creditLimit > 0 ? (card.currentBalance / card.creditLimit) * 100 : 0;
    const availableCredit = card.creditLimit - card.currentBalance;

    return {
      id: card.id,
      name: card.name,
      lastFourDigits: card.lastFourDigits,
      cardType: card.cardType,
      issuer: card.issuer,
      creditLimit: card.creditLimit,
      currentBalance: card.currentBalance,
      availableCredit,
      utilization,
      apr: card.apr,
      annualFee: card.annualFee,
      dueDate: card.dueDate,
      minimumPayment: card.minimumPayment,
    };
  });

  const totalCreditLimit = cardsWithUtilization.reduce((sum, card) => sum + card.creditLimit, 0);
  const totalUsed = cardsWithUtilization.reduce((sum, card) => sum + card.currentBalance, 0);
  const overallUtilization = totalCreditLimit > 0 ? (totalUsed / totalCreditLimit) * 100 : 0;

  return {
    creditCards: cardsWithUtilization,
    totalCards: cardsWithUtilization.length,
    totalCreditLimit,
    totalUsed,
    totalAvailable: totalCreditLimit - totalUsed,
    overallUtilization,
  };
}

// Tool 11: Get Credit Health
async function get_credit_health(userId: string, _input: any) {
  const latestHealth = await prisma.creditHealth.findFirst({
    where: { userId },
    orderBy: { reportDate: 'desc' },
  });

  if (!latestHealth) {
    return { message: 'No credit health data available. Add your credit score manually.' };
  }

  return {
    creditScore: latestHealth.creditScore,
    creditUtilization: latestHealth.creditUtilization,
    totalCreditLimit: latestHealth.totalCreditLimit,
    totalCreditUsed: latestHealth.totalCreditUsed,
    onTimePayments: latestHealth.onTimePayments,
    missedPayments: latestHealth.missedPayments,
    oldestAccountAge: latestHealth.oldestAccountAge,
    reportDate: latestHealth.reportDate,
    source: latestHealth.source,
    notes: latestHealth.notes,
  };
}

// Tool 12: Get Risk Profile
async function get_risk_profile(userId: string, _input: any) {
  const riskProfile = await prisma.riskProfile.findUnique({
    where: { userId },
  });

  if (!riskProfile) {
    return { message: 'No risk profile found. Complete the risk assessment questionnaire.' };
  }

  return {
    riskScore: riskProfile.riskScore,
    riskCategory: riskProfile.riskCategory,
    investmentHorizon: riskProfile.investmentHorizon,
    monthlyIncome: riskProfile.monthlyIncome,
    monthlySavings: riskProfile.monthlySavings,
    assessedAt: riskProfile.assessedAt,
  };
}

// Tool 13: Calculate Financial Ratios
async function calculate_financial_ratios(userId: string, input: any) {
  const months = input.months || 3;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get transactions for period
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate },
    },
    include: {
      category: { select: { name: true } },
    },
  });

  const totalIncome = transactions
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const savingsAmount = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (savingsAmount / totalIncome) * 100 : 0;

  // Monthly averages
  const monthlyIncome = totalIncome / months;
  const monthlyExpense = totalExpense / months;

  // Emergency fund (savings account balance / monthly expenses)
  const savingsAccounts = await prisma.account.findMany({
    where: { userId, type: 'SAVINGS', isActive: true },
    select: { balance: true },
  });
  const totalSavingsBalance = savingsAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const emergencyFundMonths = monthlyExpense > 0 ? totalSavingsBalance / monthlyExpense : 0;

  // Debt-to-income ratio
  const loans = await prisma.loan.findMany({
    where: { userId, isActive: true },
    select: { emiAmount: true },
  });
  const monthlyDebtPayment = loans.reduce((sum, loan) => sum + (loan.emiAmount || 0), 0);
  const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyDebtPayment / monthlyIncome) * 100 : 0;

  // Top expense categories
  const categorySpending: Record<string, number> = {};
  transactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .forEach((t) => {
      const catName = t.category?.name || 'Uncategorized';
      categorySpending[catName] = (categorySpending[catName] || 0) + t.amount;
    });

  const topExpenseCategories = Object.entries(categorySpending)
    .map(([name, amount]) => ({ category: name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    period: { months, startDate: startDate.toISOString() },
    income: {
      total: totalIncome,
      monthly: monthlyIncome,
    },
    expense: {
      total: totalExpense,
      monthly: monthlyExpense,
    },
    savingsRate,
    savingsAmount,
    emergencyFundMonths,
    debtToIncomeRatio,
    topExpenseCategories,
  };
}

// Tool 14: Search Transactions
async function search_transactions(userId: string, input: any) {
  const { query, limit = 20 } = input;

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      OR: [
        { description: { contains: query } },
        { merchantName: { contains: query } },
      ],
    },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: { select: { id: true, name: true, type: true } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  });

  return {
    transactions,
    count: transactions.length,
    query,
  };
}

// Main executor function
export async function executeToolCall(
  userId: string,
  toolName: string,
  input: any
): Promise<any> {
  const tools: Record<string, (userId: string, input: any) => Promise<any>> = {
    get_account_summary,
    get_transactions,
    get_spending_by_category,
    get_monthly_trends,
    get_budget_status,
    get_goals_progress,
    get_investment_portfolio,
    get_loan_details,
    get_net_worth,
    get_credit_cards,
    get_credit_health,
    get_risk_profile,
    calculate_financial_ratios,
    search_transactions,
  };

  const tool = tools[toolName];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return await tool(userId, input || {});
}

// ============================================
// CRUD TOOLS INTEGRATION
// ============================================

// Import CRUD tools
import {
  create_account_tool, createAccount,
  create_transaction_tool, createTransaction,
  create_budget_tool, createBudget,
  create_goal_tool, createGoal,
  update_transaction_tool, updateTransaction,
  update_account_balance_tool, updateAccountBalance,
  delete_transaction_tool, deleteTransaction
} from './ai-tools-crud';

// Export individual CRUD tool definitions for use in other files
export {
  create_account_tool, createAccount,
  create_transaction_tool, createTransaction,
  create_budget_tool, createBudget,
  create_goal_tool, createGoal,
  update_transaction_tool, updateTransaction,
  update_account_balance_tool, updateAccountBalance,
  delete_transaction_tool, deleteTransaction
};

// Export read tools array for combining
export const READ_TOOLS = [
  {
    name: "get_account_summary",
    description: "Get all bank accounts with current balances, types, and status. Use when user asks about accounts, balances, or where their money is.",
    input_schema: { type: "object" as const, properties: {}, required: [] }
  },
  {
    name: "get_transactions",
    description: "Get user transactions with optional filters. Use to analyze spending, find specific transactions, or review activity.",
    input_schema: {
      type: "object" as const,
      properties: {
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" },
        type: { type: "string", enum: ["INCOME", "EXPENSE", "TRANSFER"], description: "Transaction type" },
        categoryName: { type: "string", description: "Category name filter" },
        minAmount: { type: "number", description: "Minimum amount" },
        maxAmount: { type: "number", description: "Maximum amount" },
        limit: { type: "number", description: "Max results (default 50)" }
      },
      required: []
    }
  },
  {
    name: "get_spending_by_category",
    description: "Get spending breakdown by category for a period. Use for spending analysis and budget comparisons.",
    input_schema: {
      type: "object" as const,
      properties: {
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" }
      },
      required: []
    }
  },
  {
    name: "get_monthly_trends",
    description: "Get monthly income and expense totals over time. Use for trend analysis and savings rate.",
    input_schema: {
      type: "object" as const,
      properties: { months: { type: "number", description: "Months to look back (default 6)" } },
      required: []
    }
  },
  {
    name: "get_budget_status",
    description: "Get all budgets with current spending vs budgeted amounts. Use for budget tracking questions.",
    input_schema: { type: "object" as const, properties: {}, required: [] }
  },
  {
    name: "get_goals_progress",
    description: "Get all financial goals with progress, targets, and deadlines.",
    input_schema: { type: "object" as const, properties: {}, required: [] }
  },
  {
    name: "get_investment_portfolio",
    description: "Get full investment portfolio with values, returns, and allocation.",
    input_schema: { type: "object" as const, properties: {}, required: [] }
  },
  {
    name: "get_loan_details",
    description: "Get all loans with balances, interest rates, EMIs, and payment history.",
    input_schema: { type: "object" as const, properties: {}, required: [] }
  },
  {
    name: "get_net_worth",
    description: "Calculate net worth: assets minus liabilities.",
    input_schema: { type: "object" as const, properties: {}, required: [] }
  },
  {
    name: "get_credit_cards",
    description: "Get credit cards with balances, limits, and utilization.",
    input_schema: { type: "object" as const, properties: {}, required: [] }
  },
  {
    name: "get_credit_health",
    description: "Get credit score and health metrics.",
    input_schema: { type: "object" as const, properties: {}, required: [] }
  },
  {
    name: "get_risk_profile",
    description: "Get user's investment risk profile and assessment.",
    input_schema: { type: "object" as const, properties: {}, required: [] }
  },
  {
    name: "calculate_financial_ratios",
    description: "Calculate savings rate, debt-to-income, emergency fund months, expense ratios.",
    input_schema: {
      type: "object" as const,
      properties: { months: { type: "number", description: "Months to analyze (default 3)" } },
      required: []
    }
  },
  {
    name: "search_transactions",
    description: "Search transactions by description keyword.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search term" },
        limit: { type: "number", description: "Max results (default 20)" }
      },
      required: ["query"]
    }
  }
];

// Export combined tools (read + write)
export const ALL_TOOLS = [
  ...READ_TOOLS,
  create_account_tool,
  create_transaction_tool,
  create_budget_tool,
  create_goal_tool,
  update_transaction_tool,
  update_account_balance_tool,
  delete_transaction_tool
];

// Export combined executor function
export async function executeAnyTool(userId: string, toolName: string, input: any): Promise<any> {
  // Read tools
  switch (toolName) {
    case 'get_account_summary': return get_account_summary(userId, input);
    case 'get_transactions': return get_transactions(userId, input);
    case 'get_spending_by_category': return get_spending_by_category(userId, input);
    case 'get_monthly_trends': return get_monthly_trends(userId, input);
    case 'get_budget_status': return get_budget_status(userId, input);
    case 'get_goals_progress': return get_goals_progress(userId, input);
    case 'get_investment_portfolio': return get_investment_portfolio(userId, input);
    case 'get_loan_details': return get_loan_details(userId, input);
    case 'get_net_worth': return get_net_worth(userId, input);
    case 'get_credit_cards': return get_credit_cards(userId, input);
    case 'get_credit_health': return get_credit_health(userId, input);
    case 'get_risk_profile': return get_risk_profile(userId, input);
    case 'calculate_financial_ratios': return calculate_financial_ratios(userId, input);
    case 'search_transactions': return search_transactions(userId, input);
  }

  // Write tools (CRUD)
  switch (toolName) {
    case 'create_account': return createAccount(userId, input);
    case 'create_transaction': return createTransaction(userId, input);
    case 'create_budget': return createBudget(userId, input);
    case 'create_goal': return createGoal(userId, input);
    case 'update_transaction': return updateTransaction(userId, input);
    case 'update_account_balance': return updateAccountBalance(userId, input);
    case 'delete_transaction': return deleteTransaction(userId, input);
  }

  throw new Error(`Unknown tool: ${toolName}`);
}
