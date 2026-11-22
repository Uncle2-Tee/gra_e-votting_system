import { PrismaClient } from "@prisma/client";

const runtimeDatabaseUrl =
  process.env.NODE_ENV === "development"
    ? process.env.DIRECT_URL ?? process.env.DATABASE_URL
    : process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!runtimeDatabaseUrl) {
  throw new Error("DATABASE_URL must be configured.");
}

const runtimeDatabase = new URL(runtimeDatabaseUrl);
if (
  /\.supabase\.(?:com|co)$/i.test(runtimeDatabase.hostname) &&
  !runtimeDatabase.searchParams.has("sslmode")
) {
  runtimeDatabase.searchParams.set("sslmode", "require");
}
if (!runtimeDatabase.searchParams.has("connection_limit")) {
  runtimeDatabase.searchParams.set("connection_limit", "3");
}
if (!runtimeDatabase.searchParams.has("pool_timeout")) {
  runtimeDatabase.searchParams.set("pool_timeout", "5");
}
if (!runtimeDatabase.searchParams.has("connect_timeout")) {
  runtimeDatabase.searchParams.set("connect_timeout", "5");
}

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    datasources: { db: { url: runtimeDatabase.toString() } },
    log: process.env.NODE_ENV === "development" ? ["warn"] : ["error"],
  });

globalThis.prisma = prisma;
