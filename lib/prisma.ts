import { PrismaClient } from "@prisma/client";

const runtimeDatabaseUrl = process.env.DATABASE_URL;
if (!runtimeDatabaseUrl) {
  throw new Error("DATABASE_URL must be configured.");
}

const runtimeDatabase = new URL(runtimeDatabaseUrl);
if (!runtimeDatabase.searchParams.has("connection_limit")) {
  runtimeDatabase.searchParams.set("connection_limit", "3");
}
if (!runtimeDatabase.searchParams.has("pool_timeout")) {
  runtimeDatabase.searchParams.set("pool_timeout", "20");
}

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    datasources: { db: { url: runtimeDatabase.toString() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
