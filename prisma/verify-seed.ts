import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySeed() {
  console.log('🔍 Verifying seeded data...\n');

  try {
    // Check users
    const userCount = await prisma.user.count();
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    console.log(`👤 Users: ${userCount} (${adminCount} admin, ${userCount - adminCount} regular)`);

    // Check accounts
    const accountCount = await prisma.account.count();
    const accountTypes = await prisma.account.groupBy({
      by: ['type'],
      _count: { type: true },
    });
    console.log(`🏦 Accounts: ${accountCount}`);
    accountTypes.forEach(type => 
      console.log(`   - ${type.type}: ${type._count.type}`)
    );

    // Check transactions
    const transactionCount = await prisma.transaction.count();
    const incomeCount = await prisma.transaction.count({ where: { type: 'INCOME' } });
    const expenseCount = await prisma.transaction.count({ where: { type: 'EXPENSE' } });
    console.log(`💳 Transactions: ${transactionCount}`);
    console.log(`   - Income: ${incomeCount} (${Math.round(incomeCount/transactionCount*100)}%)`);
    console.log(`   - Expense: ${expenseCount} (${Math.round(expenseCount/transactionCount*100)}%)`);

    // Check categories
    const categoryCount = await prisma.category.count();
    const systemCategories = await prisma.category.count({ where: { isSystem: true } });
    console.log(`📂 Categories: ${categoryCount}`);
    console.log(`   - System: ${systemCategories}`);
    console.log(`   - Custom: ${categoryCount - systemCategories}`);

    // Check budgets
    const budgetCount = await prisma.budget.count();
    console.log(`💰 Budgets: ${budgetCount}`);

    // Check documents
    const documentCount = await prisma.document.count();
    const processedDocs = await prisma.document.count({ where: { status: 'COMPLETED' } });
    console.log(`📄 Documents: ${documentCount}`);
    console.log(`   - Processed: ${processedDocs}`);

    // Check data distribution per user
    console.log('\n📊 Data distribution per user:');
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
    });

    for (const user of users) {
      const userAccounts = await prisma.account.count({ where: { userId: user.id } });
      const userTransactions = await prisma.transaction.count({ where: { userId: user.id } });
      const userBudgets = await prisma.budget.count({ where: { userId: user.id } });
      
      console.log(`   ${user.name} (${user.email}):`);
      console.log(`     - Accounts: ${userAccounts}`);
      console.log(`     - Transactions: ${userTransactions}`);
      console.log(`     - Budgets: ${userBudgets}`);
    }

    // Check date range
    const dateRange = await prisma.transaction.aggregate({
      _min: { date: true },
      _max: { date: true },
    });
    console.log(`\n📅 Transaction date range:`);
    console.log(`   From: ${dateRange._min.date?.toLocaleDateString()}`);
    console.log(`   To: ${dateRange._max.date?.toLocaleDateString()}`);

    // Check amount ranges
    const amountStats = await prisma.transaction.aggregate({
      _min: { amount: true },
      _max: { amount: true },
      _avg: { amount: true },
    });
    console.log(`\n💵 Transaction amounts (INR):`);
    console.log(`   Min: ₹${amountStats._min.amount?.toFixed(2)}`);
    console.log(`   Max: ₹${amountStats._max.amount?.toFixed(2)}`);
    console.log(`   Avg: ₹${amountStats._avg.amount?.toFixed(2)}`);

    // Check account balances
    const balanceStats = await prisma.account.aggregate({
      _sum: { balance: true },
      _avg: { balance: true },
    });
    console.log(`\n🏦 Account balances (INR):`);
    console.log(`   Total: ₹${balanceStats._sum.balance?.toFixed(2)}`);
    console.log(`   Average: ₹${balanceStats._avg.balance?.toFixed(2)}`);

    console.log('\n✅ Seed verification completed successfully!');
    console.log('\n🔑 Test login credentials:');
    console.log('   📧 john.doe@example.com / Password123!');
    console.log('   📧 jane.smith@example.com / Password123!');
    console.log('   📧 admin@example.com / Password123! (admin)');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifySeed()
  .finally(async () => {
    await prisma.$disconnect();
  });