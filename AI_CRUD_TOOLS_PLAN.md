# AI CRUD Tools Implementation Plan

## Overview
Enable users to add, edit, and delete data in the Finance App through natural language conversation with the AI Advisor. Users can say things like:
- "Add a new transaction: ₹500 for groceries today"
- "Update my salary to ₹75,000 per month"
- "Delete that duplicate transaction from yesterday"
- "Create a new budget of ₹10,000 for dining"

## Current State
- AI Chat has 14 **read-only** tools for analysis
- All data modifications currently require manual form entry
- User must navigate to specific pages to add/edit data

## Target State
- AI can perform **full CRUD** operations via tool calling
- Natural language becomes the primary interface for data entry
- AI validates data, confirms actions, handles errors gracefully

---

## Phase 1: Write Tools (Create Data)

### 1.1 Account Management

**Tool: `create_account`**
```typescript
{
  name: "create_account",
  description: "Create a new bank account, credit card, or investment account. Use when user wants to add a new financial account.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Account name (e.g., 'HDFC Savings', 'ICICI Credit Card')" },
      type: { type: "string", enum: ["SAVINGS", "CHECKING", "CREDIT_CARD", "INVESTMENT", "LOAN", "OTHER"], description: "Account type" },
      balance: { type: "number", description: "Current balance (negative for loans/credit cards)" },
      institution: { type: "string", description: "Bank or institution name" },
      accountNumber: { type: "string", description: "Last 4 digits of account number (optional)" },
      currency: { type: "string", default: "INR", description: "Currency code" }
    },
    required: ["name", "type", "balance", "institution"]
  }
}
```

**Example Interactions:**
- User: "Add my new HDFC savings account with ₹50,000"
- AI: "I'll create that account for you." → calls `create_account`
- User: "Open a credit card account for my ICICI card with ₹25,000 limit"
- AI: "Creating ICICI credit card account..." → calls `create_account` with type CREDIT_CARD

### 1.2 Transaction Management

**Tool: `create_transaction`**
```typescript
{
  name: "create_transaction",
  description: "Record a new income or expense transaction. Use for adding purchases, salary, transfers, etc.",
  input_schema: {
    type: "object",
    properties: {
      amount: { type: "number", description: "Transaction amount (always positive)" },
      type: { type: "string", enum: ["INCOME", "EXPENSE", "TRANSFER"], description: "Transaction type" },
      description: { type: "string", description: "Transaction description" },
      accountId: { type: "string", description: "Account ID (if known, else AI will ask)" },
      categoryName: { type: "string", description: "Category name (e.g., 'Food & Dining', 'Salary')" },
      date: { type: "string", description: "Transaction date (YYYY-MM-DD, default today)" },
      tags: { type: "array", items: { type: "string" }, description: "Tags for the transaction" },
      isRecurring: { type: "boolean", default: false, description: "Is this a recurring transaction?" }
    },
    required: ["amount", "type", "description"]
  }
}
```

**Example Interactions:**
- User: "I spent ₹450 on lunch at Domino's today"
- AI: "Adding expense of ₹450 for Food & Dining..." → calls `create_transaction`
- User: "Record my monthly salary of ₹85,000 credited yesterday"
- AI: "Recording salary income..." → calls `create_transaction` with type INCOME

### 1.3 Budget Creation

**Tool: `create_budget`**
```typescript
{
  name: "create_budget",
  description: "Create a new budget for a spending category. Use when user wants to set spending limits.",
  input_schema: {
    type: "object",
    properties: {
      categoryName: { type: "string", description: "Category to budget for" },
      amount: { type: "number", description: "Budget amount" },
      period: { type: "string", enum: ["MONTHLY", "WEEKLY", "YEARLY"], default: "MONTHLY" },
      startDate: { type: "string", description: "Budget start date (YYYY-MM-DD)" },
      notes: { type: "string", description: "Optional notes about the budget" }
    },
    required: ["categoryName", "amount"]
  }
}
```

