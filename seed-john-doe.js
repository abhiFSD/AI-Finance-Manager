const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userId = 'cmmelkgj50002zwm31qh20kvh'; // John Doe

async function seed() {
  console.log('🧹 Cleaning old data...');
  
  // Clean up old data
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.budget.deleteMany({ where: { userId } });
  await prisma.goal.deleteMany({ where: { userId } });
  
  console.log('✅ Old data cleaned');
  console.log('💳 Creating accounts...');
  
  // Create accounts
  const salaryAccount = await prisma.account.create({
    data: {
      userId,
      name: 'HDFC Salary Account',
      type: 'SAVINGS',
      institution: 'HDFC Bank',
      accountNumber: '****2852',
      currency: 'INR',
      balance: 125000,
      isActive: true,
    }
  });
  
  const savingsAccount = await prisma.account.create({
    data: {
      userId,
      name: 'SBI Savings',
      type: 'SAVINGS',
      institution: 'State Bank of India',
      accountNumber: '****5638',
      currency: 'INR',
      balance: 250000,
      isActive: true,
    }
  });
  
  const creditCard = await prisma.account.create({
    data: {
      userId,
      name: 'HDFC Credit Card',
      type: 'CREDIT_CARD',
      institution: 'HDFC Bank',
      accountNumber: '****0529',
      currency: 'INR',
      balance: -17879,
      isActive: true,
    }
  });
  
  console.log(`✅ Created 3 accounts`);
  console.log('📊 Creating transactions (last 90 days)...');
  
  // Helper to generate dates
  const daysAgo = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  };
  
  const transactions = [
    // January 2026 - Salary & Fixed Expenses
    { date: daysAgo(60), desc: 'Salary Credit - Tech Corp India Pvt Ltd', amount: 150000, type: 'INCOME', account: salaryAccount.id, category: 'Salary' },
    { date: daysAgo(60), desc: 'Rent Payment - Property Manager', amount: -35000, type: 'EXPENSE', account: salaryAccount.id, category: 'Housing' },
    { date: daysAgo(59), desc: 'Transfer to Savings', amount: -50000, type: 'TRANSFER', account: salaryAccount.id, category: 'Savings' },
    { date: daysAgo(59), desc: 'Transfer from Salary Account', amount: 50000, type: 'TRANSFER', account: savingsAccount.id, category: 'Savings' },
    
    // Regular January expenses
    { date: daysAgo(58), desc: 'UPI-SWIGGY-swiggy.upi@paytm', amount: -1250, type: 'EXPENSE', account: salaryAccount.id, category: 'Food & Dining' },
    { date: daysAgo(58), desc: 'UPI-ZEPTO-zepto@axisbank', amount: -2100, type: 'EXPENSE', account: salaryAccount.id, category: 'Groceries' },
    { date: daysAgo(57), desc: 'UPI-UBER INDIA-uber.india@sc', amount: -580, type: 'EXPENSE', account: salaryAccount.id, category: 'Transportation' },
    { date: daysAgo(56), desc: 'UPI-Amazon Pay-amazonpay@icici', amount: -3499, type: 'EXPENSE', account: salaryAccount.id, category: 'Shopping' },
    { date: daysAgo(55), desc: 'NEFT-Tata Power Mumbai-Electricity Bill', amount: -3800, type: 'EXPENSE', account: salaryAccount.id, category: 'Utilities' },
    { date: daysAgo(54), desc: 'UPI-JIO-jiopay@icici', amount: -599, type: 'EXPENSE', account: salaryAccount.id, category: 'Utilities' },
    { date: daysAgo(53), desc: 'UPI-Netflix India-netflix@ybl', amount: -649, type: 'EXPENSE', account: salaryAccount.id, category: 'Entertainment' },
    { date: daysAgo(52), desc: 'UPI-Spotify India-spotify@paytm', amount: -119, type: 'EXPENSE', account: salaryAccount.id, category: 'Entertainment' },
    
    // Investments
    { date: daysAgo(50), desc: 'UPI-Zerodha-zerodha@ybl', amount: -15000, type: 'EXPENSE', account: salaryAccount.id, category: 'Investment' },
    { date: daysAgo(50), desc: 'UPI-Groww-groww@paytm', amount: -10000, type: 'EXPENSE', account: salaryAccount.id, category: 'Investment' },
    
    // More daily expenses
    { date: daysAgo(48), desc: 'UPI-ZOMATO-zomato@hdfcbank', amount: -890, type: 'EXPENSE', account: salaryAccount.id, category: 'Food & Dining' },
    { date: daysAgo(47), desc: 'UPI-BIG BASKET-bigbasket@icici', amount: -2850, type: 'EXPENSE', account: salaryAccount.id, category: 'Groceries' },
    { date: daysAgo(45), desc: 'UPI-BookMyShow-bookmyshow@axis', amount: -650, type: 'EXPENSE', account: salaryAccount.id, category: 'Entertainment' },
    { date: daysAgo(44), desc: 'ATM Withdrawal-HDFC ATM Andheri', amount: -10000, type: 'EXPENSE', account: salaryAccount.id, category: 'Cash' },
    { date: daysAgo(43), desc: 'UPI-SWIGGY-swiggy.upi@paytm', amount: -1580, type: 'EXPENSE', account: salaryAccount.id, category: 'Food & Dining' },
    { date: daysAgo(42), desc: 'UPI-Flipkart-flipkart@axisbank', amount: -5999, type: 'EXPENSE', account: salaryAccount.id, category: 'Shopping' },
    
    // February 2026 - Salary & Expenses
    { date: daysAgo(30), desc: 'Salary Credit - Tech Corp India Pvt Ltd', amount: 150000, type: 'INCOME', account: salaryAccount.id, category: 'Salary' },
    { date: daysAgo(30), desc: 'Rent Payment - Property Manager', amount: -35000, type: 'EXPENSE', account: salaryAccount.id, category: 'Housing' },
    { date: daysAgo(29), desc: 'Transfer to Savings', amount: -50000, type: 'TRANSFER', account: salaryAccount.id, category: 'Savings' },
    { date: daysAgo(29), desc: 'Transfer from Salary Account', amount: 50000, type: 'TRANSFER', account: savingsAccount.id, category: 'Savings' },
    
    // February expenses
    { date: daysAgo(28), desc: 'UPI-Apollo Pharmacy-apollo@ybl', amount: -850, type: 'EXPENSE', account: salaryAccount.id, category: 'Healthcare' },
    { date: daysAgo(27), desc: 'UPI-Dunzo-dunzo@icici', amount: -380, type: 'EXPENSE', account: salaryAccount.id, category: 'Shopping' },
    { date: daysAgo(26), desc: 'NEFT-Tata Power Mumbai-Electricity Bill', amount: -4100, type: 'EXPENSE', account: salaryAccount.id, category: 'Utilities' },
    { date: daysAgo(25), desc: 'UPI-JIO-jiopay@icici', amount: -599, type: 'EXPENSE', account: salaryAccount.id, category: 'Utilities' },
    { date: daysAgo(24), desc: 'UPI-Uber Eats-ubereats@paytm', amount: -780, type: 'EXPENSE', account: salaryAccount.id, category: 'Food & Dining' },
    { date: daysAgo(23), desc: 'UPI-Zepto-zepto@axisbank', amount: -1950, type: 'EXPENSE', account: salaryAccount.id, category: 'Groceries' },
    { date: daysAgo(22), desc: 'UPI-OLA-ola@sbi', amount: -420, type: 'EXPENSE', account: salaryAccount.id, category: 'Transportation' },
    
    // Investments
    { date: daysAgo(20), desc: 'UPI-Zerodha-zerodha@ybl', amount: -15000, type: 'EXPENSE', account: salaryAccount.id, category: 'Investment' },
    { date: daysAgo(20), desc: 'UPI-Groww-groww@paytm', amount: -10000, type: 'EXPENSE', account: salaryAccount.id, category: 'Investment' },
    { date: daysAgo(20), desc: 'UPI-INDmoney-indmoney@paytm', amount: -5000, type: 'EXPENSE', account: salaryAccount.id, category: 'Investment' },
    
    // More February
    { date: daysAgo(18), desc: 'UPI-ZOMATO-zomato@hdfcbank', amount: -1200, type: 'EXPENSE', account: salaryAccount.id, category: 'Food & Dining' },
    { date: daysAgo(17), desc: 'UPI-Amazon-amazonpay@icici', amount: -2599, type: 'EXPENSE', account: salaryAccount.id, category: 'Shopping' },
    { date: daysAgo(16), desc: 'UPI-Myntra-myntra@axis', amount: -3200, type: 'EXPENSE', account: salaryAccount.id, category: 'Shopping' },
    { date: daysAgo(15), desc: 'ATM Withdrawal-SBI ATM BKC', amount: -8000, type: 'EXPENSE', account: savingsAccount.id, category: 'Cash' },
    { date: daysAgo(14), desc: 'UPI-Dominos Pizza-dominos@hdfcbank', amount: -980, type: 'EXPENSE', account: salaryAccount.id, category: 'Food & Dining' },
    { date: daysAgo(13), desc: 'UPI-Starbucks-starbucks@icici', amount: -650, type: 'EXPENSE', account: salaryAccount.id, category: 'Food & Dining' },
    { date: daysAgo(12), desc: 'UPI-Cult.fit-cultfit@ybl', amount: -1999, type: 'EXPENSE', account: salaryAccount.id, category: 'Healthcare' },
    
    // Credit Card Payment
    { date: daysAgo(10), desc: 'CC Payment-HDFC Credit Card', amount: -17879, type: 'EXPENSE', account: salaryAccount.id, category: 'Bill Payment' },
    
    // March 2026 - Most Recent
    { date: daysAgo(5), desc: 'Salary Credit - Tech Corp India Pvt Ltd', amount: 150000, type: 'INCOME', account: salaryAccount.id, category: 'Salary' },
    { date: daysAgo(5), desc: 'Performance Bonus', amount: 25000, type: 'INCOME', account: salaryAccount.id, category: 'Bonus' },
    { date: daysAgo(4), desc: 'Rent Payment - Property Manager', amount: -35000, type: 'EXPENSE', account: salaryAccount.id, category: 'Housing' },
    { date: daysAgo(4), desc: 'Transfer to Savings', amount: -60000, type: 'TRANSFER', account: salaryAccount.id, category: 'Savings' },
    { date: daysAgo(4), desc: 'Transfer from Salary Account', amount: 60000, type: 'TRANSFER', account: savingsAccount.id, category: 'Savings' },
    
    // Recent March expenses
    { date: daysAgo(3), desc: 'UPI-SWIGGY-swiggy.upi@paytm', amount: -1100, type: 'EXPENSE', account: salaryAccount.id, category: 'Food & Dining' },
    { date: daysAgo(3), desc: 'UPI-Zepto-zepto@axisbank', amount: -2200, type: 'EXPENSE', account: salaryAccount.id, category: 'Groceries' },
    { date: daysAgo(2), desc: 'UPI-UBER-uber.india@sc', amount: -380, type: 'EXPENSE', account: salaryAccount.id, category: 'Transportation' },
    { date: daysAgo(2), desc: 'NEFT-Tata Power Mumbai-Electricity Bill', amount: -3600, type: 'EXPENSE', account: salaryAccount.id, category: 'Utilities' },
    { date: daysAgo(1), desc: 'UPI-JIO-jiopay@icici', amount: -599, type: 'EXPENSE', account: salaryAccount.id, category: 'Utilities' },
    { date: daysAgo(1), desc: 'UPI-Netflix India-netflix@ybl', amount: -649, type: 'EXPENSE', account: salaryAccount.id, category: 'Entertainment' },
    { date: daysAgo(0), desc: 'UPI-Amazon-amazonpay@icici', amount: -4999, type: 'EXPENSE', account: salaryAccount.id, category: 'Shopping' },
  ];
  
  // Create categories first
  const categories = {};
  const categoryNames = ['Salary', 'Bonus', 'Housing', 'Savings', 'Food & Dining', 'Groceries', 'Transportation', 
                         'Shopping', 'Utilities', 'Entertainment', 'Investment', 'Healthcare', 'Cash', 'Bill Payment'];
  
  for (const catName of categoryNames) {
    const existing = await prisma.category.findFirst({ where: { name: catName, userId } });
    if (existing) {
      categories[catName] = existing.id;
    } else {
      const created = await prisma.category.create({
        data: {
          userId,
          name: catName,
          type: ['Salary', 'Bonus'].includes(catName) ? 'INCOME' : 'EXPENSE',
          icon: '💰',
        }
      });
      categories[catName] = created.id;
    }
  }
  
  // Insert transactions
  let count = 0;
  for (const txn of transactions) {
    await prisma.transaction.create({
      data: {
        userId,
        accountId: txn.account,
        date: txn.date,
        description: txn.desc,
        amount: txn.amount,
        type: txn.type,
        categoryId: categories[txn.category] || null,
      }
    });
    count++;
  }
  
  console.log(`✅ Created ${count} transactions`);
  
  // Update account balances based on transactions
  console.log('💰 Updating account balances...');
  const accounts = [salaryAccount, savingsAccount, creditCard];
  for (const acc of accounts) {
    const txns = await prisma.transaction.findMany({
      where: { accountId: acc.id }
    });
    const balance = txns.reduce((sum, t) => sum + t.amount, 0);
    await prisma.account.update({
      where: { id: acc.id },
      data: { balance }
    });
  }
  
  console.log('✅ Account balances updated');
  console.log('🎯 Creating a financial goal...');
  
  await prisma.goal.create({
    data: {
      userId,
      name: 'Emergency Fund',
      targetAmount: 500000,
      currentAmount: 250000,
      deadline: new Date('2026-12-31'),
      category: 'EMERGENCY_FUND',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
    }
  });
  
  console.log('✅ Goal created');
  console.log('📊 Creating budget for March...');
  
  await prisma.budget.create({
    data: {
      userId,
      name: 'March 2026 Budget',
      amount: 50000,
      period: 'MONTHLY',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-31'),
      categoryId: categories['Shopping'],
    }
  });
  
  console.log('✅ Budget created');
  console.log('');
  console.log('🎉 SEED COMPLETE!');
  console.log('📊 Summary:');
  console.log(`   - 3 accounts created`);
  console.log(`   - ${count} transactions (last 90 days)`);
  console.log(`   - ${categoryNames.length} categories`);
  console.log(`   - 1 goal`);
  console.log(`   - 1 budget`);
  console.log('');
  console.log('💡 Test with: john.doe@example.com / Password123!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
