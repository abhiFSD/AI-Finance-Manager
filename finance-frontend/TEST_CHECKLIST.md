# Test Checklist - Frontend Core Fixes

## Testing Instructions
The React dev server is running (port 3000) and should have auto-reloaded with all changes.

---

## ✅ Tests to Perform

### 1. Documents Page - Critical Fix
**URL:** http://localhost:3000/documents

**What to test:**
- [ ] Page loads without crashing
- [ ] Documents grid displays (if documents exist)
- [ ] Empty state shows if no documents
- [ ] Upload dialog works
- [ ] No console errors about `.map()` on undefined

**Expected:** No crashes, page renders successfully

---

### 2. Dashboard - Recent Transactions Signs
**URL:** http://localhost:3000/dashboard

**What to test:**
- [ ] Income transactions show **positive** amounts in **green** with `+` sign
- [ ] Expense transactions show **negative** amounts in **red** with `-` sign
- [ ] Transaction chips show correct colors (green for income, red for expense)

**Example:**
- ✅ Income: `+₹8,500,000.00` (green)
- ✅ Expense: `-₹2,500,000.00` (red)

---

### 3. Dashboard - Net Income Calculation
**URL:** http://localhost:3000/dashboard

**What to test:**
- [ ] Monthly Income card shows correct value
- [ ] Monthly Expenses card shows correct value (as negative)
- [ ] Net Income card = Income - Expenses (not Income + Expenses)

**Example:**
- Income: ₹10,00,000
- Expenses: -₹7,31,467.92
- Net Income should be: ₹2,68,532.08 ✅
- Net Income should NOT be: ₹17,31,467.92 ❌

---

### 4. Dashboard - Expenses by Category Chart
**URL:** http://localhost:3000/dashboard (pie chart)

**What to test:**
- [ ] Pie chart shows only expense categories
- [ ] No income categories (Salary, Freelance, etc.) appear
- [ ] Chart legend matches the data

**Should NOT include:** Salary, Freelance, Investment, Gift, Refund, Other Income

---

### 5. Currency Formatting - Indian Rupees
**URLs:** All pages (dashboard, transactions, etc.)

**What to test:**
- [ ] All amounts show ₹ symbol (not $)
- [ ] Indian number format: ₹25,00,000.00 (lakhs/crores style)
- [ ] No US format: ~~$2,500,000.00~~

**Check on:**
- Dashboard stats cards
- Transaction list
- Pie chart tooltips
- All currency displays

---

### 6. Settings - Name Fields Populated
**URL:** http://localhost:3000/settings

**What to test:**
- [ ] First Name field is pre-filled (not empty)
- [ ] Last Name field is pre-filled (not empty)
- [ ] Email field is pre-filled
- [ ] Profile avatar/initial shows correctly

**Expected:** All profile fields should have values on page load

---

### 7. Date Format - DD/MM/YYYY
**URLs:** All pages with dates

**What to test:**
- [ ] Dates display as DD/MM/YYYY (e.g., 05/03/2026)
- [ ] No MM/DD/YYYY format (e.g., ~~03/05/2026~~)
- [ ] Settings dropdown shows "DD/MM/YYYY (Indian)" as default
- [ ] Relative dates work (e.g., "2 days ago")

**Check on:**
- Dashboard transactions (date column)
- Documents page (upload date)
- Transaction date displays

---

## 🔍 Console Checks

Open browser DevTools Console and check:
- [ ] No errors about `undefined.map`
- [ ] No TypeScript/React errors
- [ ] No warnings about missing props
- [ ] API calls succeed (check Network tab)

---

## 🚨 If Issues Found

1. Check browser console for errors
2. Check terminal running `npm start` for compilation errors
3. Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
4. Clear localStorage and refresh
5. Restart dev server if needed: `npm start`

---

## Files Modified (Reference)
1. `src/pages/Documents.tsx` - Crash fix + null checks
2. `src/pages/Dashboard.tsx` - Sign inversion + net income + chart filter + INR
3. `src/pages/Settings.tsx` - Name pre-fill + INR default + DD/MM/YYYY
4. `src/utils/formatters.ts` - INR currency + DD/MM/YYYY dates
5. `src/utils/constants.ts` - INR default + DD/MM/YYYY default

---

**Status:** All fixes applied ✅  
**Server:** Running on port 3000  
**Auto-reload:** Enabled (changes applied automatically)
