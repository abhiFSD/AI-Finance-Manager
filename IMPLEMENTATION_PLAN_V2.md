# Implementation Plan V2 — Missing Features

## Phase 1: Schema & Database (Agent 1)
Add new Prisma models:
- **Investment** — SIPs, ETFs, FDs, MFs with current value, returns tracking
- **Loan** — home/car/personal/education with EMI, interest rate, tenure
- **RiskProfile** — user's risk assessment (questionnaire results)
- **Insight** — generated financial insights per user
- **Alert** — smart notification/alert system
- Link Goals to Investments (goalId on Investment)
- Add creditScore field to User or separate CreditHealth model

Migrate + seed sample data.

## Phase 2: Backend APIs (Agent 2)
New route files:
- `/api/investments` — CRUD + portfolio summary + returns
- `/api/loans` — CRUD + payoff strategies (avalanche/snowball) + timeline
- `/api/risk-profile` — questionnaire + assessment
- `/api/insights` — generate + list insights
- `/api/alerts` — list + manage alerts
- `/api/net-worth` — calculate assets minus liabilities
- `/api/credit-health` — score tracking + utilization + suggestions

Enhance existing:
- `/api/dashboard` — add net worth, insights, alerts
- `/api/goals` — link to investments

## Phase 3: Frontend (Agent 3)
New pages:
- **Investments.tsx** — portfolio overview, add/manage investments, returns chart
- **Loans.tsx** — loan list, payoff strategy comparison, timeline
- **Insights.tsx** — or embedded in Dashboard
- **NetWorth.tsx** — or section in Dashboard

Enhance existing:
- **Dashboard.tsx** — net worth widget, insights feed, alerts, spending trends
- **Goals.tsx** — link to investments
- **CreditCards.tsx** — credit health score section
- **Settings.tsx** — risk profile questionnaire
- **Sidebar/Navigation** — add new menu items

New services:
- investment.service.ts
- loan.service.ts
- risk-profile.service.ts
- insight.service.ts
- alert.service.ts
- net-worth.service.ts
- credit-health.service.ts

## Phase 4: Review (Agent 4)
Code review all changes for:
- Type safety
- Error handling
- Data validation
- API consistency
- Frontend UX

## Phase 5: Testing (Agent 5)
- API-level tests for all new endpoints
- Browser test: full user journey with new features

## Phase 6: Final Browser Test (Agent 6)
- Complete end-to-end as a new user
- Verify all 21 challenge requirements