**Tool: `create_goal`**
```typescript
{
  name: "create_goal",
  description: "Create a new savings goal. Use for setting financial targets like emergency fund, vacation, etc.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Goal name (e.g., 'Emergency Fund', 'Vacation to Goa')" },
      targetAmount: { type: "number", description: "Target amount to save" },
      deadline: { type: "string", description: "Target date (YYYY-MM-DD, optional)" },
      category: { type: "string", enum: ["EMERGENCY", "VACATION", "EDUCATION", "HOME", "VEHICLE", "RETIREMENT", "OTHER"], description: "Goal category" },
      initialContribution: { type: "number", default: 0, description: "Initial amount to contribute" },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" }
    },
    required: ["name", "targetAmount", "category"]
  }
}
```

### 1.4 Investment & Loan Tracking

**Tool: `create_investment`**
```typescript
{
  name: "create_investment",
  description: "Add a new investment holding. Use for stocks, mutual funds, FDs, etc.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Investment name (e.g., 'Nifty 50 ETF')" },
      type: { type: "string", enum: ["STOCK", "MUTUAL_FUND", "ETF", "FD", "BOND", "REAL_ESTATE", "CRYPTO", "OTHER"], description: "Investment type" },
      platform: { type: "string", description: "Platform/broker (e.g., 'Zerodha', 'Groww')" },
      investedAmount: { type: "number", description: "Amount invested" },
      currentValue: { type: "number", description: "Current market value" },
      quantity: { type: "number", description: "Units/shares held" },
      purchaseDate: { type: "string", description: "Purchase date (YYYY-MM-DD)" }
    },
    required: ["name", "type", "platform", "investedAmount", "currentValue"]
  }
}
```

**Tool: `create_loan`**
```typescript
{
  name: "create_loan",
  description: "Add a new loan or debt. Use for tracking home loans, personal loans, etc.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Loan name (e.g., 'Home Loan - HDFC')" },
      type: { type: "string", enum: ["HOME", "CAR", "PERSONAL", "EDUCATION", "BUSINESS", "CREDIT_CARD", "OTHER"], description: "Loan type" },
      principalAmount: { type: "number", description: "Original loan amount" },
      outstandingBalance: { type: "number", description: "Current remaining balance" },
      interestRate: { type: "number", description: "Annual interest rate (%)" },
      monthlyEmi: { type: "number", description: "Monthly EMI amount" },
      tenure: { type: "number", description: "Total tenure in months" },
      startDate: { type: "string", description: "Loan start date (YYYY-MM-DD)" },
      lender: { type: "string", description: "Bank or lending institution" }
    },
    required: ["name", "type", "principalAmount", "outstandingBalance", "interestRate", "monthlyEmi", "lender"]
  }
}
```

---

## Phase 2: Update Tools (Edit Data)

### 2.1 Generic Update Pattern

All update tools follow this pattern:
1. Accept `id` of the entity to update
2. Accept partial data (only fields being changed)
3. Validate the update
4. Return updated entity

**Tool: `update_transaction`**
```typescript
{
  name: "update_transaction",
  description: "Update an existing transaction. Use for correcting amounts, changing categories, fixing dates.",
  input_schema: {
    type: "object",
    properties: {
      transactionId: { type: "string", description: "ID of transaction to update" },
      amount: { type: "number", description: "New amount (if changing)" },
      description: { type: "string", description: "New description" },
      categoryName: { type: "string", description: "New category" },
      date: { type: "string", description: "New date (YYYY-MM-DD)" },
      tags: { type: "array", items: { type: "string" }, description: "Replace tags" }
    },
    required: ["transactionId"]
  }
}
```

**Tool: `update_account_balance`**
```typescript
{
  name: "update_account_balance",
  description: "Update the balance of an account. Use for manual balance corrections or reconciliation.",
  input_schema: {
    type: "object",
    properties: {
      accountId: { type: "string", description: "Account ID" },
      newBalance: { type: "number", description: "New balance amount" },
      reason: { type: "string", description: "Reason for balance update (optional)" }
    },
    required: ["accountId", "newBalance"]
  }
}
```

