import { Suspense } from "react";
import { connection } from "next/server";
import { Prisma } from "@prisma/client";
import VoterEntryPage from "@/components/voter-entry-page";
import PageLoading from "@/components/page-loading";
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

async function VoterEntryContent({
  searchParams,
}: {
  searchParams: Promise<{ electionId?: string }>;
}) {
  await connection();
  const query = await searchParams;
  const enabled = process.env.BALLOTING_ENABLED === "true";
  const now = new Date();
  let elections: { id: string; title: string }[] = [];
  let upcomingElections: {
    id: string;
    title: string;
    startsAt: string;
    timezone: string;
  }[] = [];
  let databaseAvailable = true;
  if (enabled) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const scheduledElections = await prisma.election.findMany({
          where: {
            status: { in: ["SCHEDULED", "PUBLISHED", "OPEN"] },
            startsAt: { not: null },
            endsAt: { gte: now },
            positions: {
              some: {
                includedInElection: true,
                candidates: { some: { status: "APPROVED" } },
              },
            },
          },
          orderBy: [{ startsAt: "asc" }, { title: "asc" }],
          select: {
            id: true,
            title: true,
            startsAt: true,
            timezone: true,
          },
        });
        elections = scheduledElections
          .filter((election) => election.startsAt && election.startsAt <= now)
          .map(({ id, title }) => ({ id, title }));
        upcomingElections = scheduledElections.flatMap((election) =>
          election.startsAt && election.startsAt > now
            ? [{
                id: election.id,
                title: election.title,
                startsAt: election.startsAt.toISOString(),
                timezone: election.timezone,
              }]
            : [],
        );
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
      upcomingElections={upcomingElections}
      initialElectionId={query.electionId ?? ""}
    />
  );
}

export default function VoterAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ electionId?: string }>;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <VoterEntryContent searchParams={searchParams} />
    </Suspense>
  );
}
