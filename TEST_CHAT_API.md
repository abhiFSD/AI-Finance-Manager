# AI Chat API - Testing Guide

## ✅ What Was Built

The AI Chat backend has been successfully implemented with the following components:

### 1. **Anthropic SDK Installation**
- Package: `@anthropic-ai/sdk` installed
- Environment variable added: `ANTHROPIC_API_KEY` (placeholder)

### 2. **Tool Service (`src/services/ai-tools.ts`)**
Implements 14 financial data retrieval tools:
1. `get_account_summary` - Get all accounts and total balance
2. `get_transactions` - Get transactions with filters
3. `get_spending_by_category` - Category-wise spending breakdown
4. `get_monthly_trends` - Income/expense trends over months
5. `get_budget_status` - Budget tracking with spending
6. `get_goals_progress` - Financial goals progress
7. `get_investment_portfolio` - Investment portfolio analysis
8. `get_loan_details` - Loan details with payment history
9. `get_net_worth` - Net worth calculation
10. `get_credit_cards` - Credit card details and utilization
11. `get_credit_health` - Credit score and health metrics
12. `get_risk_profile` - Investment risk profile
13. `calculate_financial_ratios` - Savings rate, debt-to-income, etc.
14. `search_transactions` - Search transactions by keyword

### 3. **Chat Service (`src/services/ai-chat.service.ts`)**
- Claude Sonnet 4.5 integration
- Tool-calling loop for data retrieval
- Conversation history management (in-memory)
- Indian financial context system prompt

### 4. **API Route (`src/api/chat.ts`)**
Three endpoints:
- `POST /api/chat` - Send a message
- `GET /api/chat/:conversationId` - Get conversation history
- `DELETE /api/chat/:conversationId` - Clear conversation

### 5. **Server Registration (`src/server.ts`)**
- Route imported and registered
- API info endpoint updated

---

## 🧪 How to Test

### Step 1: Add Your Anthropic API Key

Edit `.env` and replace the placeholder:
```bash
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### Step 2: Start the Server

If not already running:
```bash
cd ~/Local_Development/Finance_app
npm run dev
```

The server should start on `http://localhost:3001`

### Step 3: Test the Chat Endpoint

**Note:** You need a valid JWT token from the auth endpoint first.

#### Get a JWT Token (if you have a user):
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "password": "your-password"}'
```

Copy the `token` from the response.

#### Send a Chat Message:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "What is my total account balance?"}'
```

#### Expected Response (with placeholder API key):
```json
{
  "success": false,
  "message": "Failed to process chat message",
  "error": "Invalid API key..."
}
```

This is **expected** until you add a real Anthropic API key.

#### Expected Response (with valid API key):
```json
{
  "success": true,
  "data": {
    "response": "Based on your accounts, your total balance is ₹X,XX,XXX...",
    "conversationId": "user123_1234567890",
    "toolsCalled": ["get_account_summary"],
    "usage": {
      "input_tokens": 150,
      "output_tokens": 75
    }
  }
}
```

---

## 📝 Important Notes

### ✅ Implementation Complete
- All 14 tools are implemented and scoped to `userId`
- All Prisma queries follow the existing pattern (`import prisma from '../lib/prisma'`)
- Auth middleware follows the existing pattern (`import { authenticateToken } from '../middleware/auth'`)
- TypeScript compilation successful (only pre-existing project errors remain)
- Server auto-restarts on file changes (ts-node-dev)

### ⚠️ To-Do Before Production Use
1. **Add valid Anthropic API key** to `.env`
2. **Test with real user data** in the database
3. **Consider adding rate limiting** for chat endpoint
4. **Consider persisting conversations** to database (currently in-memory)
5. **Add input sanitization** for safety
6. **Monitor token usage** (Claude API costs)

### 🎯 Example Questions to Ask the AI
- "What's my net worth?"
- "Show me my spending this month"
- "How am I doing on my budgets?"
- "What's my savings rate?"
- "Show my investment portfolio performance"
- "Do I have any loans due soon?"
- "Search for transactions containing 'Amazon'"

---

## 🔧 Troubleshooting

### Server Won't Start
- Check if port 3001 is already in use
- Verify `.env` file exists
- Check database connection

### "Invalid API Key" Error
- Verify `ANTHROPIC_API_KEY` in `.env` is correct
- Restart the server after updating `.env`

### "Unauthorized" Error
- You need a valid JWT token
- Login via `/api/auth/login` first
- Include token in Authorization header

### Tool Execution Errors
- Verify database has user data (accounts, transactions, etc.)
- Check Prisma schema matches database
- Look at server console for detailed error logs

---

## 📊 API Endpoint Details

### POST /api/chat
**Request:**
```json
{
  "message": "What's my total balance?",
  "conversationId": "optional-existing-conversation-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "AI response text...",
    "conversationId": "unique-conversation-id",
    "toolsCalled": ["get_account_summary"],
    "usage": {
      "input_tokens": 150,
      "output_tokens": 75
    }
  }
}
```

### GET /api/chat/:conversationId
**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      { "role": "user", "content": "..." },
      { "role": "assistant", "content": "..." }
    ]
  }
}
```

### DELETE /api/chat/:conversationId
**Response:**
```json
{
  "success": true,
  "message": "Conversation cleared"
}
```

---

## 🎉 Success Criteria
- [x] Anthropic SDK installed
- [x] `.env` updated with API key placeholder
- [x] `ai-tools.ts` created with 14 tools
- [x] `ai-chat.service.ts` created with Claude integration
- [x] `chat.ts` route created
- [x] Route registered in `server.ts`
- [x] TypeScript compiles without errors in new files
- [x] Follows existing patterns (Prisma import, auth middleware)
- [x] Server doesn't crash on startup

**Ready for testing with a valid API key!** 🚀