**Tool: `update_budget`**
```typescript
{
  name: "update_budget",
  description: "Modify an existing budget. Use for increasing/decreasing budget limits.",
  input_schema: {
    type: "object",
    properties: {
      budgetId: { type: "string", description: "Budget ID" },
      newAmount: { type: "number", description: "New budget amount" },
      period: { type: "string", enum: ["MONTHLY", "WEEKLY", "YEARLY"] }
    },
    required: ["budgetId", "newAmount"]
  }
}
```

**Tool: `update_goal`**
```typescript
{
  name: "update_goal",
  description: "Update a savings goal. Use for changing target amount, deadline, or adding contributions.",
  input_schema: {
    type: "object",
    properties: {
      goalId: { type: "string", description: "Goal ID" },
      targetAmount: { type: "number", description: "New target amount" },
      deadline: { type: "string", description: "New deadline (YYYY-MM-DD)" },
      addContribution: { type: "number", description: "Amount to add to current savings" },
      status: { type: "string", enum: ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] }
    },
    required: ["goalId"]
  }
}
```

**Tool: `update_investment_value`**
```typescript
{
  name: "update_investment_value",
  description: "Update the current value of an investment. Use for manual NAV updates.",
  input_schema: {
    type: "object",
    properties: {
      investmentId: { type: "string", description: "Investment ID" },
      currentValue: { type: "number", description: "New current value" },
      notes: { type: "string", description: "Notes about the update" }
    },
    required: ["investmentId", "currentValue"]
  }
}
```

---

## Phase 3: Delete Tools (Remove Data)

### 3.1 Soft Delete Pattern

All deletions should be **soft deletes** (mark as deleted) or require explicit confirmation:

**Tool: `delete_transaction`**
```typescript
{
  name: "delete_transaction",
  description: "Delete a transaction. Use for removing duplicates or incorrect entries. Asks for confirmation first.",
  input_schema: {
    type: "object",
    properties: {
      transactionId: { type: "string", description: "ID of transaction to delete" },
      reason: { type: "string", description: "Reason for deletion (optional)" },
      confirmed: { type: "boolean", default: false, description: "User confirmation" }
    },
    required: ["transactionId"]
  }
}
```

**AI Behavior for Deletion:**
1. User: "Delete that ₹500 transaction from yesterday"
2. AI: searches recent transactions → finds match
3. AI: "I'll delete 'Payment to Swiggy - ₹500' from yesterday. Confirm?"
4. User: "Yes, delete it"
5. AI: calls `delete_transaction` with `confirmed: true`

**Tool: `delete_account`**
```typescript
{
  name: "delete_account",
  description: "Close/delete an account. Only allowed if balance is zero and no pending transactions. Requires confirmation.",
  input_schema: {
    type: "object",
    properties: {
      accountId: { type: "string", description: "Account ID to delete" },
      confirmed: { type: "boolean", default: false, description: "User confirmation" },
      transferBalanceTo: { type: "string", description: "Account ID to transfer balance to (if any)" }
    },
    required: ["accountId"]
  }
}
```

**Tool: `delete_budget`**
```typescript
{
  name: "delete_budget",
  description: "Remove a budget. Use when user no longer wants to track spending for a category.",
  input_schema: {
    type: "object",
    properties: {
      budgetId: { type: "string", description: "Budget ID to delete" },
      confirmed: { type: "boolean", default: false }
    },
    required: ["budgetId"]
  }
}
```

**Tool: `delete_goal`**
```typescript
{
  name: "delete_goal",
  description: "Delete a savings goal. Use for cancelled or completed goals user wants to remove.",
  input_schema: {
    type: "object",
    properties: {
      goalId: { type: "string", description: "Goal ID to delete" },
      confirmed: { type: "boolean", default: false },
      transferSavingsTo: { type: "string", description: "Goal ID to transfer saved amount to (optional)" }
    },
    required: ["goalId"]
  }
}
```

---

## Phase 4: Bulk Operations

### 4.1 Bulk Create

**Tool: `bulk_create_transactions`**
```typescript
{
  name: "bulk_create_transactions",
  description: "Create multiple transactions at once. Use for importing multiple entries or recording multiple expenses.",
  input_schema: {
    type: "object",
    properties: {
      transactions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            amount: { type: "number" },
            type: { type: "string", enum: ["INCOME", "EXPENSE", "TRANSFER"] },
            description: { type: "string" },
            categoryName: { type: "string" },
            date: { type: "string" }
          },
          required: ["amount", "type", "description"]
        }
      }
    },
    required: ["transactions"]
  }
}
```

