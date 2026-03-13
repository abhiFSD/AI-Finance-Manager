const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userId = 'cmmelkgj50002zwm31qh20kvh';

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  console.log('🧹 Cleaning old data...');
  
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  
  console.log('✅ Cleaned');
  console.log('💳 Creating accounts...');
  
  const acc1 = await prisma.account.create({
    data: {
      userId,
      name: 'HDFC Salary Account',
      type: 'SAVINGS',
      institution: 'HDFC Bank',
      accountNumber: '****2852',
      balance: 0, // Will calculate from transactions
      currency: 'INR',
      isActive: true,
    }
  });
  
  const acc2 = await prisma.account.create({
    data: {
      userId,
      name: 'SBI Savings',
      type: 'SAVINGS',
      institution: 'State Bank of India',
      accountNumber: '****5638',
      balance: 0,
      currency: 'INR',
      isActive: true,
    }
  });
  
  console.log('✅ Created 2 accounts');
  console.log('📁 Creating categories...');
  
  const cats = {};
  const catList = [
    { name: 'Salary', type: 'INCOME' },
    { name: 'Bonus', type: 'INCOME' },
    { name: 'Housing', type: 'EXPENSE' },
    { name: 'Food & Dining', type: 'EXPENSE' },
    { name: 'Groceries', type: 'EXPENSE' },
    { name: 'Transportation', type: 'EXPENSE' },
    { name: 'Shopping', type: 'EXPENSE' },
    { name: 'Utilities', type: 'EXPENSE' },
    { name: 'Entertainment', type: 'EXPENSE' },
    { name: 'Investment', type: 'EXPENSE' },
    { name: 'Healthcare', type: 'EXPENSE' },
  ];
  
  for (const c of catList) {
    const cat = await prisma.category.create({
      data: { userId, name: c.name, icon: '💰' }
    });
    cats[c.name] = cat.id;
  }
  
  console.log(`✅ Created ${catList.length} categories`);
  console.log('💰 Creating transactions...');
  
  const txns = [
    // 60 days ago
    { days: 60, desc: 'Salary Credit - Tech Corp India', merchant: 'Tech Corp India', amount: 150000, type: 'INCOME', acc: acc1.id, cat: 'Salary' },
    { days: 60, desc: 'Rent Payment', merchant: 'Property Manager', amount: -35000, type: 'EXPENSE', acc: acc1.id, cat: 'Housing' },
    { days: 59, desc: 'UPI-SWIGGY', merchant: 'Swiggy', amount: -1250, type: 'EXPENSE', acc: acc1.id, cat: 'Food & Dining' },
    { days: 58, desc: 'UPI-Zepto', merchant: 'Zepto', amount: -2100, type: 'EXPENSE', acc: acc1.id, cat: 'Groceries' },
    { days: 57, desc: 'UPI-UBER INDIA', merchant: 'Uber', amount: -580, type: 'EXPENSE', acc: acc1.id, cat: 'Transportation' },
    { days: 56, desc: 'UPI-Amazon Pay', merchant: 'Amazon', amount: -3499, type: 'EXPENSE', acc: acc1.id, cat: 'Shopping' },
    { days: 55, desc: 'NEFT-Tata Power-Electricity', merchant: 'Tata Power', amount: -3800, type: 'EXPENSE', acc: acc1.id, cat: 'Utilities' },
    { days: 54, desc: 'UPI-JIO', merchant: 'Jio', amount: -599, type: 'EXPENSE', acc: acc1.id, cat: 'Utilities' },
    { days: 53, desc: 'UPI-Netflix India', merchant: 'Netflix', amount: -649, type: 'EXPENSE', acc: acc1.id, cat: 'Entertainment' },
    { days: 50, desc: 'UPI-Zerodha', merchant: 'Zerodha', amount: -15000, type: 'EXPENSE', acc: acc1.id, cat: 'Investment' },
    { days: 50, desc: 'UPI-Groww', merchant: 'Groww', amount: -10000, type: 'EXPENSE', acc: acc1.id, cat: 'Investment' },
    { days: 48, desc: 'UPI-ZOMATO', merchant: 'Zomato', amount: -890, type: 'EXPENSE', acc: acc1.id, cat: 'Food & Dining' },
    { days: 47, desc: 'UPI-BIG BASKET', merchant: 'Big Basket', amount: -2850, type: 'EXPENSE', acc: acc1.id, cat: 'Groceries' },
    { days: 45, desc: 'UPI-BookMyShow', merchant: 'BookMyShow', amount: -650, type: 'EXPENSE', acc: acc1.id, cat: 'Entertainment' },
    { days: 44, desc: 'ATM Withdrawal-HDFC ATM', merchant: 'HDFC Bank', amount: -10000, type: 'EXPENSE', acc: acc1.id, cat: 'Shopping' },
    { days: 43, desc: 'UPI-SWIGGY', merchant: 'Swiggy', amount: -1580, type: 'EXPENSE', acc: acc1.id, cat: 'Food & Dining' },
    { days: 42, desc: 'UPI-Flipkart', merchant: 'Flipkart', amount: -5999, type: 'EXPENSE', acc: acc1.id, cat: 'Shopping' },
    
    // 30 days ago
    { days: 30, desc: 'Salary Credit - Tech Corp India', merchant: 'Tech Corp India', amount: 150000, type: 'INCOME', acc: acc1.id, cat: 'Salary' },
    { days: 30, desc: 'Rent Payment', merchant: 'Property Manager', amount: -35000, type: 'EXPENSE', acc: acc1.id, cat: 'Housing' },
    { days: 28, desc: 'UPI-Apollo Pharmacy', merchant: 'Apollo Pharmacy', amount: -850, type: 'EXPENSE', acc: acc1.id, cat: 'Healthcare' },
    { days: 27, desc: 'UPI-Dunzo', merchant: 'Dunzo', amount: -380, type: 'EXPENSE', acc: acc1.id, cat: 'Shopping' },
    { days: 26, desc: 'NEFT-Tata Power-Electricity', merchant: 'Tata Power', amount: -4100, type: 'EXPENSE', acc: acc1.id, cat: 'Utilities' },
    { days: 25, desc: 'UPI-JIO', merchant: 'Jio', amount: -599, type: 'EXPENSE', acc: acc1.id, cat: 'Utilities' },
    { days: 24, desc: 'UPI-Uber Eats', merchant: 'Uber Eats', amount: -780, type: 'EXPENSE', acc: acc1.id, cat: 'Food & Dining' },
    { days: 23, desc: 'UPI-Zepto', merchant: 'Zepto', amount: -1950, type: 'EXPENSE', acc: acc1.id, cat: 'Groceries' },
    { days: 22, desc: 'UPI-OLA', merchant: 'Ola', amount: -420, type: 'EXPENSE', acc: acc1.id, cat: 'Transportation' },
    { days: 20, desc: 'UPI-Zerodha', merchant: 'Zerodha', amount: -15000, type: 'EXPENSE', acc: acc1.id, cat: 'Investment' },
    { days: 20, desc: 'UPI-Groww', merchant: 'Groww', amount: -10000, type: 'EXPENSE', acc: acc1.id, cat: 'Investment' },
    { days: 18, desc: 'UPI-ZOMATO', merchant: 'Zomato', amount: -1200, type: 'EXPENSE', acc: acc1.id, cat: 'Food & Dining' },
    { days: 17, desc: 'UPI-Amazon', merchant: 'Amazon', amount: -2599, type: 'EXPENSE', acc: acc1.id, cat: 'Shopping' },
    { days: 16, desc: 'UPI-Myntra', merchant: 'Myntra', amount: -3200, type: 'EXPENSE', acc: acc1.id, cat: 'Shopping' },
    { days: 15, desc: 'ATM Withdrawal-SBI ATM', merchant: 'SBI Bank', amount: -8000, type: 'EXPENSE', acc: acc2.id, cat: 'Shopping' },
    { days: 14, desc: 'UPI-Dominos Pizza', merchant: 'Dominos', amount: -980, type: 'EXPENSE', acc: acc1.id, cat: 'Food & Dining' },
    { days: 13, desc: 'UPI-Starbucks', merchant: 'Starbucks', amount: -650, type: 'EXPENSE', acc: acc1.id, cat: 'Food & Dining' },
    { days: 12, desc: 'UPI-Cult.fit', merchant: 'Cult.fit', amount: -1999, type: 'EXPENSE', acc: acc1.id, cat: 'Healthcare' },
    
    // Recent - March
    { days: 5, desc: 'Salary Credit - Tech Corp India', merchant: 'Tech Corp India', amount: 150000, type: 'INCOME', acc: acc1.id, cat: 'Salary' },
    { days: 5, desc: 'Performance Bonus', merchant: 'Tech Corp India', amount: 25000, type: 'INCOME', acc: acc1.id, cat: 'Bonus' },
    { days: 4, desc: 'Rent Payment', merchant: 'Property Manager', amount: -35000, type: 'EXPENSE', acc: acc1.id, cat: 'Housing' },
    { days: 3, desc: 'UPI-SWIGGY', merchant: 'Swiggy', amount: -1100, type: 'EXPENSE', acc: acc1.id, cat: 'Food & Dining' },
    { days: 3, desc: 'UPI-Zepto', merchant: 'Zepto', amount: -2200, type: 'EXPENSE', acc: acc1.id, cat: 'Groceries' },
    { days: 2, desc: 'UPI-UBER', merchant: 'Uber', amount: -380, type: 'EXPENSE', acc: acc1.id, cat: 'Transportation' },
    { days: 2, desc: 'NEFT-Tata Power-Electricity', merchant: 'Tata Power', amount: -3600, type: 'EXPENSE', acc: acc1.id, cat: 'Utilities' },
    { days: 1, desc: 'UPI-JIO', merchant: 'Jio', amount: -599, type: 'EXPENSE', acc: acc1.id, cat: 'Utilities' },
    { days: 1, desc: 'UPI-Netflix India', merchant: 'Netflix', amount: -649, type: 'EXPENSE', acc: acc1.id, cat: 'Entertainment' },
    { days: 0, desc: 'UPI-Amazon', merchant: 'Amazon', amount: -4999, type: 'EXPENSE', acc: acc1.id, cat: 'Shopping' },
  ];
  
  for (const t of txns) {
    await prisma.transaction.create({
      data: {
        userId,
        accountId: t.acc,
        date: daysAgo(t.days),
        description: t.desc,
        merchantName: t.merchant,
        amount: t.amount,
        type: t.type,
        categoryId: cats[t.cat],
        tags: '',
        isRecurring: false,
      }
    });
  }
  
  console.log(`✅ Created ${txns.length} transactions`);
  console.log('💰 Updating account balances...');
  
  const bal1 = await prisma.transaction.aggregate({
    where: { accountId: acc1.id },
    _sum: { amount: true }
  });
  
  const bal2 = await prisma.transaction.aggregate({
    where: { accountId: acc2.id },
    _sum: { amount: true }
  });
  
  await prisma.account.update({
    where: { id: acc1.id },
    data: { balance: bal1._sum.amount || 0 }
  });
  
  await prisma.account.update({
    where: { id: acc2.id },
    data: { balance: bal2._sum.amount || 0 }
  });
  
  console.log('✅ Balances updated');
  console.log('');
  console.log('🎉 SEED COMPLETE!');
  console.log(`   - 2 accounts`);
  console.log(`   - ${catList.length} categories`);
  console.log(`   - ${txns.length} transactions`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
