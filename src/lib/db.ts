// Prisma Client is generated to src/generated/prisma and is gitignored: run
// `npx prisma generate` after a clone or a schema edit.
//
// Kept on globalThis in development because Next's hot reload re-evaluates
// modules, and a fresh client per reload exhausts connections.
import { PrismaClient } from '@/generated/prisma';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
