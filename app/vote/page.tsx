import { Suspense } from "react";
import { connection } from "next/server";
import { Prisma } from "@prisma/client";
import VoterEntryPage from "@/components/voter-entry-page";
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
    const messageCode = error.message.match(/\bP\d{4}\b/)?.[0];
    return messageCode ??
      (error.errorCode && error.errorCode !== "UNEXPECTED"
        ? error.errorCode
        : "INITIALIZATION");
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return error instanceof Error
    ? error.message.match(/\bP\d{4}\b/)?.[0] ?? null
    : null;
}

function isRetryableDatabaseError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  const code = getDatabaseErrorCode(error);
  return code !== null && RETRYABLE_DATABASE_ERROR_CODES.has(code);
}

function getDatabaseErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return `errorName=${error.name} errorCode=${getDatabaseErrorCode(error) ?? "UNEXPECTED"}`;
  }
  return `errorName=${typeof error} errorCode=${getDatabaseErrorCode(error) ?? "UNKNOWN"}`;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function VoterEntryContent() {
  await connection();
  const enabled = process.env.BALLOTING_ENABLED === "true";
  const now = new Date();
  let elections: { id: string; title: string }[] = [];
  let databaseAvailable = true;
  if (enabled) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        elections = await prisma.election.findMany({
          where: {
            status: { in: ["SCHEDULED", "PUBLISHED", "OPEN"] },
            startsAt: { lte: now },
            endsAt: { gte: now },
            positions: {
              some: { candidates: { some: { status: "APPROVED" } } },
            },
          },
          orderBy: [{ startsAt: "asc" }, { title: "asc" }],
          select: { id: true, title: true },
        });
        break;
      } catch (error) {
        if (attempt < 2 && isRetryableDatabaseError(error)) {
          await delay(200 * (attempt + 1));
          continue;
        }

        databaseAvailable = false;
        console.error(
          `Active voting elections could not be loaded. ${getDatabaseErrorDetails(error)}`,
        );
        break;
      }
    }
  }

  return (
    <VoterEntryPage
      enabled={enabled}
      databaseAvailable={databaseAvailable}
      elections={elections}
    />
  );
}

export default function VotePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[calc(100dvh-66px)] w-full max-w-6xl items-center justify-center px-4 text-center text-sm text-slate-500 sm:px-8">
          Preparing voter access…
        </main>
      }
    >
      <VoterEntryContent />
    </Suspense>
  );
}
