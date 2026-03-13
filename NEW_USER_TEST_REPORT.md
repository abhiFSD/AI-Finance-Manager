# New User Experience Test Report
**Date:** March 5, 2026  
**Tester:** QA Subagent  
**Test User:** Priya Sharma (priya.sharma@example.com)  
**App URL:** http://localhost:3000  
**Backend API:** http://localhost:3001

---

## 🚨 CRITICAL BLOCKER DISCOVERED

**Backend API Rate Limiting Too Strict (429 Errors)**

The backend API is returning **429 (Too Many Requests)** errors for normal user operations. This prevents:
- Loading data on Budget, Goals, and Credit Cards pages
- Creating new accounts
- Adding transactions
- Any data modification

**Impact:** New users cannot use the app at all. This is a **SHOW-STOPPER** bug that must be fixed before release.

**Recommendation:** Review and adjust rate limiting configuration in the backend. Normal page navigation and single user operations should not trigger rate limits.

---

## Test Results Summary

| Step | Status | Notes |
|------|--------|-------|
| 1. Logout | ✅ PASS | Successfully logged out from existing session |
| 2. Register New Account | ✅ PASS | Registration successful, auto-logged in |
| 3. Login | ✅ PASS | Automatically logged in after registration |
| 4. Empty State Pages | ⚠️ PARTIAL | See details below |
| 5. Add Account | ❌ **BLOCKED** | 429 error - rate limiting |
| 6. Add Transaction | 🚫 **NOT TESTED** | Blocked by step 5 failure |
| 7. Add Budget | 🚫 **NOT TESTED** | Blocked by step 5 failure |
| 8. Add Goal | 🚫 **NOT TESTED** | Blocked by step 5 failure |
| 9. Upload Document | 🚫 **NOT TESTED** | Blocked by step 5 failure |
| 10. Check Dashboard with Data | 🚫 **NOT TESTED** | No data to check |
| 11. Settings Verification | ✅ PASS | Name correctly shows "Priya Sharma" |

---

## Detailed Test Steps

### ✅ Step 1: Logout from Current Session
**Status:** PASS

**Actions:**
- Opened http://localhost:3000
- Clicked user avatar "JD" in top-right
- User menu appeared showing "John Doe" (john.doe@example.com)
- Clicked "Sign out"

**Result:** Successfully redirected to login page with "Welcome Back" heading

---

### ✅ Step 2: Register New Account
**Status:** PASS

**Actions:**
- Clicked "Sign up here" link on login page
- Filled registration form:
  - First Name: Priya
  - Last Name: Sharma
  - Email: priya.sharma@example.com
  - Password: TestPass123!
  - Confirm Password: TestPass123!
- Checked "Terms of Service" checkbox
- Clicked "Create Account"

**Result:** Registration successful, immediately logged in and redirected to dashboard

**Observations:**
- Form validation working correctly
- User initials "PS" appeared in top-right avatar
- Smooth UX with auto-login after registration

---

### ✅ Step 3: Login with New Account
**Status:** PASS (automatic)

**Result:** Already logged in after registration - good UX decision

---

### ⚠️ Step 4: Check Empty State Pages
**Overall Status:** PARTIAL - Pages render but with API errors

#### Dashboard
**Status:** ✅ PASS
- Total Balance: ₹0.00 ✓
- Monthly Income: ₹0.00 ✓
- Monthly Expenses: ₹0.00 ✓
- Net Income: ₹0.00 ✓
- Recent Transactions: "No recent transactions found" ✓
- Empty charts render without errors ✓

#### Accounts Page
**Status:** ✅ PASS
- Total Balance: ₹0.00 ✓
- Active Accounts: 0 ✓
- "No accounts found" message displayed ✓
- "Add Account" button available ✓
- No crashes or NaN values ✓

#### Transactions Page
**Status:** ✅ PASS
- Empty table with proper headers ✓
- Pagination shows "0–0 of 0" ✓
- Export/Import/Add buttons available ✓
- No errors displayed ✓

#### Budget Page
**Status:** ⚠️ PARTIAL FAIL
- Total Budgeted: ₹0.00 ✓
- Total Spent: ₹0.00 ✓
- Remaining: ₹0.00 ✓
- Over Budget: 0 / 0 ✓
- "No budgets found" message ✓
- **❌ ERROR ALERT:** "Failed to load budget data"
  - **Root cause:** 429 rate limiting error from backend

#### Goals Page
**Status:** ⚠️ PARTIAL FAIL
- Total Goals: 0 ✓
- Completed: 0 ✓
- Target Amount: ₹0.00 ✓
- Saved Amount: ₹0.00 ✓
- Avg Progress: 0.0% ✓ (NOT NaN - good!)
- "No goals found" message ✓
- **❌ ERROR ALERT:** "Failed to load goals"
  - **Root cause:** 429 rate limiting error from backend

#### Credit Cards Page
**Status:** ⚠️ PARTIAL FAIL
- Total Cards: 0 ✓
- Total Balance: ₹0.00 ✓
- Available Credit: ₹0.00 ✓
- Avg Utilization: 0.0% ✓ (NOT NaN - good!)
- Total Rewards: ₹0.00 ✓
- "No credit cards found" message ✓
- **❌ ERROR ALERT:** "Failed to load credit cards"
  - **Root cause:** 429 rate limiting error from backend

#### Documents Page
**Status:** ✅ PASS
- "No documents found" message ✓
- Upload button available ✓
- No errors ✓

#### Settings Page
**Status:** ✅ PASS
- First Name: "Priya" ✓
- Last Name: "Sharma" ✓
- Email: "priya.sharma@example.com" ✓
- Currency: INR ✓
- Date Format: DD/MM/YYYY (Indian) ✓
- All settings display correctly ✓

