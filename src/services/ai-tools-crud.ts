import prisma from '../lib/prisma';

// ============================================
// CREATE TOOLS
// ============================================

export const create_account_tool = {
  name: "create_account",
  description: "Create a new bank account, credit card, or investment account. Use when user wants to add a new financial account.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string" as const, description: "Account name" },
      type: { type: "string" as const, enum: ["SAVINGS", "CHECKING", "CREDIT_CARD", "INVESTMENT", "LOAN", "OTHER"], description: "Account type" },
      balance: { type: "number" as const, description: "Current balance" },
      institution: { type: "string" as const, description: "Bank or institution name" },
      accountNumber: { type: "string" as const, description: "Last 4 digits (optional)" }
    },
    required: ["name", "type", "balance", "institution"]
  }
};

export async function createAccount(userId: string, input: any) {
  const account = await prisma.account.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      balance: input.balance,
      institution: input.institution,
      accountNumber: input.accountNumber,
      currency: 'INR',
      isActive: true
    }
  });
  return { success: true, account, message: `Created ${input.name} account with ₹${input.balance.toLocaleString('en-IN')}` };
}

export const create_transaction_tool = {
  name: "create_transaction",
  description: "Record a new income or expense transaction.",
  input_schema: {
    type: "object" as const,
    properties: {
      amount: { type: "number" as const, description: "Transaction amount (always positive)" },
      type: { type: "string" as const, enum: ["INCOME", "EXPENSE", "TRANSFER"], description: "Transaction type" },
      description: { type: "string" as const, description: "Description" },
      accountId: { type: "string" as const, description: "Account ID" },
      categoryName: { type: "string" as const, description: "Category name" },
      date: { type: "string" as const, description: "Date (YYYY-MM-DD, default today)" }
    },
    required: ["amount", "type", "description", "accountId"]
  }
};

export async function createTransaction(userId: string, input: any) {
  // Find account
  const account = await prisma.account.findFirst({
    where: { id: input.accountId, userId }
  });
  if (!account) throw new Error('Account not found');

  // Find or create category
  let category = await prisma.category.findFirst({
    where: { userId, name: { contains: input.categoryName } }
  });
  if (!category) {
    category = await prisma.category.create({
      data: {
        userId,
        name: input.categoryName || 'Uncategorized',
        color: '#888888'
      }
    });
  }

  // Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      accountId: input.accountId,
      categoryId: category.id,
      amount: input.amount,
      type: input.type,
      description: input.description,
      date: input.date ? new Date(input.date) : new Date(),
      tags: '',
      isRecurring: false
    }
  });

  // Update account balance
  const balanceChange = input.type === 'INCOME' ? input.amount : -input.amount;
  await prisma.account.update({
    where: { id: input.accountId },
    data: { balance: { increment: balanceChange } }
  });

  return { success: true, transaction, message: `Recorded ${input.type.toLowerCase()} of ₹${input.amount.toLocaleString('en-IN')}` };
}

export const create_budget_tool = {
  name: "create_budget",
  description: "Create a new budget for a spending category.",
  input_schema: {
    type: "object" as const,
    properties: {
      categoryName: { type: "string" as const, description: "Category to budget for" },
      amount: { type: "number" as const, description: "Budget amount" },
      period: { type: "string" as const, enum: ["MONTHLY", "WEEKLY", "YEARLY"], default: "MONTHLY" }
    },
    required: ["categoryName", "amount"]
  }
};

export async function createBudget(userId: string, input: any) {
  // Find or create category
  let category = await prisma.category.findFirst({
    where: { userId, name: { contains: input.categoryName } }
  });
  if (!category) {
    category = await prisma.category.create({
      data: {
        userId,
        name: input.categoryName,
        color: '#888888'
      }
    });
  }

  const budget = await prisma.budget.create({
    data: {
      userId,
      categoryId: category.id,
      amount: input.amount,
      period: input.period || 'MONTHLY',
      startDate: new Date(),
      alertEnabled: true
    }
  });

  return { success: true, budget, message: `Created ${input.period || 'monthly'} budget of ₹${input.amount.toLocaleString('en-IN')} for ${input.categoryName}` };
}

export const create_goal_tool = {
  name: "create_goal",
  description: "Create a new savings goal.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string" as const, description: "Goal name" },
      targetAmount: { type: "number" as const, description: "Target amount" },
      deadline: { type: "string" as const, description: "Target date (YYYY-MM-DD, optional)" },
      category: { type: "string" as const, enum: ["EMERGENCY", "VACATION", "EDUCATION", "HOME", "VEHICLE", "RETIREMENT", "OTHER"], description: "Goal category" },
      priority: { type: "string" as const, enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" }
    },
    required: ["name", "targetAmount", "category"]
  }
};

