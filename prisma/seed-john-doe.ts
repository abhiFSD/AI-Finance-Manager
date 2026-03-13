import { 
  PrismaClient, 
  AccountType, 
  TransactionType, 
  DocumentType, 
  DocumentStatus, 
  BudgetPeriod, 
  GoalCategory,
  GoalPriority,
  CreditCardType,
  PaymentType 
} from '@prisma/client';

const prisma = new PrismaClient();

// John Doe's user ID from database
const JOHN_DOE_USER_ID = 'cmmdgek8c0000zwfq4qklvoe8';

// Utility functions
const getRandomDateInRange = (startDate: Date, endDate: Date): Date => {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime);
};

const getDateMonthsAgo = (months: number): Date => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
};

// Indian merchants and companies for realistic data
const indianMerchants = {
  'Food & Dining': [
    'Domino\'s Pizza', 'McDonald\'s', 'Subway', 'KFC', 'Pizza Hut', 'Cafe Coffee Day',
    'Starbucks', 'Burger King', 'Taco Bell', 'Haldiram\'s', 'Bikanervala', 'Sagar Ratna',
    'Saravana Bhavan', 'Paradise Restaurant', 'Barbequenation', 'Social Offline',
    'Hard Rock Cafe', 'TGI Friday\'s', 'Local Restaurant', 'Street Food Vendor'
  ],
  'Transportation': [
    'Indian Oil Petrol Pump', 'Bharat Petroleum', 'HP Petrol Pump', 'Shell Petrol',
    'Uber', 'Ola', 'Rapido', 'Delhi Metro', 'Mumbai Local', 'BMTC Bus',
    'Auto Rickshaw', 'Taxi', 'Zoomcar', 'Revv Car Rental', 'Drivezy'
  ],
  'Shopping': [
    'Amazon India', 'Flipkart', 'Myntra', 'Ajio', 'Nykaa', 'BigBasket', 'Grofers',
    'Reliance Digital', 'Croma', 'Vijay Sales', 'More Supermarket', 'Spencer\'s',
    'D-Mart', 'Big Bazaar', 'Lifestyle', 'Pantaloons', 'Westside', 'Max Fashion'
  ],
  'Entertainment': [
    'BookMyShow', 'Netflix India', 'Amazon Prime Video', 'Disney+ Hotstar', 'SonyLIV',
    'Zee5', 'Voot', 'Spotify', 'YouTube Premium', 'Gaana', 'JioSaavn',
    'PVR Cinemas', 'INOX Movies', 'Cinepolis', 'Fun City', 'Smaaash'
  ],
  'Bills & Utilities': [
    'Electricity Board Delhi', 'BSES Rajdhani', 'Adani Electricity', 'Tata Power',
    'Airtel', 'Jio', 'Vi (Vodafone Idea)', 'BSNL', 'ACT Fibernet', 'Jio Fiber',
    'Airtel Xstream', 'Hathway Broadband', 'Indane Gas', 'HP Gas', 'Bharatgas'
  ],
  'Healthcare': [
    'Apollo Pharmacy', 'MedPlus', '1mg', 'PharmEasy', 'Netmeds', 'AIIMS',
    'Apollo Hospital', 'Fortis Hospital', 'Max Healthcare', 'Manipal Hospital',
    'Narayana Health', 'Columbia Asia', 'Local Clinic', 'Dental Clinic'
  ],
  'Salary': ['Tech Company Salary', 'Monthly Salary Credit', 'Bonus Payment', 'Incentive Payment'],
  'Investment': ['Zerodha', 'Groww', 'Upstox', 'HDFC Securities', 'ICICI Direct', 'SIP Mutual Fund']
};

const getRandomMerchant = (category: string): string => {
  const merchants = indianMerchants[category as keyof typeof indianMerchants] || ['Generic Merchant'];
  return merchants[Math.floor(Math.random() * merchants.length)];
};

const getRandomAmount = (min: number, max: number): number => {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
};