### 4.2 Bulk Categorization

**Tool: `bulk_categorize_transactions`**
```typescript
{
  name: "bulk_categorize_transactions",
  description: "Categorize multiple uncategorized transactions at once. AI will suggest categories based on descriptions.",
  input_schema: {
    type: "object",
    properties: {
      categoryName: { type: "string", description: "Category to apply" },
      transactionIds: { type: "array", items: { type: "string" }, description: "List of transaction IDs" },
      searchQuery: { type: "string", description: "Alternative: categorize all matching this search" }
    },
    required: ["categoryName"]
  }
}
```

---

## Phase 5: Smart AI Behaviors

### 5.1 Context Awareness

**Account Resolution:**
- If user says "my HDFC account" without specifying, AI should:
  1. Search accounts for "HDFC"
  2. If one match: use it
  3. If multiple: ask "Which HDFC account? Savings (****1234) or Credit Card (****5678)?"

**Category Resolution:**
- User: "Add a food expense"
- AI: Search categories → find "Food & Dining" → use it
- If ambiguous: "Did you mean 'Food & Dining' or 'Groceries'?"

**Date Parsing:**
- "today" → current date
- "yesterday" → yesterday
- "last Friday" → calculate date
- "March 5th" → current year, March 5

### 5.2 Data Validation & Confirmation

**High-Value Transactions:**
- Amount > ₹50,000: "This is a large transaction of ₹75,000. Confirm?"
- Deletions: Always confirm
- Account deletions: Extra warning about data loss

**Duplicate Detection:**
- Before creating, check for similar transactions in last 7 days
- "Similar transaction found: ₹450 at Domino's on March 4. Create anyway?"

### 5.3 Conversational Flow

**Multi-Step Data Entry:**
```
User: "Add a new transaction"
AI: "Sure! What's the amount?"
User: "₹1200"
AI: "Got it. Is this income or expense?"
User: "Expense"
AI: "What was this for?"
User: "Petrol"
AI: "Which account?"
User: "HDFC credit card"
AI: "When was this?"
User: "Today"
AI: "Adding expense of ₹1,200 for Fuel on HDFC Credit Card. Confirm?"
User: "Yes"
AI: → calls create_transaction
```

---

## Phase 6: Implementation Steps

### Step 1: Backend API Extensions

Create new files in `src/services/ai-tools-crud.ts`:

```typescript
// Export all CRUD tool definitions
export const CRUD_TOOLS = [
  create_account_tool,
  create_transaction_tool,
  // ... all tools
];

// Export tool implementations
export async function executeCrudTool(
  userId: string,
  toolName: string,
  input: any
): Promise<any> {
  switch (toolName) {
    case 'create_account':
      return createAccount(userId, input);
    case 'create_transaction':
      return createTransaction(userId, input);
    // ... etc
  }
}
```

### Step 2: Update AI Service

Modify `src/services/ai-chat.service.ts`:

1. Import CRUD tools:
```typescript
import { CRUD_TOOLS, executeCrudTool } from './ai-tools-crud';
```

2. Merge with existing tools:
```typescript
const ALL_TOOLS = [...READ_TOOLS, ...CRUD_TOOLS];
```

3. Update system prompt to include write capabilities:
```typescript
const SYSTEM_PROMPT = `You are a smart Indian financial assistant...

You can help users:
- View their financial data (read-only tools)
- Add new accounts, transactions, budgets, goals (create tools)
- Update existing data (update tools)
- Delete incorrect entries (delete tools)

When adding data:
- Always confirm the action with the user before calling write tools
- Validate data (e.g., amounts should be positive, dates valid)
- Handle errors gracefully
- Ask for clarification if information is incomplete
`;
```

### Step 3: Add Permission System

Add to `src/middleware/auth.ts`:

```typescript
// Check if user has permission to modify data
export function requireWritePermission(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Could add role-based checks here
  // For now, all authenticated users can write
  next();
}
```

