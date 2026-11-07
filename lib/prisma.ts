import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ??
  (process.env.NODE_ENV === "development" && process.env.DIRECT_URL
    ? new PrismaClient({
        datasources: { db: { url: process.env.DIRECT_URL } },
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      })
    : new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      }));

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
