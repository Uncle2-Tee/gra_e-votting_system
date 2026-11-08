import { PrismaClient } from "@prisma/client";

const runtimeDatabaseUrl = process.env.DATABASE_URL;
if (!runtimeDatabaseUrl) {
  throw new Error("DATABASE_URL must be configured.");
}

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    datasources: { db: { url: runtimeDatabaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
