import "server-only";

import { ElectionStatus, Prisma } from "@prisma/client";
import { connection } from "next/server";
import {
  decryptVoterField,
} from "@/lib/voter-data-crypto";
import { getEffectiveElectionStatus } from "@/lib/election-schedule";
import { prisma } from "@/lib/prisma";
import type {
  PendingNominationData,
  VoterResultsData,
  VoterPortalData,
} from "@/lib/nomination-types";

const RETRYABLE_DATABASE_ERROR_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
]);
const MAX_VOTER_PORTAL_DATABASE_ATTEMPTS = 4;

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
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : "UNKNOWN";
}

function isRetryableDatabaseError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  return RETRYABLE_DATABASE_ERROR_CODES.has(getDatabaseErrorCode(error));
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function getVoterPortalData(
  section: "overview" | "nominate" | "nominees",
): Promise<VoterPortalData> {
  await connection();

  for (let attempt = 0; attempt < MAX_VOTER_PORTAL_DATABASE_ATTEMPTS; attempt += 1) {
    try {
      const [elections, positions, candidates, approvedNomineesCount] = await Promise.all([
        section === "overview"
          ? prisma.election.findMany({
              where: {
                status: { in: ["SCHEDULED", "PUBLISHED", "OPEN"] },
                startsAt: { not: null },
                endsAt: { gte: new Date() },
              },
              orderBy: [{ startsAt: "asc" }, { title: "asc" }],
              select: {
                id: true,
                title: true,
                status: true,
                startsAt: true,
                endsAt: true,
                timezone: true,
              },
            })
          : Promise.resolve([]),
        section !== "nominees"
          ? prisma.position.findMany({
              where: { election: { status: { not: "ARCHIVED" } } },
              orderBy: [{ election: { startsAt: "asc" } }, { displayOrder: "asc" }],
              select: {
                id: true,
                title: true,
                election: { select: { title: true } },
              },
            })
          : Promise.resolve([]),
        section !== "nominate"
          ? prisma.candidate.findMany({
              where: { status: "APPROVED" },
              orderBy: [
                { election: { startsAt: "asc" } },
                { position: { displayOrder: "asc" } },
                { createdAt: "asc" },
              ],
              select: {
                id: true,
                nameCiphertext: true,
                biography: true,
                photoMimeType: true,
                position: { select: { title: true } },
                election: { select: { title: true } },
              },
              ...(section === "overview" ? { take: 3 } : {}),
            })
          : Promise.resolve([]),
        section === "overview"
          ? prisma.candidate.count({ where: { status: "APPROVED" } })
          : Promise.resolve(undefined),
      ]);

      return {
        databaseStatus: "connected",
        elections: elections.flatMap((election) => {
          if (!election.startsAt || !election.endsAt) {
            return [];
          }

          const effectiveStatus = getEffectiveElectionStatus(election);
          const status =
            effectiveStatus === "OPEN"
              ? "OPEN"
              : effectiveStatus === "PUBLISHED"
                ? "PUBLISHED"
                : "SCHEDULED";

          return [
            {
              id: election.id,
              title: election.title,
              status,
              startsAt: election.startsAt.toISOString(),
              endsAt: election.endsAt.toISOString(),
              timezone: election.timezone,
            },
          ];
        }),
        approvedNomineesCount: approvedNomineesCount ?? candidates.length,
        positions: positions.map((position) => ({
          id: position.id,
          title: position.title,
          electionTitle: position.election.title,
        })),
        nominees: candidates.map((candidate) => ({
          id: candidate.id,
          name: decryptVoterField(candidate.nameCiphertext, "candidate-name"),
          biography: candidate.biography,
          photoUrl:
            candidate.photoMimeType === "image/webp"
              ? `/admin/candidates/${candidate.id}/photo`
              : null,
          positionTitle: candidate.position.title,
          electionTitle: candidate.election.title,
        })),
      };
    } catch (error) {
      if (
        attempt < MAX_VOTER_PORTAL_DATABASE_ATTEMPTS - 1 &&
        isRetryableDatabaseError(error)
      ) {
        await delay(300 * (attempt + 1));
        continue;
      }

      logNominationDataError("voter portal", error, attempt + 1);
      return {
        databaseStatus: "unavailable",
        elections: [],
        approvedNomineesCount: 0,
        positions: [],
        nominees: [],
      };
    }
  }

  throw new Error("Voter portal data retries ended unexpectedly.");
}