export async function createGoal(userId: string, input: any) {
  const goal = await prisma.goal.create({
    data: {
      userId,
      name: input.name,
      targetAmount: input.targetAmount,
      currentAmount: 0,
      deadline: input.deadline ? new Date(input.deadline) : null,
      category: input.category,
      priority: input.priority || 'MEDIUM'
    }
  });
  return { success: true, goal, message: `Created goal "${input.name}" with target ₹${input.targetAmount.toLocaleString('en-IN')}` };
}

// ============================================
// UPDATE TOOLS
// ============================================

export const update_transaction_tool = {
  name: "update_transaction",
  description: "Update an existing transaction. Use for correcting amounts, changing categories, fixing dates.",
  input_schema: {
    type: "object" as const,
    properties: {
      transactionId: { type: "string" as const, description: "ID of transaction to update" },
      amount: { type: "number" as const, description: "New amount" },
      description: { type: "string" as const, description: "New description" },
      categoryName: { type: "string" as const, description: "New category" }
    },
    required: ["transactionId"]
  }
};

export async function updateTransaction(userId: string, input: any) {
  const existing = await prisma.transaction.findFirst({
    where: { id: input.transactionId, userId },
    include: { account: true }
  });
  if (!existing) throw new Error('Transaction not found');

  // Revert old balance change
  const oldChange = existing.type === 'INCOME' ? existing.amount : -existing.amount;
  await prisma.account.update({
    where: { id: existing.accountId },
    data: { balance: { decrement: oldChange } }
  });

  // Find new category if specified
  let categoryId = existing.categoryId;
  if (input.categoryName) {
    const category = await prisma.category.findFirst({
      where: { userId, name: { contains: input.categoryName } }
    });
    if (category) categoryId = category.id;
  }

  // Update transaction
  const transaction = await prisma.transaction.update({
    where: { id: input.transactionId },
    data: {
      amount: input.amount || existing.amount,
      description: input.description || existing.description,
      categoryId
    }
  });

  // Apply new balance change
  const newChange = existing.type === 'INCOME' ? (input.amount || existing.amount) : -(input.amount || existing.amount);
  await prisma.account.update({
    where: { id: existing.accountId },
    data: { balance: { increment: newChange } }
  });

  return { success: true, transaction, message: 'Transaction updated successfully' };
}

export const update_account_balance_tool = {
  name: "update_account_balance",
  description: "Update the balance of an account. Use for manual balance corrections.",
  input_schema: {
    type: "object" as const,
    properties: {
      accountId: { type: "string" as const, description: "Account ID" },
      newBalance: { type: "number" as const, description: "New balance amount" }
    },
    required: ["accountId", "newBalance"]
  }
};

export async function updateAccountBalance(userId: string, input: any) {
  const account = await prisma.account.update({
    where: { id: input.accountId, userId },
    data: { balance: input.newBalance }
  });
  return { success: true, account, message: `Updated ${account.name} balance to ₹${input.newBalance.toLocaleString('en-IN')}` };
}

// ============================================
// DELETE TOOLS
// ============================================

export const delete_transaction_tool = {
  name: "delete_transaction",
  description: "Delete a transaction. Use for removing duplicates or incorrect entries. Asks for confirmation first.",
  input_schema: {
    type: "object" as const,
    properties: {
      transactionId: { type: "string" as const, description: "ID of transaction to delete" },
      confirmed: { type: "boolean" as const, default: false, description: "User confirmation" }
    },
    required: ["transactionId"]
  }
};

export async function deleteTransaction(userId: string, input: any) {
  if (!input.confirmed) {
    const transaction = await prisma.transaction.findFirst({
      where: { id: input.transactionId, userId },
      include: { account: true }
    });
    if (!transaction) throw new Error('Transaction not found');
    return {
      success: false,
      requiresConfirmation: true,
      message: `Delete "${transaction.description}" for ₹${transaction.amount.toLocaleString('en-IN')}?`,
      transactionId: input.transactionId
    };
  }

  // Soft delete - actually delete for now (can add isDeleted flag later)
  const existing = await prisma.transaction.findFirst({
    where: { id: input.transactionId, userId }
  });
  if (!existing) throw new Error('Transaction not found');

  // Revert balance
  const balanceChange = existing.type === 'INCOME' ? -existing.amount : existing.amount;
  await prisma.account.update({
    where: { id: existing.accountId },
    data: { balance: { increment: balanceChange } }
  });

  await prisma.transaction.delete({ where: { id: input.transactionId } });
  return { success: true, message: 'Transaction deleted' };
}