### Step 4: Frontend Confirmation Dialogs

Update `src/pages/Chat.tsx`:

```typescript
// Add confirmation state
const [pendingAction, setPendingAction] = useState<{
  toolName: string;
  input: any;
  description: string;
} | null>(null);

// Show confirmation dialog before destructive actions
{pendingAction && (
  <Dialog>
    <DialogTitle>Confirm Action</DialogTitle>
    <DialogContent>
      <Typography>{pendingAction.description}</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setPendingAction(null)}>Cancel</Button>
      <Button onClick={confirmAction} color="primary">Confirm</Button>
    </DialogActions>
  </Dialog>
)}
```

### Step 5: Audit Logging

Create `src/services/audit.ts`:

```typescript
export async function logDataChange(
  userId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: string,
  entityId: string,
  oldData?: any,
  newData?: any,
  reason?: string
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldData: oldData ? JSON.stringify(oldData) : null,
      newData: newData ? JSON.stringify(newData) : null,
      reason,
      createdAt: new Date(),
    },
  });
}
```

---

## Phase 7: Testing Plan

### Unit Tests

```typescript
// Test create_transaction tool
describe('create_transaction', () => {
  it('should create expense transaction', async () => {
    const result = await executeCrudTool(userId, 'create_transaction', {
      amount: 500,
      type: 'EXPENSE',
      description: 'Test expense',
      categoryName: 'Food & Dining'
    });
    expect(result.success).toBe(true);
    expect(result.transaction.amount).toBe(500);
  });
  
  it('should reject negative amounts', async () => {
    await expect(executeCrudTool(userId, 'create_transaction', {
      amount: -100,
      type: 'EXPENSE',
      description: 'Invalid'
    })).rejects.toThrow();
  });
});
```

### Integration Tests

1. **End-to-end conversation flow:**
   - User: "Add salary of ₹75,000"
   - AI: Should create transaction
   - Verify in database

2. **Confirmation flow:**
   - User: "Delete transaction xyz"
   - AI: Should ask for confirmation
   - User confirms
   - Verify soft delete

3. **Error handling:**
   - Invalid account ID
   - Duplicate transaction
   - Insufficient funds for transfer

---

## Security Considerations

1. **Data Ownership:** All CRUD operations must include `userId` check
2. **Rate Limiting:** Add stricter limits for write operations (e.g., 30 writes/hour)
3. **Validation:** Server-side validation for all inputs (not just client-side)
4. **Audit Trail:** Log all data modifications with before/after state
5. **Soft Deletes:** Never hard-delete financial data
6. **Confirmation:** Require explicit confirmation for destructive operations
7. **Data Sanitization:** Prevent SQL injection, XSS in descriptions

---

## Cost Implications

Current: ~$0.01-0.03 per message (read-only)
With CRUD: ~$0.02-0.05 per message (more complex prompts, multiple tool calls)

Optimization:
- Batch operations when possible
- Cache category/account lists
- Use cheaper models for simple confirmations

---

## Timeline Estimate

| Phase | Duration | Description |
|-------|----------|-------------|
| Phase 1 | 4 hours | Create tools (accounts, transactions, budgets, goals) |
| Phase 2 | 3 hours | Update tools |
| Phase 3 | 2 hours | Delete tools |
| Phase 4 | 2 hours | Bulk operations |
| Phase 5 | 2 hours | Smart behaviors, context resolution |
| Phase 6 | 2 hours | Audit logging, permissions |
| Phase 7 | 3 hours | Testing, bug fixes |
| **Total** | **18 hours** | (~2-3 days of work) |

---

## Success Metrics

1. **User Adoption:** % of transactions added via AI vs manual entry
2. **Accuracy:** Error rate in AI-created data
3. **Efficiency:** Time saved vs manual data entry
4. **Satisfaction:** User feedback on AI chat experience

---

## Next Steps

1. Review this plan
2. Prioritize which tools to build first (suggest: create_transaction, create_account)
3. Deploy sub-agents for implementation
4. Test thoroughly
5. Monitor usage and iterate

**Ready to proceed?** Say which tools to prioritize and I'll deploy the implementation agents!
