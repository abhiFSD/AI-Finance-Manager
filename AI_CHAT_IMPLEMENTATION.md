# AI Financial Advisor Chat — Implementation Plan

## Overview
Add an AI-powered chat system to the Finance App using **Claude Sonnet 4 (claude-sonnet-4-5)** with tool calling. The AI assistant can access all user financial data through tools, analyze spending patterns, provide advice, and answer questions about their finances.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Frontend                        │
│  ┌─────────────────────────────────────────┐    │
│  │         ChatWidget.tsx                   │    │
│  │  ┌──────────────────────────────────┐   │    │
│  │  │  Chat Messages (scrollable)      │   │    │
│  │  │  - User messages                 │   │    │
│  │  │  - AI responses (markdown)       │   │    │
│  │  │  - Tool call indicators          │   │    │
│  │  └──────────────────────────────────┘   │    │
│  │  ┌──────────────────────────────────┐   │    │
│  │  │  Input box + Send button         │   │    │
│  │  └──────────────────────────────────┘   │    │
│  └─────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────┘
                       │ POST /api/chat
                       │ { message, conversationId }
                       ▼
┌─────────────────────────────────────────────────┐
│                  Backend                         │
│  ┌─────────────────────────────────────────┐    │
│  │         /api/chat route                  │    │
│  │                                          │    │
│  │  1. Receive user message                 │    │
│  │  2. Build system prompt + tools          │    │
│  │  3. Call Claude API with tools           │    │
│  │  4. If tool_use → execute tool           │    │
│  │  5. Send tool_result back to Claude      │    │
│  │  6. Repeat 4-5 until text response       │    │
│  │  7. Return final response to frontend    │    │
│  └──────────────┬──────────────────────────┘    │
│                  │                                │
│  ┌───────────────▼──────────────────────────┐   │
│  │         Tool Executor                     │   │
│  │                                           │   │
│  │  Executes tools against Prisma DB         │   │
│  │  using the authenticated user's ID        │   │
│  │  (tools can ONLY access that user's data) │   │
│  └───────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│            Anthropic Messages API                │
│  POST https://api.anthropic.com/v1/messages      │
│  model: claude-sonnet-4-5                        │
│  tools: [...tool definitions]                    │
│  messages: [...conversation history]             │
└─────────────────────────────────────────────────┘
```

---

## Tool Definitions (14 Tools)

These are the tools Claude will have access to. Each tool queries the user's data from our existing Prisma database.

### 1. `get_account_summary`
**Description:** Get overview of all user bank accounts with balances
```json
{
  "name": "get_account_summary",
  "description": "Get all bank accounts with their current balances, types, and status. Use this when the user asks about their accounts, balances, or where their money is.",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```
**Backend:** `prisma.account.findMany({ where: { userId } })`

### 2. `get_transactions`
**Description:** Search and filter transactions
```json
{
  "name": "get_transactions",
  "description": "Get user's transactions with optional filters. Use this to analyze spending, find specific transactions, or review financial activity.",
  "input_schema": {
    "type": "object",
    "properties": {
      "startDate": { "type": "string", "description": "Start date (YYYY-MM-DD)" },
      "endDate": { "type": "string", "description": "End date (YYYY-MM-DD)" },
      "type": { "type": "string", "enum": ["INCOME", "EXPENSE", "TRANSFER"], "description": "Transaction type filter" },
      "categoryName": { "type": "string", "description": "Category name to filter by (e.g., 'Food & Dining')" },
      "accountId": { "type": "string", "description": "Filter by specific account ID" },
      "minAmount": { "type": "number", "description": "Minimum transaction amount" },
      "maxAmount": { "type": "number", "description": "Maximum transaction amount" },
      "limit": { "type": "number", "description": "Max results (default 50)" }
    }
  }
}
```
**Backend:** Dynamic Prisma query with filters

### 3. `get_spending_by_category`
**Description:** Get spending breakdown by category for a time period
```json
{
  "name": "get_spending_by_category",
  "description": "Get total spending grouped by category for a given period. Use this for spending analysis, budget comparisons, and understanding where money goes.",
  "input_schema": {
    "type": "object",
    "properties": {
      "startDate": { "type": "string", "description": "Start date (YYYY-MM-DD)" },
      "endDate": { "type": "string", "description": "End date (YYYY-MM-DD)" },
      "type": { "type": "string", "enum": ["INCOME", "EXPENSE"], "description": "Transaction type (default: EXPENSE)" }
    }
  }
}
```
**Backend:** Group by categoryId with sum aggregation

### 4. `get_monthly_trends`
**Description:** Get income vs expense trends over months
```json
{
  "name": "get_monthly_trends",
  "description": "Get monthly income and expense totals over time. Use this for trend analysis, savings rate, and month-over-month comparisons.",
  "input_schema": {
    "type": "object",
    "properties": {
      "months": { "type": "number", "description": "Number of months to look back (default: 6)" }
    }
  }
}
```
**Backend:** Group transactions by month, sum income/expense

### 5. `get_budget_status`
**Description:** Get all budgets with current spending vs limits
```json
{
  "name": "get_budget_status",
  "description": "Get all budgets with how much has been spent vs the budgeted amount. Use this when user asks about budgets, overspending, or financial discipline.",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```
**Backend:** Fetch budgets + calculate spent from transactions in current period

### 6. `get_goals_progress`
**Description:** Get all financial goals with progress
```json
{
  "name": "get_goals_progress",
  "description": "Get all financial goals with current progress, target amounts, and deadlines. Use when user asks about goals, savings targets, or financial planning.",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```
**Backend:** `prisma.goal.findMany({ where: { userId }, include: { investments: true } })`

### 7. `get_investment_portfolio`
**Description:** Get full investment portfolio with returns
```json
{
  "name": "get_investment_portfolio",
  "description": "Get all investments with current values, returns, and asset allocation. Use for investment analysis, portfolio review, or wealth tracking.",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```
**Backend:** Fetch investments + calculate total returns, allocation %

### 8. `get_loan_details`
**Description:** Get all loans with EMI and payoff info
```json
{
  "name": "get_loan_details",
  "description": "Get all loans with outstanding balance, interest rates, EMI amounts, and payment history. Use for debt analysis and payoff planning.",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```
**Backend:** `prisma.loan.findMany({ where: { userId }, include: { payments: true } })`

### 9. `get_net_worth`
**Description:** Calculate current net worth
```json
{
  "name": "get_net_worth",
  "description": "Calculate total net worth: assets (accounts + investments) minus liabilities (loans + credit card debt). Use when user asks about overall financial position.",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```
**Backend:** Sum accounts + investments - loans - credit card balances

### 10. `get_credit_cards`
**Description:** Get credit card details and utilization
```json
{
  "name": "get_credit_cards",
  "description": "Get all credit cards with balances, limits, utilization rates, and due dates. Use for credit management questions.",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```
**Backend:** `prisma.creditCard.findMany({ where: { userId } })`

### 11. `get_credit_health`
**Description:** Get credit score and health metrics
```json
{
  "name": "get_credit_health",
  "description": "Get latest credit score, utilization, payment history, and credit health metrics.",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```
**Backend:** `prisma.creditHealth.findFirst({ where: { userId }, orderBy: { reportDate: 'desc' } })`

### 12. `get_risk_profile`
**Description:** Get user's investment risk profile
```json
{
  "name": "get_risk_profile",
  "description": "Get user's risk assessment profile including risk score, category, and investment horizon.",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```
**Backend:** `prisma.riskProfile.findUnique({ where: { userId } })`

### 13. `calculate_financial_ratios`
**Description:** Calculate key financial health ratios
```json
{
  "name": "calculate_financial_ratios",
  "description": "Calculate key financial ratios: savings rate, debt-to-income ratio, emergency fund coverage months, expense ratio by category. Use for financial health assessment.",
  "input_schema": {
    "type": "object",
    "properties": {
      "months": { "type": "number", "description": "Number of months to analyze (default: 3)" }
    }
  }
}
```
**Backend:** Compute ratios from transaction data

### 14. `search_transactions`
**Description:** Full-text search through transactions
```json
{
  "name": "search_transactions",
  "description": "Search transactions by description keyword. Use when user asks about specific merchants, payments, or transaction descriptions.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search term to find in transaction descriptions" },
      "limit": { "type": "number", "description": "Max results (default 20)" }
    },
    "required": ["query"]
  }
}
```
**Backend:** `prisma.transaction.findMany({ where: { description: { contains: query } } })`

---

## Backend Implementation

### New Files to Create

#### 1. `src/services/ai-chat.service.ts` — Core AI Chat Service
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a smart, friendly Indian financial advisor embedded in a personal finance app. You have access to the user's complete financial data through tools.

Guidelines:
- Always use tools to fetch real data before answering financial questions
- Use ₹ (Indian Rupees) for all amounts
- Format large numbers in Indian style (lakhs, crores): ₹1,50,000 = 1.5 lakhs
- Be specific with numbers — don't approximate when you have exact data
- Provide actionable advice, not just data dumps
- Compare against Indian benchmarks (e.g., 50-30-20 rule, 6 months emergency fund)
- Be conversational and supportive, not preachy
- If asked about something you can't determine from the data, say so honestly
- When analyzing spending, always consider Indian cost-of-living context`;

const TOOLS: Anthropic.Tool[] = [
  // ... all 14 tool definitions from above
];

export async function chat(userId: string, message: string, conversationHistory: any[]) {
  // Build messages array
  const messages = [
    ...conversationHistory,
    { role: 'user', content: message }
  ];

  // Call Claude with tools
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages,
  });

  // Tool use loop — keep going until we get a text response
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    const toolResults = [];

    for (const toolUse of toolUseBlocks) {
      const result = await executeToolCall(userId, toolUse.name, toolUse.input);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }

    // Send tool results back to Claude
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });
  }

  // Extract text response
  const textContent = response.content.find(b => b.type === 'text');
  return {
    response: textContent?.text || 'I couldn\'t generate a response.',
    toolsUsed: messages.filter(m => m.role === 'user' && Array.isArray(m.content)).length,
    usage: response.usage,
  };
}
```

#### 2. `src/services/ai-tools.ts` — Tool Execution Layer
```typescript
// Maps tool names to Prisma queries
// Each tool function receives (userId, input) and returns data
// ALL queries are scoped to userId for security

export async function executeToolCall(userId: string, toolName: string, input: any) {
  switch (toolName) {
    case 'get_account_summary':
      return getAccountSummary(userId);
    case 'get_transactions':
      return getTransactions(userId, input);
    case 'get_spending_by_category':
      return getSpendingByCategory(userId, input);
    // ... etc for all 14 tools
  }
}

async function getAccountSummary(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
    select: { id: true, name: true, type: true, balance: true, currency: true },
  });
  return { accounts, total: accounts.reduce((s, a) => s + a.balance, 0) };
}