export async function getVoterResultsData(): Promise<VoterResultsData> {
  await connection();

  try {
    const resultElectionStatuses: ElectionStatus[] = [
      "SCHEDULED",
      "PUBLISHED",
      "OPEN",
      "CLOSED",
      "RESULTS_PUBLISHED",
      "ARCHIVED",
    ];
    const resultsElectionFilter = {
      election: {
        is: { status: { in: resultElectionStatuses } },
      },
    } satisfies Prisma.BallotWhereInput & Prisma.BallotSelectionWhereInput;
    const [elections, ballotCounts, selectionCounts] = await Promise.all([
      prisma.election.findMany({
        where: {
          status: { in: resultElectionStatuses },
        },
        orderBy: [{ endsAt: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          status: true,
          timezone: true,
          resultsPublishedAt: true,
          startsAt: true,
          endsAt: true,
          positions: {
            orderBy: { displayOrder: "asc" },
            select: {
              id: true,
              title: true,
              candidates: {
                where: { status: { in: ["APPROVED", "INACTIVE"] } },
                select: {
                  id: true,
                  nameCiphertext: true,
                  photoMimeType: true,
                },
              },
            },
          },
        },
      }),
      prisma.ballot.groupBy({
        by: ["electionId"],
        where: resultsElectionFilter,
        _count: { _all: true },
      }),
      prisma.ballotSelection.groupBy({
        by: ["electionId", "positionId", "candidateId"],
        where: resultsElectionFilter,
        _count: { _all: true },
      }),
    ]);

    const ballotsByElection = new Map(
      ballotCounts.map(({ electionId, _count }) => [electionId, _count._all]),
    );
    const votesByCandidate = new Map(
      selectionCounts.map(({ electionId, positionId, candidateId, _count }) => [
        `${electionId}:${positionId}:${candidateId}`,
        _count._all,
      ]),
    );
    return {
      databaseStatus: "connected",
      elections: elections.flatMap((election) => {
        const effectiveStatus = getEffectiveElectionStatus(election);
        if (
          !["OPEN", "CLOSED", "RESULTS_PUBLISHED", "ARCHIVED"].includes(
            effectiveStatus,
          )
        ) {
          return [];
        }

        return [
          {
            id: election.id,
            title: election.title,
            status: effectiveStatus === "OPEN" ? "OPEN" as const : "FINAL" as const,
            resultsAvailableAt:
              (effectiveStatus === "OPEN"
                ? election.startsAt
                : election.resultsPublishedAt ?? election.endsAt)?.toISOString() ?? null,
            timezone: election.timezone,
            ballotsCast: ballotsByElection.get(election.id) ?? 0,
            positions: election.positions.map((position) => {
              const candidates = position.candidates.map((candidate) => ({
                id: candidate.id,
                name: decryptVoterField(candidate.nameCiphertext, "candidate-name"),
                votes:
                  votesByCandidate.get(`${election.id}:${position.id}:${candidate.id}`) ?? 0,
                photoUrl:
                  candidate.photoMimeType === "image/webp"
                    ? `/admin/candidates/${candidate.id}/photo`
                    : null,
              }));

              return {
                id: position.id,
                title: position.title,
                candidates: candidates.map((candidate) => ({
                  ...candidate,
                  percentage: Math.min(candidate.votes * 0.5, 100),
                })),
              };
            }),
          },
        ];
      }),
    };
  } catch (error) {
    logNominationDataError("published voter results", error);
    return { databaseStatus: "unavailable", elections: [] };
  }
}

export async function getPendingNominationData(): Promise<PendingNominationData> {
  await connection();

  for (let attempt = 0; attempt < MAX_VOTER_PORTAL_DATABASE_ATTEMPTS; attempt += 1) {
    try {
      const [applications, approvedApplications] = await Promise.all([
        prisma.candidate.findMany({
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            nameCiphertext: true,
            applicantEmailCiphertext: true,
            applicantPhoneCiphertext: true,
            biography: true,
            photoMimeType: true,
            createdAt: true,
            election: { select: { title: true } },
            position: { select: { title: true } },
          },
        }),
        prisma.candidate.findMany({
          where: { status: "APPROVED" },
          orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            nameCiphertext: true,
            applicantEmailCiphertext: true,
            applicantPhoneCiphertext: true,
            biography: true,
            photoMimeType: true,
            createdAt: true,
            election: { select: { title: true } },
            position: { select: { title: true } },
          },
        }),
      ]);

      return {
        applications: applications.map(mapAdminNomination),
        approvedApplications: approvedApplications.map(mapAdminNomination),
        error: null,
      };
    } catch (error) {
      if (
        attempt < MAX_VOTER_PORTAL_DATABASE_ATTEMPTS - 1 &&
        isRetryableDatabaseError(error)
      ) {
        await delay(300 * (attempt + 1));
        continue;
      }

      logNominationDataError("administrator nomination queue", error, attempt + 1);
      return {
        applications: [],
        approvedApplications: [],
        error: "Nomination applications could not be loaded from the database.",
      };
    }
  }

  throw new Error("Administrator nomination queue retries ended unexpectedly.");
}

function mapAdminNomination(application: {
  id: string;
  nameCiphertext: string;
  applicantEmailCiphertext: string | null;
  applicantPhoneCiphertext: string | null;
  biography: string | null;
  photoMimeType: string | null;
  createdAt: Date;
  election: { title: string };
  position: { title: string };
}) {
  return {
    id: application.id,
    name: decryptVoterField(application.nameCiphertext, "candidate-name"),
    email: application.applicantEmailCiphertext
      ? decryptVoterField(application.applicantEmailCiphertext, "nomination-email")
      : null,
    phone: application.applicantPhoneCiphertext
      ? decryptVoterField(application.applicantPhoneCiphertext, "nomination-phone")
      : null,
    biography: application.biography,
    photoUrl:
      application.photoMimeType === "image/webp"
        ? `/admin/candidates/${application.id}/photo`
        : null,
    electionTitle: application.election.title,
    positionTitle: application.position.title,
    submittedAt: application.createdAt.toISOString(),
  };
}

function logNominationDataError(scope: string, error: unknown, attempts = 1) {
  const errorCode = getDatabaseErrorCode(error);
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(
    `Could not load ${scope} nomination data. errorName=${errorName} errorCode=${errorCode} attempts=${attempts}`,
  );
}
