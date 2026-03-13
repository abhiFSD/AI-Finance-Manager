"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.connectDB = connectDB;
exports.disconnectDB = disconnectDB;
exports.checkDatabaseHealth = checkDatabaseHealth;
const prisma_1 = require("../generated/prisma");
exports.db = globalThis.prisma || new prisma_1.PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        }
    },
});
if (process.env.NODE_ENV !== 'production')
    globalThis.prisma = exports.db;
// Connection pool management
async function connectDB() {
    try {
        await exports.db.$connect();
        console.log('✅ Database connected successfully');
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}
async function disconnectDB() {
    try {
        await exports.db.$disconnect();
        console.log('🔌 Database disconnected successfully');
    }
    catch (error) {
        console.error('❌ Database disconnection failed:', error);
    }
}
// Health check
async function checkDatabaseHealth() {
    try {
        await exports.db.$queryRaw `SELECT 1`;
        return { healthy: true, message: 'Database connection is healthy' };
    }
    catch (error) {
        console.error('Database health check failed:', error);
        return { healthy: false, message: 'Database connection failed' };
    }
}
exports.default = exports.db;
//# sourceMappingURL=database.js.map