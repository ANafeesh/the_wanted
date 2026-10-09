import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma Client instance.
 */
export const prisma = new PrismaClient();