// ... implementations for all tools
```

#### 3. `src/api/chat.ts` — Chat API Route
```typescript
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { chat } from '../services/ai-chat.service';
import { prisma } from '../lib/prisma';

const router = express.Router();
router.use(authenticateToken);

// Store conversations in memory (or add a Conversation model to Prisma)
const conversations = new Map<string, any[]>();

router.post('/', async (req, res) => {
  const userId = req.user!.id;
  const { message, conversationId } = req.body;

  // Get or create conversation history
  const convKey = conversationId || `${userId}_${Date.now()}`;
  const history = conversations.get(convKey) || [];

  try {
    const result = await chat(userId, message, history);

    // Save to history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: result.response });
    conversations.set(convKey, history);

    // Trim history if too long (keep last 20 exchanges)
    if (history.length > 40) {
      conversations.set(convKey, history.slice(-40));
    }

    res.json({
      success: true,
      data: {
        response: result.response,
        conversationId: convKey,
        toolsUsed: result.toolsUsed,
        usage: result.usage,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, error: 'Failed to process chat' });
  }
});

// Get conversation history
router.get('/:conversationId', async (req, res) => {
  const history = conversations.get(req.params.conversationId) || [];
  res.json({ success: true, data: { messages: history } });
});

// Clear conversation
router.delete('/:conversationId', async (req, res) => {
  conversations.delete(req.params.conversationId);
  res.json({ success: true, message: 'Conversation cleared' });
});

export default router;
```

### Environment Variable
```bash
# Add to .env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

### Package to Install
```bash
cd ~/Local_Development/Finance_app
npm install @anthropic-ai/sdk
```

---

## Frontend Implementation

### New Files

#### 1. `src/services/chat.service.ts`
```typescript
class ChatService {
  sendMessage(message: string, conversationId?: string)
  getConversation(conversationId: string)
  clearConversation(conversationId: string)
}
```

#### 2. `src/components/ChatWidget.tsx`
A floating chat widget (bottom-right corner) that:
- Opens/closes with a chat bubble button (💬)
- Shows conversation messages with markdown rendering
- Has a text input + send button
- Shows "AI is thinking..." with typing indicator
- Shows which tools were called (expandable section)
- Has a "New Chat" button to clear history
- Persists across page navigation (lives in App.tsx)
- Responsive — full screen on mobile

#### 3. `src/pages/Chat.tsx` (Optional full-page version)
A dedicated `/chat` page with:
- Full-width chat interface
- Suggested questions sidebar:
  - "How much did I spend this month?"
  - "Am I on track with my budget?"
  - "What's my net worth?"
  - "How can I save more?"
  - "Analyze my spending patterns"
  - "Should I pay off loans or invest?"
  - "How's my credit health?"

---

## Security Considerations

1. **User Data Isolation:** Every tool query is scoped to `userId` from the JWT token. Claude NEVER sees another user's data.
2. **Read-Only Tools:** All tools are read-only (SELECT queries). No tool can modify data.
3. **API Key Security:** Anthropic API key lives in `.env`, never sent to frontend.
4. **Rate Limiting:** Add per-user rate limit on chat endpoint (e.g., 30 messages/hour).
5. **Input Sanitization:** User messages are passed to Claude as-is (Claude handles prompt injection). But validate message length (<2000 chars).
6. **Cost Control:** Set `max_tokens: 4096`, track usage per user, optional daily/monthly limits.

---

## Cost Estimation

**Claude Sonnet 4 Pricing (approximate):**
- Input: $3 / million tokens
- Output: $15 / million tokens

**Per chat interaction (estimated):**
- System prompt + tools: ~2,000 tokens (input)
- Conversation history: ~500-2,000 tokens (input)
- Tool calls (2-3 avg): ~500 tokens output + ~1,000 tokens input (tool results)
- Final response: ~300-500 tokens output

**Average cost per message: ~$0.01-0.03**
**1,000 messages/month: ~$10-30**

---

## Implementation Steps (in order)

### Step 1: Backend Setup (1 agent)
- Install `@anthropic-ai/sdk`
- Create `src/services/ai-tools.ts` with all 14 tool implementations
- Create `src/services/ai-chat.service.ts` with Claude integration
- Create `src/api/chat.ts` route
- Register route in `src/server.ts`
- Add ANTHROPIC_API_KEY to `.env`

### Step 2: Frontend Chat Widget (1 agent)
- Create `src/services/chat.service.ts`
- Create `src/components/ChatWidget.tsx` (floating widget)
- Add ChatWidget to App.tsx (persistent across pages)
- Add markdown rendering (install `react-markdown` if needed)
- Style with MUI components

### Step 3: Testing & Polish (1 agent)
- Test with various questions
- Verify tool calling works correctly
- Test edge cases (no data, errors, long conversations)
- Add suggested questions
- Optimize system prompt based on response quality

---

## Example Conversations

**User:** "How much did I spend on food this month?"
→ Claude calls `get_spending_by_category(startDate: "2026-03-01", endDate: "2026-03-31", type: "EXPENSE")`
→ "You've spent **₹12,300** on Food & Dining this month. That's about 14% of your total expenses. Your budget for this category is ₹15,000, so you've used 82% with 25 days to go. You might want to slow down a bit! 🍕"

**User:** "Should I focus on paying off my car loan or investing more?"
→ Claude calls `get_loan_details()` + `get_investment_portfolio()` + `get_risk_profile()`
→ "Your car loan is at **8.5% interest** with ₹4.8L outstanding. Your investments are averaging **11.3% returns**. Since your investment returns exceed the loan interest rate AND you have a moderate-growth risk profile, mathematically you're better off investing more. However, the guaranteed 8.5% savings from paying off the loan is risk-free. My suggestion: maintain current EMIs on the car loan, put extra savings into your SIPs. If you want certainty, split extra money 50-50 between loan prepayment and investment."

**User:** "Give me a complete financial health report"
→ Claude calls `get_net_worth()` + `calculate_financial_ratios()` + `get_budget_status()` + `get_credit_health()` + `get_goals_progress()`
→ Comprehensive multi-paragraph analysis with scores, comparisons, and recommendations.

---

## Optional Enhancements (Future)

1. **Streaming Responses:** Use Claude's streaming API for real-time text display
2. **Conversation Persistence:** Add Prisma model for conversations (save to DB)
3. **Voice Input:** Add speech-to-text for voice questions
4. **Chart Generation:** AI can suggest and render charts inline
5. **Action Suggestions:** "Would you like me to create a budget for Food?" → button to execute
6. **Scheduled Reports:** AI generates weekly/monthly reports automatically
7. **Multi-language:** Support Hindi and regional languages