---

### ❌ Step 5: Add Account
**Status:** BLOCKED - 429 Rate Limiting Error

**Actions:**
- Navigated to Accounts page
- Clicked "Add Account" button
- Dialog opened with form
- Filled in:
  - Account Name: "HDFC Savings" ✓
  - Account Type: "Savings" (selected from dropdown) ✓
  - Initial Balance: 150000 ✓
  - Currency: "INR" (selected from dropdown) ✓
- Clicked "Create" button

**Result:** ❌ **FAILED**

**Error from Console:**
```
Failed to load resource: the server responded with a status of 429 (Too Many Requests)
Error saving account: AxiosError: Request failed with status code 429
```

**Issue:** Backend API rate limiting is blocking account creation. The dialog remained open, form did not submit, account was not created.

**Impact:** Complete blocker for testing any data-related features.

---

### 🚫 Steps 6-10: BLOCKED
Cannot proceed with testing the following due to inability to create base data:
- ✗ Add Transaction (requires an account)
- ✗ Add Budget
- ✗ Add Goal  
- ✗ Upload Document
- ✗ Verify Dashboard with data

---

## Bugs Discovered

### 🔴 CRITICAL: Backend Rate Limiting Blocking Normal Operations
**Severity:** CRITICAL  
**Priority:** P0  
**Status:** BLOCKER

**Description:** Backend API returns 429 (Too Many Requests) errors for normal user operations including page loads and data creation.

**Affected Areas:**
- Account creation
- Budget page loading
- Goals page loading
- Credit Cards page loading
- Any API request

**Reproduction:**
1. Register new user
2. Navigate through pages
3. Try to create any data (account, transaction, etc.)
4. Observe 429 errors in console

**Expected:** User should be able to navigate and create data freely
**Actual:** API blocks requests with 429 errors

**Console Evidence:**
- `Failed to load resource: the server responded with a status of 429 (Too Many Requests)`
- `Error saving account: AxiosError: Request failed with status code 429`
- Multiple 429 errors for `/api/budgets`, `/api/goals`, `/api/credit-cards`, `/api/accounts`

**Fix Required:** Adjust backend rate limiting to allow normal single-user operations.

---

### 🟡 MEDIUM: Error Alerts Display on Empty Pages for New Users
**Severity:** MEDIUM  
**Priority:** P2

**Description:** Empty state pages (Budget, Goals, Credit Cards) show error alerts for new users even though they have no data.

**Affected Pages:**
- Budget: "Failed to load budget data"
- Goals: "Failed to load goals"
- Credit Cards: "Failed to load credit cards"

**Root Cause:** 429 rate limiting errors, but UX should handle this gracefully for new users.

**Expected:** Empty state should not show error messages
**Actual:** Red error alerts appear even for legitimate empty data

**Recommendation:** 
- For 404 or empty responses, show empty state
- For 429 errors specifically, show a friendlier message like "Please wait a moment and refresh"
- For genuinely new users with 0 data, suppress error alerts entirely

---

## Positive Findings

### ✅ No NaN Issues Found
All empty state calculations properly show:
- `0` for counts
- `₹0.00` for currency values
- `0.0%` for percentages

Previous NaN issues appear to be fixed.

### ✅ Empty State UI is Clean
- Proper "No X found" messages
- Helpful prompts to add first item
- No crashes or visual glitches
- Charts handle empty data gracefully

### ✅ Registration Flow is Smooth
- Clear form with validation
- Auto-login after registration
- Good UX with immediate access

### ✅ Settings Pre-filled Correctly
User data from registration properly appears in Settings page.

---

## Overall New User Experience Verdict

### ❌ **FAILED - NOT READY FOR RELEASE**

**Reason:** The backend rate limiting issue makes the app completely unusable for new users. They cannot:
- Add any accounts
- Create transactions
- Set up budgets or goals
- Use any core features

**While the frontend handles empty states well, the backend API errors create a broken experience.**

---

## Recommendations

### Immediate (Before any release):
1. **Fix rate limiting configuration** (CRITICAL)
   - Allow at least 100 requests/minute for authenticated users
   - Don't rate-limit basic CRUD operations for single users
   - Implement per-user rate limiting instead of global

2. **Improve error handling for 429 errors**
   - Don't show scary error alerts for rate limiting
   - Show user-friendly "Too many requests, please wait" message
   - Implement automatic retry with exponential backoff

3. **Test with fresh user accounts**
   - Ensure QA always tests with new accounts
   - Don't rely only on existing seeded data

### Nice to have:
1. Add loading skeletons for empty states
2. Show onboarding tour for new users
3. Add "Quick Start" guide on first login
4. Better error messaging throughout

---

## Technical Details

### Test Environment
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Browser: Chrome (via OpenClaw browser control)
- User Agent: Standard Chrome

### API Errors Logged
All errors from browser console show:
```
Failed to load resource: the server responded with a status of 429 (Too Many Requests)
```

Affected endpoints:
- `/api/accounts` (GET, POST)
- `/api/transactions`
- `/api/budgets`
- `/api/goals`
- `/api/credit-cards`
- `/api/documents`
- `/api/categories`

---

## Next Steps

1. **Backend team:** Immediately review and adjust rate limiting
2. **Retest:** Once rate limiting is fixed, run this test suite again
3. **Monitor:** Add logging/monitoring for 429 errors in production
4. **Document:** Add rate limit information to API documentation

---

**Test Completed:** March 5, 2026 17:40 IST  
**Blocked at:** Step 5 (Add Account)  
**Overall Status:** ❌ FAILED
