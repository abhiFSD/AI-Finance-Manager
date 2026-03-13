import { PrismaClient } from '../generated/prisma';
declare global {
    var prisma: PrismaClient | undefined;
}
export declare const db: PrismaClient<import("../generated/prisma").Prisma.PrismaClientOptions, never, import("../generated/prisma/runtime/library").DefaultArgs>;
export declare function connectDB(): Promise<void>;
export declare function disconnectDB(): Promise<void>;
export declare function checkDatabaseHealth(): Promise<{
    healthy: boolean;
    message: string;
}>;
export default db;
//# sourceMappingURL=database.d.ts.map