async function main() {
  console.log('🌱 Starting John Doe comprehensive test data seeding...');
  console.log(`👤 User ID: ${JOHN_DOE_USER_ID}`);

  // Verify John Doe exists
  const johnDoe = await prisma.user.findUnique({
    where: { id: JOHN_DOE_USER_ID }
  });

  if (!johnDoe) {
    throw new Error('John Doe not found in database. Please run the main seed first.');
  }

  console.log(`✅ Found user: ${johnDoe.name} (${johnDoe.email})`);

  // Clear existing John Doe data
  console.log('🧹 Clearing existing John Doe data...');
  await prisma.creditCardPayment.deleteMany({ 
    where: { creditCard: { userId: JOHN_DOE_USER_ID } } 
  });
  await prisma.creditCard.deleteMany({ where: { userId: JOHN_DOE_USER_ID } });
  await prisma.goalContribution.deleteMany({ 
    where: { goal: { userId: JOHN_DOE_USER_ID } } 
  });
  await prisma.goal.deleteMany({ where: { userId: JOHN_DOE_USER_ID } });
  await prisma.transaction.deleteMany({ where: { userId: JOHN_DOE_USER_ID } });
  await prisma.budget.deleteMany({ where: { userId: JOHN_DOE_USER_ID } });
  await prisma.document.deleteMany({ where: { userId: JOHN_DOE_USER_ID } });
  await prisma.account.deleteMany({ where: { userId: JOHN_DOE_USER_ID } });
  await prisma.category.deleteMany({ where: { userId: JOHN_DOE_USER_ID } });

  // 1. Create realistic bank accounts
  console.log('🏦 Creating bank accounts...');
  const accounts = await Promise.all([
    prisma.account.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'HDFC Salary Account',
        type: AccountType.CHECKING,
        institution: 'HDFC Bank',
        accountNumber: '****1234',
        balance: 150000.00, // ₹15,000 (converted to paise for display)
        currency: 'INR',
        lastSynced: new Date(),
      },
    }),
    prisma.account.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'SBI Savings Plus',
        type: AccountType.SAVINGS,
        institution: 'State Bank of India',
        accountNumber: '****5678',
        balance: 500000.00, // ₹50,000
        currency: 'INR',
        lastSynced: new Date(),
      },
    }),
    prisma.account.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'ICICI Investment Portfolio',
        type: AccountType.INVESTMENT,
        institution: 'ICICI Securities',
        accountNumber: '****9012',
        balance: 250000.00, // ₹25,000
        currency: 'INR',
        lastSynced: new Date(),
      },
    }),
    prisma.account.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'Axis Bank Credit Card',
        type: AccountType.CREDIT_CARD,
        institution: 'Axis Bank',
        accountNumber: '****3456',
        balance: -25000.00, // -₹2,500 (negative balance)
        currency: 'INR',
        lastSynced: new Date(),
      },
    }),
  ]);

  console.log(`✅ Created ${accounts.length} accounts`);

  // Get system categories
  const systemCategories = await prisma.category.findMany({
    where: { isSystem: true }
  });

  // 2. Create 3-4 Credit Cards
  console.log('💳 Creating credit cards...');
  const creditCards = await Promise.all([
    prisma.creditCard.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'HDFC Regalia Credit Card',
        lastFourDigits: '2468',
        cardType: CreditCardType.VISA,
        issuer: 'HDFC Bank',
        creditLimit: 1000000, // ₹10,000
        currentBalance: 25000, // ₹2,500
        apr: 3.5,
        annualFee: 250000, // ₹2,500
        dueDate: new Date(2024, 2, 15), // March 15, 2024
        minimumPayment: 125000, // ₹1,250 (5% of balance)
        isActive: true,
      },
    }),
    prisma.creditCard.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'SBI Cashback Credit Card',
        lastFourDigits: '1357',
        cardType: CreditCardType.MASTERCARD,
        issuer: 'State Bank of India',
        creditLimit: 1500000, // ₹15,000
        currentBalance: 12000, // ₹1,200
        apr: 3.25,
        annualFee: 59900, // ₹599
        dueDate: new Date(2024, 2, 20), // March 20, 2024
        minimumPayment: 60000, // ₹600 (5% of balance)
        isActive: true,
      },
    }),
    prisma.creditCard.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'American Express Gold Card',
        lastFourDigits: '9753',
        cardType: CreditCardType.AMERICAN_EXPRESS,
        issuer: 'American Express',
        creditLimit: 2500000, // ₹25,000
        currentBalance: 38000, // ₹3,800
        apr: 3.99,
        annualFee: 450000, // ₹4,500
        dueDate: new Date(2024, 2, 25), // March 25, 2024
        minimumPayment: 190000, // ₹1,900 (5% of balance)
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${creditCards.length} credit cards`);

  // 3. Create Financial Goals
  console.log('🎯 Creating financial goals...');
  const goals = await Promise.all([
    prisma.goal.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'Emergency Fund',
        targetAmount: 3000000, // ₹30,000
        currentAmount: 1800000, // ₹18,000
        deadline: new Date(2024, 11, 31), // Dec 31, 2024
        category: GoalCategory.EMERGENCY_FUND,
        priority: GoalPriority.HIGH,
        description: 'Build emergency fund covering 6 months of expenses',
        isCompleted: false,
      },
    }),
    prisma.goal.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'Europe Vacation',
        targetAmount: 500000, // ₹5,000
        currentAmount: 200000, // ₹2,000
        deadline: new Date(2024, 8, 15), // Sep 15, 2024
        category: GoalCategory.VACATION,
        priority: GoalPriority.MEDIUM,
        description: '2-week trip to France, Italy, and Switzerland',
        isCompleted: false,
      },
    }),
    prisma.goal.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'New Car Down Payment',
        targetAmount: 1000000, // ₹10,000
        currentAmount: 450000, // ₹4,500
        deadline: new Date(2024, 7, 31), // Aug 31, 2024
        category: GoalCategory.CAR_PURCHASE,
        priority: GoalPriority.HIGH,
        description: 'Down payment for new Honda City',
        isCompleted: false,
      },
    }),
    prisma.goal.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'Home Renovation',
        targetAmount: 1500000, // ₹15,000
        currentAmount: 300000, // ₹3,000
        deadline: new Date(2024, 9, 30), // Oct 30, 2024
        category: GoalCategory.HOME_PURCHASE,
        priority: GoalPriority.MEDIUM,
        description: 'Kitchen and bathroom renovation',
        isCompleted: false,
      },
    }),
    prisma.goal.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'Retirement Savings',
        targetAmount: 10000000, // ₹1,00,000
        currentAmount: 2500000, // ₹25,000
        deadline: new Date(2054, 11, 31), // Long term goal
        category: GoalCategory.RETIREMENT,
        priority: GoalPriority.CRITICAL,
        description: 'Long-term retirement portfolio building',
        isCompleted: false,
      },
    }),
    prisma.goal.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        name: 'Professional Development',
        targetAmount: 250000, // ₹2,500
        currentAmount: 50000, // ₹500
        deadline: new Date(2024, 6, 30), // July 30, 2024
        category: GoalCategory.EDUCATION,
        priority: GoalPriority.MEDIUM,
        description: 'AWS and DevOps certification courses',
        isCompleted: false,
      },
    }),
  ]);

  console.log(`✅ Created ${goals.length} financial goals`);

  // 4. Create goal contributions
  console.log('💰 Creating goal contributions...');
  const contributions = [];
  for (const goal of goals) {
    // Add 3-5 random contributions for each goal over the last 3 months
    const numContributions = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < numContributions; i++) {
      const contribution = await prisma.goalContribution.create({
        data: {
          goalId: goal.id,
          amount: getRandomAmount(500, 5000) * 100, // Convert to paise
          date: getRandomDateInRange(getDateMonthsAgo(3), new Date()),
          notes: `Monthly contribution to ${goal.name}`,
        },
      });
      contributions.push(contribution);
    }
  }

  console.log(`✅ Created ${contributions.length} goal contributions`);

  // 5. Create 50+ diverse transactions over last 3 months
  console.log('💸 Creating diverse transactions...');
  const transactions = [];
  const threeMonthsAgo = getDateMonthsAgo(3);
  const now = new Date();

  // Monthly salary transactions
  for (let month = 0; month < 3; month++) {
    const salaryDate = new Date();
    salaryDate.setMonth(salaryDate.getMonth() - month);
    salaryDate.setDate(1); // First day of month
    
    const salaryCategory = systemCategories.find(cat => cat.name === 'Salary');
    const checkingAccount = accounts.find(acc => acc.type === AccountType.CHECKING);
    
    if (salaryCategory && checkingAccount) {
      const transaction = await prisma.transaction.create({
        data: {
          userId: JOHN_DOE_USER_ID,
          accountId: checkingAccount.id,
          date: salaryDate,
          description: 'Monthly Salary Credit',
          merchantName: 'Tech Company Salary',
          amount: 8500000, // ₹85,000
          type: TransactionType.INCOME,
          categoryId: salaryCategory.id,
          tags: 'income,salary,monthly',
          isRecurring: true,
          notes: 'Regular monthly salary',
        },
      });
      transactions.push(transaction);
    }
  }

  // Rent/mortgage payments
  const billsCategory = systemCategories.find(cat => cat.name === 'Bills & Utilities');
  if (billsCategory) {
    for (let month = 0; month < 3; month++) {
      const rentDate = new Date();
      rentDate.setMonth(rentDate.getMonth() - month);
      rentDate.setDate(5); // 5th of each month
      
      const checkingAccount = accounts.find(acc => acc.type === AccountType.CHECKING);
      if (checkingAccount) {
        const transaction = await prisma.transaction.create({
          data: {
            userId: JOHN_DOE_USER_ID,
            accountId: checkingAccount.id,
            date: rentDate,
            description: 'Monthly Rent Payment',
            merchantName: 'Landlord',
            amount: -2500000, // -₹25,000
            type: TransactionType.EXPENSE,
            categoryId: billsCategory.id,
            tags: 'expense,rent,monthly,recurring',
            isRecurring: true,
            notes: 'Monthly apartment rent',
          },
        });
        transactions.push(transaction);
      }
    }
  }

  // Create diverse expense transactions
  const expenseCategories = [
    { name: 'Food & Dining', minAmount: 20000, maxAmount: 250000, frequency: 15 }, // ₹200-2500, 15 transactions
    { name: 'Transportation', minAmount: 5000, maxAmount: 150000, frequency: 12 }, // ₹50-1500, 12 transactions  
    { name: 'Shopping', minAmount: 50000, maxAmount: 1500000, frequency: 8 }, // ₹500-15000, 8 transactions
    { name: 'Entertainment', minAmount: 15000, maxAmount: 300000, frequency: 6 }, // ₹150-3000, 6 transactions
    { name: 'Bills & Utilities', minAmount: 80000, maxAmount: 500000, frequency: 8 }, // ₹800-5000, 8 transactions
    { name: 'Healthcare', minAmount: 30000, maxAmount: 800000, frequency: 4 }, // ₹300-8000, 4 transactions
  ];

  for (const categoryData of expenseCategories) {
    const category = systemCategories.find(cat => cat.name === categoryData.name);
    if (!category) continue;

    for (let i = 0; i < categoryData.frequency; i++) {
      const randomAccount = accounts[Math.floor(Math.random() * accounts.length)];
      const amount = getRandomAmount(categoryData.minAmount, categoryData.maxAmount);
      const merchant = getRandomMerchant(categoryData.name);
      
      const transaction = await prisma.transaction.create({
        data: {
          userId: JOHN_DOE_USER_ID,
          accountId: randomAccount.id,
          date: getRandomDateInRange(threeMonthsAgo, now),
          description: `Payment to ${merchant}`,
          merchantName: merchant,
          amount: -amount, // Negative for expenses
          type: TransactionType.EXPENSE,
          categoryId: category.id,
          tags: `expense,${categoryData.name.toLowerCase().replace(/\s+/g, '-')}`,
          isRecurring: Math.random() < 0.2, // 20% chance of being recurring
          notes: Math.random() < 0.3 ? `Transaction from ${randomAccount.institution}` : null,
        },
      });
      transactions.push(transaction);
    }
  }

  console.log(`✅ Created ${transactions.length} transactions`);

  // 6. Create Monthly Budgets
  console.log('📊 Creating monthly budgets...');
  const budgetData = [
    { category: 'Food & Dining', amount: 80000 }, // ₹800
    { category: 'Transportation', amount: 40000 }, // ₹400
    { category: 'Shopping', amount: 50000 }, // ₹500
    { category: 'Entertainment', amount: 30000 }, // ₹300
    { category: 'Bills & Utilities', amount: 150000 }, // ₹1500
  ];

  const budgets = [];
  for (const budgetItem of budgetData) {
    const category = systemCategories.find(cat => cat.name === budgetItem.category);
    if (category) {
      const budget = await prisma.budget.create({
        data: {
          userId: JOHN_DOE_USER_ID,
          categoryId: category.id,
          amount: budgetItem.amount,
          period: BudgetPeriod.MONTHLY,
          startDate: new Date(2024, 2, 1), // March 1, 2024
          alertEnabled: true,
          alertThreshold: 80, // Alert at 80%
        },
      });
      budgets.push(budget);
    }
  }

  console.log(`✅ Created ${budgets.length} monthly budgets`);

  // 7. Create sample documents
  console.log('📄 Creating sample documents...');
  const documents = await Promise.all([
    prisma.document.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        fileName: 'hdfc_bank_statement_jan_2024.pdf',
        fileUrl: '/uploads/documents/hdfc_bank_statement_jan_2024.pdf',
        fileSize: 1245678,
        mimeType: 'application/pdf',
        type: DocumentType.BANK_STATEMENT,
        status: DocumentStatus.COMPLETED,
        processedAt: new Date(),
        extractedData: {
          accountNumber: '****1234',
          statementPeriod: '2024-01-01 to 2024-01-31',
          transactions: 45,
          openingBalance: 125000,
          closingBalance: 150000,
        },
      },
    }),
    prisma.document.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        fileName: 'sbi_savings_statement_feb_2024.pdf',
        fileUrl: '/uploads/documents/sbi_savings_statement_feb_2024.pdf',
        fileSize: 892345,
        mimeType: 'application/pdf',
        type: DocumentType.BANK_STATEMENT,
        status: DocumentStatus.COMPLETED,
        processedAt: new Date(),
        extractedData: {
          accountNumber: '****5678',
          statementPeriod: '2024-02-01 to 2024-02-29',
          transactions: 28,
          openingBalance: 485000,
          closingBalance: 500000,
        },
      },
    }),
    prisma.document.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        fileName: 'hdfc_credit_card_statement_feb_2024.pdf',
        fileUrl: '/uploads/documents/hdfc_credit_card_statement_feb_2024.pdf',
        fileSize: 567890,
        mimeType: 'application/pdf',
        type: DocumentType.CREDIT_CARD_STATEMENT,
        status: DocumentStatus.COMPLETED,
        processedAt: new Date(),
        extractedData: {
          cardNumber: '****2468',
          statementPeriod: '2024-02-15 to 2024-03-14',
          transactions: 23,
          previousBalance: 15000,
          currentBalance: 25000,
          minimumAmountDue: 1250,
          paymentDueDate: '2024-03-15',
        },
      },
    }),
    prisma.document.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        fileName: 'amex_gold_statement_march_2024.pdf',
        fileUrl: '/uploads/documents/amex_gold_statement_march_2024.pdf',
        fileSize: 434567,
        mimeType: 'application/pdf',
        type: DocumentType.CREDIT_CARD_STATEMENT,
        status: DocumentStatus.COMPLETED,
        processedAt: new Date(),
        extractedData: {
          cardNumber: '****9753',
          statementPeriod: '2024-02-25 to 2024-03-24',
          transactions: 18,
          previousBalance: 28000,
          currentBalance: 38000,
          minimumAmountDue: 1900,
          paymentDueDate: '2024-03-25',
        },
      },
    }),
    prisma.document.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        fileName: 'income_tax_return_ay_2023_24.pdf',
        fileUrl: '/uploads/documents/income_tax_return_ay_2023_24.pdf',
        fileSize: 234567,
        mimeType: 'application/pdf',
        type: DocumentType.OTHER,
        status: DocumentStatus.COMPLETED,
        processedAt: new Date(),
        extractedData: {
          assessmentYear: '2023-24',
          totalIncome: 10200000,
          taxPaid: 153000,
          refundAmount: 0,
        },
      },
    }),
    prisma.document.create({
      data: {
        userId: JOHN_DOE_USER_ID,
        fileName: 'icici_investment_statement_q4_2023.pdf',
        fileUrl: '/uploads/documents/icici_investment_statement_q4_2023.pdf',
        fileSize: 345678,
        mimeType: 'application/pdf',
        type: DocumentType.INVESTMENT_STATEMENT,
        status: DocumentStatus.COMPLETED,
        processedAt: new Date(),
        extractedData: {
          portfolioValue: 250000,
          gainLoss: 15000,
          holdings: ['HDFC Bank', 'Reliance Industries', 'TCS', 'Infosys'],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${documents.length} sample documents`);

  // 8. Create credit card payments
  console.log('💳 Creating credit card payments...');
  const payments = [];
  for (const card of creditCards) {
    // Create 2-3 payments for each card over last 3 months
    const numPayments = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < numPayments; i++) {
      const paymentAmount = getRandomAmount(card.minimumPayment, card.currentBalance);
      const payment = await prisma.creditCardPayment.create({
        data: {
          creditCardId: card.id,
          amount: paymentAmount,
          paymentDate: getRandomDateInRange(threeMonthsAgo, now),
          paymentType: Math.random() < 0.3 ? PaymentType.AUTOMATIC : PaymentType.MANUAL,
          notes: `Payment for ${card.name}`,
        },
      });
      payments.push(payment);
    }
  }

  console.log(`✅ Created ${payments.length} credit card payments`);

  // 9. Update account balances based on transactions
  console.log('🔄 Updating account balances...');
  for (const account of accounts) {
    const accountTransactions = transactions.filter(t => t.accountId === account.id);
    const transactionSum = accountTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    let newBalance;
    if (account.type === AccountType.CREDIT_CARD) {
      // Credit card balances should be negative or zero
      newBalance = Math.min(0, account.balance + transactionSum);
    } else {
      // Other accounts should have positive balance
      newBalance = Math.max(0, account.balance + transactionSum);
    }
    
    await prisma.account.update({
      where: { id: account.id },
      data: { balance: newBalance },
    });
  }

  // 10. Update goal current amounts based on contributions
  console.log('🎯 Updating goal progress...');
  for (const goal of goals) {
    const goalContributions = contributions.filter(c => c.goalId === goal.id);
    const totalContributions = goalContributions.reduce((sum, c) => sum + c.amount, 0);
    
    await prisma.goal.update({
      where: { id: goal.id },
      data: { currentAmount: goal.currentAmount + totalContributions },
    });
  }

  // Print comprehensive summary
  console.log('\n🎉 John Doe comprehensive test data seeding completed!');
  console.log('📊 Summary:');
  console.log(`   👤 User: ${johnDoe.name} (${johnDoe.email})`);
  console.log(`   🏦 Bank Accounts: ${accounts.length}`);
  console.log('     • HDFC Checking: ₹15,000');
  console.log('     • SBI Savings: ₹50,000');
  console.log('     • ICICI Investment: ₹25,000');
  console.log('     • Credit Card: -₹2,500');
  console.log(`   💳 Credit Cards: ${creditCards.length}`);
  console.log('     • HDFC Regalia Visa (Limit: ₹10,000, Balance: ₹2,500)');
  console.log('     • SBI Cashback Mastercard (Limit: ₹15,000, Balance: ₹1,200)');
  console.log('     • Amex Gold (Limit: ₹25,000, Balance: ₹3,800)');
  console.log(`   🎯 Financial Goals: ${goals.length}`);
  console.log('     • Emergency Fund: ₹18,000/₹30,000');
  console.log('     • Europe Vacation: ₹2,000/₹5,000');
  console.log('     • Car Down Payment: ₹4,500/₹10,000');
  console.log('     • Home Renovation: ₹3,000/₹15,000');
  console.log('     • Retirement: ₹25,000/₹100,000');
  console.log('     • Education: ₹500/₹2,500');
  console.log(`   💸 Transactions: ${transactions.length} (last 3 months)`);
  console.log(`   📊 Monthly Budgets: ${budgets.length}`);
  console.log('     • Food & Dining: ₹800/month');
  console.log('     • Transportation: ₹400/month');
  console.log('     • Shopping: ₹500/month');
  console.log('     • Entertainment: ₹300/month');
  console.log('     • Bills & Utilities: ₹1,500/month');
  console.log(`   📄 Documents: ${documents.length}`);
  console.log(`   💳 Credit Card Payments: ${payments.length}`);
  console.log(`   🔄 Goal Contributions: ${contributions.length}`);
  console.log('\n💡 All amounts are in Indian Rupees (INR)');
  console.log('📅 Data covers the last 3 months with realistic patterns');
  console.log('🏪 Uses authentic Indian merchants and financial institutions');
}

main()
  .catch((e) => {
    console.error('❌ John Doe seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });