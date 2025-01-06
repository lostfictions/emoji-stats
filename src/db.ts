import { PrismaClient } from "@prisma/client";

import { DB_URL, isProd } from "~/env";

// we try to follow the best practices here...
// https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
// ...but it actually seems to make no difference? the client is apparently
// repeatedly initialized either way when a route handler is called.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const initPrisma = () => {
  console.log(`Initializing Prisma client from "${DB_URL}"`);

  return new PrismaClient({
    datasources: { db: { url: DB_URL } },
    // FIXME: make this configurable
    // log: ["query", "info", "warn", "error"],
    log: ["info", "warn", "error"],
  });
};

const prisma = globalForPrisma.prisma || initPrisma();

if (!isProd) globalForPrisma.prisma = prisma;

prisma.$executeRawUnsafe("PRAGMA synchronous = NORMAL;").catch((e: unknown) => {
  throw new Error(`Error setting PRAGMA synchronous:\n${String(e)}`);
});

export default prisma;
