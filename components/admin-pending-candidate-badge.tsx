import { Prisma } from "@prisma/client";
import { setTimeout as delay } from "node:timers/promises";
import { prisma } from "@/lib/prisma";

const RETRYABLE_DATABASE_ERROR_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
]);

function getDatabaseErrorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code;
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return error.message.match(/\bP\d{4}\b/)?.[0] ?? error.errorCode ?? "INITIALIZATION";
  }
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : "UNKNOWN";
}

function isRetryableDatabaseError(error: unknown) {
  return (
    RETRYABLE_DATABASE_ERROR_CODES.has(getDatabaseErrorCode(error)) ||
    (error instanceof Prisma.PrismaClientInitializationError &&
      /can't reach database server/i.test(error.message))
  );
}

async function getPendingCandidateCount() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.candidate.count({
        where: { status: "PENDING" },
      });
    } catch (error) {
      if (attempt === 2 || !isRetryableDatabaseError(error)) {
        throw error;
      }
      await delay(250 * (attempt + 1));
    }
  }
  throw new Error("Pending candidate count retries ended unexpectedly.");
}

export default async function AdminPendingCandidateBadge() {
  let count: number | null;
  try {
    count = await getPendingCandidateCount();
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorCode = getDatabaseErrorCode(error);
    console.error(
      `Pending candidate count could not be loaded. errorName=${errorName} errorCode=${errorCode}`,
    );
    count = null;
  }

  if (count === 0) {
    return null;
  }
  if (count === null) {
    return (
      <span
        aria-label="Pending candidate count unavailable"
        title="Pending candidate count unavailable"
        className="ml-auto inline-flex size-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800"
      >
        —
      </span>
    );
  }

  return (
    <span
      aria-label={`${count} pending candidate applications`}
      className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
