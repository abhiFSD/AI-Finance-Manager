import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Create system categories
  const categories = [
    { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B', isSystem: true },
    { name: 'Transportation', icon: '🚗', color: '#4ECDC4', isSystem: true },
    { name: 'Shopping', icon: '🛍️', color: '#95E77E', isSystem: true },
    { name: 'Entertainment', icon: '🎬', color: '#FFE66D', isSystem: true },
    { name: 'Bills & Utilities', icon: '💡', color: '#A8E6CF', isSystem: true },
    { name: 'Healthcare', icon: '🏥', color: '#FFD3B6', isSystem: true },
    { name: 'Education', icon: '📚', color: '#FFAAA5', isSystem: true },
    { name: 'Income', icon: '💰', color: '#88D8B0', isSystem: true },
    { name: 'Investment', icon: '📈', color: '#B4A7D6', isSystem: true },
    { name: 'Other', icon: '📌', color: '#D3D3D3', isSystem: true },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.name.toLowerCase().replace(/[^a-z]/g, '') },
      update: {},
      create: {
        id: cat.name.toLowerCase().replace(/[^a-z]/g, ''),
        ...cat,
      },
    })
  }

  // Create a demo user
  const hashedPassword = await bcrypt.hash('demo123', 10)
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@financeapp.com' },
    update: {},
    create: {
      email: 'demo@financeapp.com',
      name: 'Demo User',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  })

  // Create demo accounts
  const checking = await prisma.account.create({
    data: {
      userId: user.id,
      name: 'HDFC Savings Account',
      type: 'SAVINGS',
      institution: 'HDFC Bank',
      balance: 125000,
      accountNumber: '****1234',
      lastSynced: new Date(),
    },
  })

  const creditCard = await prisma.account.create({
    data: {
      userId: user.id,
      name: 'ICICI Credit Card',
      type: 'CREDIT_CARD',
      institution: 'ICICI Bank',
      balance: -35000,
      accountNumber: '****5678',
      lastSynced: new Date(),
    },
  })

  console.log('Database seeded successfully!')
  console.log('Demo user created: demo@financeapp.com / demo123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
