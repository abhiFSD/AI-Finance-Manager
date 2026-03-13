import { PrismaClient, UserRole, AccountType, DocumentType, DocumentStatus, TransactionType, BudgetPeriod, InvestmentType, LoanType, RiskCategory, InsightType, InsightSeverity, AlertType, AlertPriority, GoalCategory, GoalPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Utility function to generate random date within the last 6 months
const getRandomDateInLastSixMonths = (): Date => {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
  return new Date(randomTime);
};

// Utility function to generate random amount
const getRandomAmount = (min: number, max: number): number => {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
};

async function main() {
  console.log('🌱 Starting seed process...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.alert.deleteMany({});
  await prisma.creditHealth.deleteMany({});
  await prisma.insight.deleteMany({});
  await prisma.riskProfile.deleteMany({});
  await prisma.loanPayment.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.investment.deleteMany({});
  await prisma.goalContribution.deleteMany({});
  await prisma.creditCardPayment.deleteMany({});
  await prisma.creditCard.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});

  // Create test users
  console.log('👤 Creating test users...');
  const hashedPassword = await bcrypt.hash('Password123!', 12);
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john.doe@example.com',
        password: hashedPassword,
        name: 'John Doe',
        role: UserRole.USER,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'jane.smith@example.com',
        password: hashedPassword,
        name: 'Jane Smith',
        role: UserRole.USER,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: UserRole.ADMIN,
        emailVerified: new Date(),
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create system categories (common for all users)
  console.log('📂 Creating system categories...');
  const systemCategories = [
    { name: 'Food & Dining', icon: '🍽️', color: '#FF6B6B' },
    { name: 'Transportation', icon: '🚗', color: '#4ECDC4' },
    { name: 'Shopping', icon: '🛒', color: '#45B7D1' },
    { name: 'Entertainment', icon: '🎬', color: '#96CEB4' },
    { name: 'Bills & Utilities', icon: '💡', color: '#FFEAA7' },
    { name: 'Healthcare', icon: '🏥', color: '#FD79A8' },
    { name: 'Education', icon: '📚', color: '#6C5CE7' },
    { name: 'Travel', icon: '✈️', color: '#A29BFE' },
    { name: 'Investment', icon: '📈', color: '#00B894' },
    { name: 'Salary', icon: '💰', color: '#00CEC9' },
    { name: 'Freelance', icon: '💼', color: '#FDCB6E' },
    { name: 'Business', icon: '🏢', color: '#E84393' },
  ];

  const createdSystemCategories = await Promise.all(
    systemCategories.map(category =>
      prisma.category.create({
        data: {
          ...category,
          isSystem: true,
        },
      })
    )
  );

  console.log(`✅ Created ${createdSystemCategories.length} system categories`);

  // Create subcategories for the first user
  console.log('📁 Creating subcategories...');
  const foodCategory = createdSystemCategories.find(cat => cat.name === 'Food & Dining');
  const transportationCategory = createdSystemCategories.find(cat => cat.name === 'Transportation');
  const shoppingCategory = createdSystemCategories.find(cat => cat.name === 'Shopping');

  const subcategories = await Promise.all([
    // Food subcategories
    prisma.category.create({
      data: {
        name: 'Restaurants',
        icon: '🍴',
        color: '#FF6B6B',
        parentId: foodCategory?.id,
        userId: users[0].id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Groceries',
        icon: '🥬',
        color: '#FF7675',
        parentId: foodCategory?.id,
        userId: users[0].id,
      },
    }),
    // Transportation subcategories
    prisma.category.create({
      data: {
        name: 'Fuel',
        icon: '⛽',
        color: '#4ECDC4',
        parentId: transportationCategory?.id,
        userId: users[0].id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Public Transport',
        icon: '🚌',
        color: '#55D8D8',
        parentId: transportationCategory?.id,
        userId: users[0].id,
      },
    }),
  ]);

  console.log(`✅ Created ${subcategories.length} subcategories`);

  // Create accounts for each user
  console.log('🏦 Creating accounts...');
  const accounts = [];
  
  for (const user of users) {
    const userAccounts = await Promise.all([
      prisma.account.create({
        data: {
          userId: user.id,
          name: 'Primary Checking',
          type: AccountType.CHECKING,
          institution: 'State Bank of India',
          accountNumber: '****1234',
          balance: getRandomAmount(50000, 150000),
          currency: 'INR',
          isActive: true,
          lastSynced: new Date(),
        },
      }),
      prisma.account.create({
        data: {
          userId: user.id,
          name: 'Savings Account',
          type: AccountType.SAVINGS,
          institution: 'HDFC Bank',
          accountNumber: '****5678',
          balance: getRandomAmount(100000, 500000),
          currency: 'INR',
          isActive: true,
          lastSynced: new Date(),
        },
      }),
      prisma.account.create({
        data: {
          userId: user.id,
          name: 'Credit Card',
          type: AccountType.CREDIT_CARD,
          institution: 'ICICI Bank',
          accountNumber: '****9012',
          balance: -getRandomAmount(5000, 25000),
          currency: 'INR',
          isActive: true,
          lastSynced: new Date(),
        },
      }),
    ]);
    accounts.push(...userAccounts);
  }

  console.log(`✅ Created ${accounts.length} accounts`);

  // Create sample documents
  console.log('📄 Creating sample documents...');
  const documents = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const userDocuments = await Promise.all([
      prisma.document.create({
        data: {
          userId: user.id,
          fileName: `bank_statement_${i + 1}_nov_2025.pdf`,
          fileUrl: `/uploads/documents/bank_statement_${i + 1}_nov_2025.pdf`,
          fileSize: getRandomAmount(500000, 2000000),
          mimeType: 'application/pdf',
          type: DocumentType.BANK_STATEMENT,
          status: DocumentStatus.COMPLETED,
          processedAt: getRandomDateInLastSixMonths(),
          extractedData: {
            accountNumber: `****${1234 + i}`,
            statementPeriod: '2025-11-01 to 2025-11-30',
            transactions: getRandomAmount(25, 50),
          },
        },
      }),
      prisma.document.create({
        data: {
          userId: user.id,
          fileName: `credit_card_statement_${i + 1}_dec_2025.pdf`,
          fileUrl: `/uploads/documents/credit_card_statement_${i + 1}_dec_2025.pdf`,
          fileSize: getRandomAmount(300000, 1000000),
          mimeType: 'application/pdf',
          type: DocumentType.CREDIT_CARD_STATEMENT,
          status: DocumentStatus.COMPLETED,
          processedAt: getRandomDateInLastSixMonths(),
          extractedData: {
            cardNumber: `****${5678 + i}`,
            statementPeriod: '2025-12-01 to 2025-12-31',
            transactions: getRandomAmount(15, 30),
          },
        },
      }),
    ]);
    documents.push(...userDocuments);
  }

  console.log(`✅ Created ${documents.length} documents`);

  // Create realistic transactions for the last 6 months
  console.log('💳 Creating transactions...');
  const merchantNames = {
    'Food & Dining': ['Domino\'s Pizza', 'McDonald\'s', 'Subway', 'Starbucks', 'Pizza Hut', 'Big Bazaar', 'D-Mart', 'Reliance Fresh'],
    'Transportation': ['Indian Oil', 'Bharat Petroleum', 'Uber', 'Ola', 'Delhi Metro', 'BMTC', 'Auto Rickshaw'],
    'Shopping': ['Amazon', 'Flipkart', 'Myntra', 'BigBasket', 'Nykaa', 'Reliance Digital', 'Croma'],
    'Entertainment': ['BookMyShow', 'Netflix', 'Amazon Prime', 'Spotify', 'YouTube Premium', 'Disney+ Hotstar'],
    'Bills & Utilities': ['Electricity Board', 'Gas Connection', 'Airtel', 'Jio', 'Vi', 'BSNL', 'Reliance Jio Fiber'],
    'Healthcare': ['Apollo Pharmacy', 'MedPlus', '1mg', 'Fortis Hospital', 'Apollo Hospital', 'Max Healthcare'],
    'Investment': ['Zerodha', 'Groww', 'Upstox', 'SIP Investment', 'Mutual Fund', 'Stock Purchase'],
    'Salary': ['Monthly Salary', 'Bonus Payment', 'Overtime Pay', 'Incentive Payment'],
    'Freelance': ['Client Payment', 'Freelance Project', 'Consulting Fee', 'Design Work'],
  };

  const transactions = [];
  
  for (const user of users) {
    const userAccounts = accounts.filter(acc => acc.userId === user.id);
    const userCategories = [...createdSystemCategories, ...subcategories.filter(sub => sub.userId === user.id)];
    
    // Generate 150-200 transactions per user over 6 months
    for (let i = 0; i < 175; i++) {
      const account = userAccounts[Math.floor(Math.random() * userAccounts.length)];
      const isIncome = Math.random() < 0.15; // 15% chance for income
      const category = userCategories[Math.floor(Math.random() * userCategories.length)];
      const categoryMerchants = merchantNames[category.name as keyof typeof merchantNames] || ['Generic Merchant'];
      const merchant = categoryMerchants[Math.floor(Math.random() * categoryMerchants.length)];
      
      let amount;
      let description;
      
      if (isIncome) {
        amount = getRandomAmount(25000, 100000);
        description = category.name === 'Salary' ? 'Monthly Salary Credit' : 
                     category.name === 'Freelance' ? `Freelance payment from ${merchant}` :
                     `Income from ${merchant}`;
      } else {
        // Different amount ranges based on category
        switch (category.name) {
          case 'Food & Dining':
            amount = getRandomAmount(200, 2500);
            break;
          case 'Transportation':
            amount = getRandomAmount(50, 1500);
            break;
          case 'Shopping':
            amount = getRandomAmount(500, 15000);
            break;
          case 'Bills & Utilities':
            amount = getRandomAmount(800, 5000);
            break;
          case 'Healthcare':
            amount = getRandomAmount(300, 8000);
            break;
          case 'Entertainment':
            amount = getRandomAmount(150, 3000);
            break;
          default:
            amount = getRandomAmount(100, 5000);
        }
        description = `Payment to ${merchant}`;
      }

      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: account.id,
          documentId: Math.random() < 0.3 ? documents.find(doc => doc.userId === user.id)?.id : null,
          date: getRandomDateInLastSixMonths(),
          description,
          merchantName: merchant,
          amount: isIncome ? amount : -amount,
          type: isIncome ? TransactionType.INCOME : TransactionType.EXPENSE,
          categoryId: category.id,
          tags: isIncome ? 'income,salary' : `expense,${category.name.toLowerCase().replace(/\s+/g, '-')}`,
          isRecurring: Math.random() < 0.1, // 10% chance of being recurring
          notes: Math.random() < 0.3 ? `Auto-imported from ${account.institution}` : null,
        },
      });
      
      transactions.push(transaction);
    }
  }

  console.log(`✅ Created ${transactions.length} transactions`);

  // Create budgets for each user
  console.log('💰 Creating budgets...');
  const budgets = [];
  
  for (const user of users) {
    const expenseCategories = createdSystemCategories.filter(cat => 
      ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities'].includes(cat.name)
    );
    
    for (const category of expenseCategories) {
      // Calculate average monthly spending for this category
      const categoryTransactions = transactions.filter(t => 
        t.userId === user.id && t.categoryId === category.id && t.amount < 0
      );
      const avgMonthlySpent = Math.abs(categoryTransactions.reduce((sum, t) => sum + t.amount, 0)) / 6;
      
      const budget = await prisma.budget.create({
        data: {
          userId: user.id,
          categoryId: category.id,
          amount: Math.round(avgMonthlySpent * 1.2), // Set budget 20% higher than average spending
          period: BudgetPeriod.MONTHLY,
          startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          alertEnabled: true,
          alertThreshold: Math.floor(Math.random() * 20) + 70, // Random threshold between 70-90%
        },
      });
      
      budgets.push(budget);
    }
  }

  console.log(`✅ Created ${budgets.length} budgets`);

  // Update account balances based on transactions
  console.log('🔄 Updating account balances...');
  for (const account of accounts) {
    const accountTransactions = transactions.filter(t => t.accountId === account.id);
    const transactionSum = accountTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    await prisma.account.update({
      where: { id: account.id },
      data: {
        balance: account.type === AccountType.CREDIT_CARD 
          ? Math.min(0, account.balance + transactionSum) // Credit cards should have negative or zero balance
          : Math.max(0, account.balance + transactionSum), // Other accounts should have positive balance
      },
    });
  }

  // Create financial goals
  console.log('🎯 Creating financial goals...');
  const goals = [];
  
  for (const user of users) {
    const userGoals = await Promise.all([
      prisma.goal.create({
        data: {
          userId: user.id,
          name: 'Emergency Fund',
          targetAmount: 300000,
          currentAmount: 125000,
          deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          category: GoalCategory.EMERGENCY_FUND,
          priority: GoalPriority.CRITICAL,
          description: 'Build an emergency fund covering 6 months of expenses',
          isCompleted: false,
        },
      }),
      prisma.goal.create({
        data: {
          userId: user.id,
          name: 'Dream Vacation to Europe',
          targetAmount: 250000,
          currentAmount: 45000,
          deadline: new Date(new Date().setMonth(new Date().getMonth() + 8)),
          category: GoalCategory.VACATION,
          priority: GoalPriority.MEDIUM,
          description: '15-day trip to Europe covering France, Italy, and Spain',
          isCompleted: false,
        },
      }),
      prisma.goal.create({
        data: {
          userId: user.id,
          name: 'Home Down Payment',
          targetAmount: 1500000,
          currentAmount: 350000,
          deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
          category: GoalCategory.HOME_PURCHASE,
          priority: GoalPriority.HIGH,
          description: 'Down payment for 2BHK apartment',
          isCompleted: false,
        },
      }),
    ]);
    goals.push(...userGoals);
  }

  console.log(`✅ Created ${goals.length} financial goals`);

  // Create goal contributions for the first user
  console.log('💵 Creating goal contributions...');
  const johnGoals = goals.filter(g => g.userId === users[0].id);
  const contributions = [];
  
  for (const goal of johnGoals) {
    for (let i = 0; i < 3; i++) {
      const contribution = await prisma.goalContribution.create({
        data: {
          goalId: goal.id,
          amount: getRandomAmount(5000, 25000),
          date: getRandomDateInLastSixMonths(),
          notes: i === 0 ? 'Initial contribution' : `Monthly contribution ${i}`,
        },
      });
      contributions.push(contribution);
    }
  }

  console.log(`✅ Created ${contributions.length} goal contributions`);

  // Create investments for the first user
  console.log('📈 Creating investments...');
  const investmentGoal = johnGoals.find(g => g.name === 'Home Down Payment');
  const investments = await Promise.all([
    // SIP 1
    prisma.investment.create({
      data: {
        userId: users[0].id,
        name: 'HDFC Balanced Advantage Fund',
        type: InvestmentType.SIP,
        platform: 'Groww',
        currentValue: 125000,
        investedAmount: 108000,
        units: 2341.56,
        purchaseDate: new Date(new Date().setMonth(new Date().getMonth() - 18)),
        lastUpdated: new Date(),
        expectedReturn: 12.5,
        goalId: investmentGoal?.id,
        notes: 'Monthly SIP of ₹6,000',
        isActive: true,
      },
    }),
    // SIP 2
    prisma.investment.create({
      data: {
        userId: users[0].id,
        name: 'Axis Bluechip Fund',
        type: InvestmentType.SIP,
        platform: 'Zerodha',
        currentValue: 85000,
        investedAmount: 72000,
        units: 1567.89,
        purchaseDate: new Date(new Date().setMonth(new Date().getMonth() - 12)),
        lastUpdated: new Date(),
        expectedReturn: 14.0,
        goalId: investmentGoal?.id,
        notes: 'Monthly SIP of ₹6,000',
        isActive: true,
      },
    }),
    // ETF
    prisma.investment.create({
      data: {
        userId: users[0].id,
        name: 'Nifty 50 ETF',
        type: InvestmentType.ETF,
        platform: 'Zerodha',
        currentValue: 156000,
        investedAmount: 140000,
        units: 850.0,
        purchaseDate: new Date(new Date().setMonth(new Date().getMonth() - 9)),
        lastUpdated: new Date(),
        expectedReturn: 11.0,
        notes: 'Long-term equity exposure',
        isActive: true,
      },
    }),
    // Fixed Deposit
    prisma.investment.create({
      data: {
        userId: users[0].id,
        name: 'SBI Fixed Deposit 3 Year',
        type: InvestmentType.FIXED_DEPOSIT,
        platform: 'State Bank of India',
        currentValue: 212500,
        investedAmount: 200000,
        purchaseDate: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        lastUpdated: new Date(),
        expectedReturn: 6.5,
        notes: 'Quarterly interest payout',
        isActive: true,
      },
    }),
    // Mutual Fund
    prisma.investment.create({
      data: {
        userId: users[0].id,
        name: 'Mirae Asset Large Cap Fund',
        type: InvestmentType.MUTUAL_FUND,
        platform: 'Groww',
        currentValue: 95000,
        investedAmount: 85000,
        units: 1234.67,
        purchaseDate: new Date(new Date().setMonth(new Date().getMonth() - 15)),
        lastUpdated: new Date(),
        expectedReturn: 13.5,
        goalId: investmentGoal?.id,
        notes: 'One-time lumpsum investment',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${investments.length} investments`);

  // Create loans for the first user
  console.log('🏠 Creating loans...');
  const loans = await Promise.all([
    // Home Loan
    prisma.loan.create({
      data: {
        userId: users[0].id,
        name: 'Home Loan - Apartment',
        type: LoanType.HOME_LOAN,
        lender: 'HDFC Bank',
        principalAmount: 3500000,
        outstandingBalance: 2850000,
        interestRate: 8.5,
        emiAmount: 35000,
        tenure: 180,
        startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 3)),
        nextPaymentDate: new Date(new Date().setDate(5)),
        isActive: true,
        notes: '15-year home loan for 2BHK apartment in Bangalore',
      },
    }),
    // Car Loan
    prisma.loan.create({
      data: {
        userId: users[0].id,
        name: 'Car Loan - Honda City',
        type: LoanType.CAR_LOAN,
        lender: 'ICICI Bank',
        principalAmount: 800000,
        outstandingBalance: 450000,
        interestRate: 9.5,
        emiAmount: 18500,
        tenure: 60,
        startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 2)),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 3)),
        nextPaymentDate: new Date(new Date().setDate(10)),
        isActive: true,
        notes: '5-year car loan',
      },
    }),
    // Personal Loan
    prisma.loan.create({
      data: {
        userId: users[0].id,
        name: 'Personal Loan - Home Renovation',
        type: LoanType.PERSONAL_LOAN,
        lender: 'Axis Bank',
        principalAmount: 300000,
        outstandingBalance: 125000,
        interestRate: 11.5,
        emiAmount: 8500,
        tenure: 36,
        startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 2)),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
        nextPaymentDate: new Date(new Date().setDate(15)),
        isActive: true,
        notes: 'For home renovation and furniture',
      },
    }),
  ]);

  console.log(`✅ Created ${loans.length} loans`);

  // Create loan payments for each loan
  console.log('💸 Creating loan payments...');
  const loanPayments = [];
  for (const loan of loans) {
    // Create 3 recent payments for each loan
    for (let i = 1; i <= 3; i++) {
      const paymentDate = new Date();
      paymentDate.setMonth(paymentDate.getMonth() - i);
      
      const payment = await prisma.loanPayment.create({
        data: {
          loanId: loan.id,
          amount: loan.emiAmount || 10000,
          principal: (loan.emiAmount || 10000) * 0.6,
          interest: (loan.emiAmount || 10000) * 0.4,
          paymentDate,
          notes: `EMI payment ${i}`,
        },
      });
      loanPayments.push(payment);
    }
  }

  console.log(`✅ Created ${loanPayments.length} loan payments`);

  // Create risk profile for the first user
  console.log('📊 Creating risk profile...');
  const riskProfile = await prisma.riskProfile.create({
    data: {
      userId: users[0].id,
      riskScore: 62,
      riskCategory: RiskCategory.MODERATE,
      investmentHorizon: 'long',
      monthlyIncome: 85000,
      monthlySavings: 25000,
      answers: JSON.stringify({
        age: 32,
        investmentExperience: 'intermediate',
        reactionToLoss: 'hold',
        investmentGoals: ['retirement', 'wealth-creation'],
        timeHorizon: '10-15 years',
      }),
      assessedAt: new Date(new Date().setMonth(new Date().getMonth() - 2)),
    },
  });

  console.log(`✅ Created risk profile`);

  // Create insights for the first user
  console.log('💡 Creating insights...');
  const insights = await Promise.all([
    prisma.insight.create({
      data: {
        userId: users[0].id,
        type: InsightType.SPENDING_ALERT,
        title: 'High Spending on Dining',
        message: 'Your dining expenses increased by 35% this month compared to last month. Consider cooking at home more often.',
        severity: InsightSeverity.WARNING,
        category: 'spending',
        data: JSON.stringify({
          currentMonth: 12500,
          previousMonth: 9200,
          percentageChange: 35.87,
        }),
        isRead: false,
        isDismissed: false,
        validUntil: new Date(new Date().setDate(new Date().getDate() + 7)),
      },
    }),
    prisma.insight.create({
      data: {
        userId: users[0].id,
        type: InsightType.BUDGET_WARNING,
        title: 'Shopping Budget 85% Used',
        message: 'You\'ve used 85% of your monthly shopping budget with 10 days left in the month.',
        severity: InsightSeverity.WARNING,
        category: 'spending',
        data: JSON.stringify({
          budgetAmount: 15000,
          spent: 12750,
          remaining: 2250,
          daysLeft: 10,
        }),
        isRead: false,
        isDismissed: false,
      },
    }),
    prisma.insight.create({
      data: {
        userId: users[0].id,
        type: InsightType.SAVING_TIP,
        title: 'Great Savings Month!',
        message: 'You saved ₹28,000 this month, which is 32% of your income. Keep up the good work!',
        severity: InsightSeverity.SUCCESS,
        category: 'saving',
        data: JSON.stringify({
          saved: 28000,
          income: 87500,
          savingsRate: 32.0,
        }),
        isRead: true,
        isDismissed: false,
      },
    }),
    prisma.insight.create({
      data: {
        userId: users[0].id,
        type: InsightType.INVESTMENT_SUGGESTION,
        title: 'Consider Increasing SIP Amount',
        message: 'Based on your moderate risk profile and savings rate, you can increase your SIP by ₹5,000/month to reach your home purchase goal faster.',
        severity: InsightSeverity.INFO,
        category: 'investment',
        data: JSON.stringify({
          currentSIP: 12000,
          suggestedSIP: 17000,
          goalAcceleration: '8 months faster',
        }),
        isRead: false,
        isDismissed: false,
      },
    }),
    prisma.insight.create({
      data: {
        userId: users[0].id,
        type: InsightType.GOAL_MILESTONE,
        title: '50% Progress on Emergency Fund!',
        message: 'Congratulations! You\'ve reached 50% of your emergency fund goal. You\'re halfway there!',
        severity: InsightSeverity.SUCCESS,
        category: 'saving',
        data: JSON.stringify({
          goalName: 'Emergency Fund',
          currentAmount: 150000,
          targetAmount: 300000,
          percentageComplete: 50,
        }),
        isRead: true,
        isDismissed: false,
      },
    }),
  ]);

  console.log(`✅ Created ${insights.length} insights`);

  // Create credit health record for the first user
  console.log('💳 Creating credit health record...');
  const creditHealth = await prisma.creditHealth.create({
    data: {
      userId: users[0].id,
      creditScore: 742,
      creditUtilization: 28.5,
      totalCreditLimit: 350000,
      totalCreditUsed: 99750,
      onTimePayments: 36,
      missedPayments: 0,
      oldestAccountAge: 72,
      reportDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      source: 'CIBIL',
      notes: 'Good credit health. Maintaining credit utilization below 30%.',
    },
  });

  console.log(`✅ Created credit health record`);

  // Create alerts for the first user
  console.log('🔔 Creating alerts...');
  const alerts = await Promise.all([
    prisma.alert.create({
      data: {
        userId: users[0].id,
        type: AlertType.LOAN_PAYMENT_DUE,
        title: 'Home Loan EMI Due in 3 Days',
        message: 'Your HDFC home loan EMI of ₹35,000 is due on 5th. Ensure sufficient balance.',
        isRead: false,
        priority: AlertPriority.HIGH,
        actionUrl: '/loans',
      },
    }),
    prisma.alert.create({
      data: {
        userId: users[0].id,
        type: AlertType.BUDGET_EXCEEDED,
        title: 'Shopping Budget Exceeded',
        message: 'You have exceeded your shopping budget by ₹2,500 this month.',
        isRead: false,
        priority: AlertPriority.NORMAL,
        actionUrl: '/budgets',
      },
    }),
    prisma.alert.create({
      data: {
        userId: users[0].id,
        type: AlertType.GOAL_MILESTONE,
        title: 'Emergency Fund Milestone Reached',
        message: 'Congratulations! You\'ve reached 50% of your emergency fund goal.',
        isRead: true,
        priority: AlertPriority.LOW,
        actionUrl: '/goals',
      },
    }),
    prisma.alert.create({
      data: {
        userId: users[0].id,
        type: AlertType.INVESTMENT_UPDATE,
        title: 'SIP Investment Doing Well',
        message: 'Your HDFC Balanced Advantage Fund has returned 15.7% in the last 6 months.',
        isRead: true,
        priority: AlertPriority.LOW,
        actionUrl: '/investments',
      },
    }),
    prisma.alert.create({
      data: {
        userId: users[0].id,
        type: AlertType.CREDIT_SCORE_CHANGE,
        title: 'Credit Score Improved',
        message: 'Your credit score increased from 728 to 742. Keep up the good payment habits!',
        isRead: false,
        priority: AlertPriority.NORMAL,
        actionUrl: '/credit-health',
      },
    }),
  ]);

  console.log(`✅ Created ${alerts.length} alerts`);

  // Print summary
  console.log('\n🎉 Seed completed successfully!');
  console.log('📊 Summary:');
  console.log(`   👤 Users: ${users.length}`);
  console.log(`   📂 Categories: ${createdSystemCategories.length + subcategories.length}`);
  console.log(`   🏦 Accounts: ${accounts.length}`);
  console.log(`   📄 Documents: ${documents.length}`);
  console.log(`   💳 Transactions: ${transactions.length}`);
  console.log(`   💰 Budgets: ${budgets.length}`);
  console.log(`   🎯 Goals: ${goals.length}`);
  console.log(`   💵 Goal Contributions: ${contributions.length}`);
  console.log(`   📈 Investments: ${investments.length}`);
  console.log(`   🏠 Loans: ${loans.length}`);
  console.log(`   💸 Loan Payments: ${loanPayments.length}`);
  console.log(`   📊 Risk Profile: 1`);
  console.log(`   💡 Insights: ${insights.length}`);
  console.log(`   💳 Credit Health: 1`);
  console.log(`   🔔 Alerts: ${alerts.length}`);
  console.log('\n🔑 Test Credentials:');
  console.log('   Email: john.doe@example.com');
  console.log('   Email: jane.smith@example.com');
  console.log('   Email: admin@example.com');
  console.log('   Password: Password123!');
  console.log('\n📅 Data Range: Last 6 months');
  console.log('💱 Currency: INR (Indian Rupees)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });