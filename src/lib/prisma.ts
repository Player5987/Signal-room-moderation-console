// A single shared Prisma client. Next.js hot-reloads in dev, which would
// otherwise create a new database connection on every reload until you run out.
// Caching it on globalThis prevents that.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
