# Database Seeding Guide

This guide explains how to use the comprehensive data seeding script for development and testing.

## Overview

The seeding script (`prisma/seed.ts`) creates realistic financial data for comprehensive testing of all application features. It generates:

- **3 Test Users** with different roles (2 regular users + 1 admin)
- **22 Categories** (12 system categories + 4 subcategories + 6 financial goals)
- **9 Bank Accounts** (3 accounts per user: checking, savings, credit card)
- **6 Sample Documents** (bank statements and credit card statements)
- **525 Transactions** (175 per user over the last 6 months)
- **15 Budgets** (5 categories per user with realistic limits)

## Quick Start

### Option 1: Using npm scripts
```bash
# Run seed script only
npm run seed

# Run seed script (alternative)
npm run db:seed

# Reset database and seed (DESTRUCTIVE - removes all data)
npm run db:reset
```

### Option 2: Using Prisma CLI
```bash
# Run Prisma seed command
npx prisma db seed
```

## Test Credentials

After seeding, you can log in with these test accounts:

| Email | Password | Role |
|-------|----------|------|
| john.doe@example.com | Password123! | USER |
| jane.smith@example.com | Password123! | USER |
| admin@example.com | Password123! | ADMIN |

## Seeded Data Details

### Users
- **John Doe** (john.doe@example.com) - Regular user with comprehensive financial data
- **Jane Smith** (jane.smith@example.com) - Regular user with varied spending patterns
- **Admin User** (admin@example.com) - Admin user for testing administrative features

### Accounts Per User
1. **Primary Checking** - State Bank of India (₹50,000 - ₹150,000)
2. **Savings Account** - HDFC Bank (₹100,000 - ₹500,000)
3. **Credit Card** - ICICI Bank (-₹5,000 to -₹25,000)

### Categories
- **System Categories**: Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Education, Travel, Investment, Salary, Freelance, Business
- **Subcategories**: Restaurants, Groceries (under Food), Fuel, Public Transport (under Transportation)
- **Financial Goals**: Emergency Fund, Vacation Fund (per user)

### Transactions
- **175 transactions per user** over the last 6 months
- **Realistic amounts** based on category type:
  - Food & Dining: ₹200 - ₹2,500
  - Transportation: ₹50 - ₹1,500
  - Shopping: ₹500 - ₹15,000
  - Bills & Utilities: ₹800 - ₹5,000
  - Income: ₹25,000 - ₹100,000
- **Indian merchants**: Domino's, Amazon, Uber, BigBasket, etc.
- **15% income transactions** (salary, freelance, business)
- **85% expense transactions** across various categories
- **10% recurring transactions** 
- **30% linked to documents**

### Budgets
- **5 budgets per user** for major expense categories
- **Monthly budget period** with realistic amounts
- **Alert thresholds** set between 70-90%
- **Budget amounts** set 20% higher than average spending

### Documents
- **Bank statements** and **credit card statements** in PDF format
- **Processed status** with extracted metadata
- **Realistic file sizes** (300KB - 2MB)
- **Associated transactions** for 30% of all transactions

## Features Enabled for Testing

The seeded data allows comprehensive testing of:

### Core Features
- ✅ User registration and authentication
- ✅ Multi-account management
- ✅ Transaction categorization
- ✅ Document upload and processing
- ✅ Budget creation and monitoring
- ✅ Income and expense tracking

### Analytics & Reporting
- ✅ Spending patterns analysis
- ✅ Category-wise breakdowns
- ✅ Monthly/yearly comparisons
- ✅ Budget vs. actual spending
- ✅ Account balance trends
- ✅ Income source analysis

### Advanced Features
- ✅ Recurring transaction detection
- ✅ Document-transaction linking
- ✅ Multi-currency support (INR)
- ✅ Financial goal tracking
- ✅ Admin user management
- ✅ Data export/import testing

## Data Patterns

The seeded data follows realistic patterns:

### Spending Patterns
- Higher restaurant spending on weekends
- Regular monthly utility bills
- Seasonal shopping variations
- Realistic salary cycles

### Account Balances
- Checking accounts: Positive balances for daily expenses
- Savings accounts: Higher balances for long-term savings
- Credit cards: Negative balances representing debt

### Transaction Timing
- Even distribution over 6 months
- Realistic date ranges for testing historical data

## Customization

To modify the seeded data:

1. Edit `prisma/seed.ts`
2. Adjust amounts, categories, or transaction patterns
3. Run the seed script again

### Key Variables to Modify
```typescript
// Number of transactions per user (line ~200)
for (let i = 0; i < 175; i++) {

// Date range (utility function)
const getRandomDateInLastSixMonths = (): Date => {
  // Modify the month range here
}

// Amount ranges per category (lines ~250-270)
switch (category.name) {
  case 'Food & Dining':
    amount = getRandomAmount(200, 2500); // Modify these ranges
}
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   ```bash
   # Make sure you have write permissions
   chmod +w prisma/dev.db
   ```

2. **TypeScript Errors**
   ```bash
   # Regenerate Prisma client
   npx prisma generate
   ```

3. **Database Lock Errors**
   ```bash
   # Stop the development server first
   # Then run the seed script
   ```

### Verification

After seeding, verify the data:

```bash
# Check database content
npx prisma studio

# Or check via SQL
sqlite3 prisma/dev.db ".tables"
```

## Performance

- **Seed time**: ~5-10 seconds
- **Database size**: ~500KB with all data
- **Memory usage**: Minimal impact during seeding

## Data Safety

⚠️ **Warning**: The seed script will **DELETE ALL EXISTING DATA** before creating new test data. Always backup production data before running.

The script includes these safety measures:
- Clear confirmation of data deletion
- Atomic transactions for data integrity
- Error handling and rollback on failure

## Best Practices

1. **Development**: Run seed script after database migrations
2. **Testing**: Use `npm run db:reset` for clean test environments
3. **Production**: Never run seed scripts on production databases
4. **CI/CD**: Include seeding in test environment setup

## Support

For issues with seeding:
1. Check the console output for specific errors
2. Verify Prisma schema is up-to-date
3. Ensure all dependencies are installed
4. Check file permissions for database access