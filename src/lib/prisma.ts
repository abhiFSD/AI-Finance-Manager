import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

export const prisma = globalThis.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    }
  },
})

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

// Connection pool management
export async function connectDB() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

export async function disconnectDB() {
  try {
    await prisma.$disconnect()
    console.log('🔌 Database disconnected successfully')
  } catch (error) {
    console.error('❌ Database disconnection failed:', error)
  }
}

// Health check
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { healthy: true, message: 'Database connection is healthy' }
  } catch (error) {
    console.error('Database health check failed:', error)
    return { healthy: false, message: 'Database connection failed' }
  }
}

export default prisma