import { PrismaClient, User, SystemSetting, Prisma } from '@prisma/client';

/**
 * Centralized Prisma database client singleton.
 * Prevents multiple instances and connection pool exhaustion across Express hot-reloads.
 */
declare global {
  // Allow global `var` declarations in Node.js environment
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = globalThis.prismaGlobal ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export { User, SystemSetting, Prisma };
