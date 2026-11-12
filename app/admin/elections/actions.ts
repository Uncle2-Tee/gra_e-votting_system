"use server";

import type { ElectionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCurrentAdmin,
  isAdminDatabaseUnavailableError,
} from "@/lib/admin-security";
import {
  canAcceptPreElectionChanges,
  getEffectiveElectionStatus,
  parseElectionDateTime,
  synchronizeElectionStatuses,
} from "@/lib/election-schedule";
import { ELECTION_TIMEZONE } from "@/lib/election-timezone";
import {
  hasValidPositionNames,
  MAX_ELECTION_POSITIONS,
  MAX_POSITION_TITLE_LENGTH,
} from "@/lib/candidate-positions";
import { prisma } from "@/lib/prisma";

export type ElectionActionState = {
  error: string | null;
  success: string | null;
};

export type UpdateElectionScheduleState = ElectionActionState;
export type AddElectionPositionsState = ElectionActionState;
export type RemoveElectionPositionState = ElectionActionState;
export type DeleteElectionState = ElectionActionState;
export type AddDraftElectionPositionState = ElectionActionState & {
  electionId: string | null;
  positions: { id: string; title: string }[];
};

const INITIAL_STATE: ElectionActionState = { error: null, success: null };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHUNK_SIZE = 500;

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getElectionActionErrorCode(error: unknown) {
  if (!(error instanceof Error)) {
    return "UNKNOWN";
  }
  if ("code" in error && typeof error.code === "string" && /^P\d{4}$/.test(error.code)) {
    return error.code;
  }
  if ("errorCode" in error && typeof error.errorCode === "string") {
    return error.errorCode;
  }
  return (
    error.message.match(/\bP\d{4}\b/)?.[0] ??
    (/can't reach database server/i.test(error.message) ? "P1001" : "UNKNOWN")
  );
}

function logElectionActionFailure(action: string, error: unknown) {
  const errorCode = getElectionActionErrorCode(error);
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(`${action} errorName=${errorName} errorCode=${errorCode}`);
}

function isRetryableDatabaseConnectionFailure(error: unknown) {
  const errorCode = getElectionActionErrorCode(error);
  return (
    ["P1001", "P1002", "P2024"].includes(errorCode) ||
    (error instanceof Error && /can't reach database server/i.test(error.message))
  );
}

async function retryDatabaseConnection<T>(operation: () => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === 2 || !isRetryableDatabaseConnectionFailure(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw new Error("Database retry attempts ended unexpectedly.");
}

export async function addDraftElectionPosition(
  previousState: AddDraftElectionPositionState,
  formData: FormData,
): Promise<AddDraftElectionPositionState> {
  const withError = (error: string, electionId = previousState.electionId) => ({
    ...previousState,
    error,
    success: null,
    electionId,
  });

  let admin: Awaited<ReturnType<typeof getCurrentAdmin>>;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    return withError(
      "Positions cannot be added right now because the database is unavailable.",
    );
  }

  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return withError("You are not authorized to configure election positions.");
  }

  const positionName = (
    readText(formData, "customPosition") ||
    readText(formData, "standardPosition")
  ).normalize("NFKC");
  const electionIdValue = readText(formData, "electionId");
  if (!hasValidPositionNames([positionName])) {
    return withError(
      `Enter a position name of 1 to ${MAX_POSITION_TITLE_LENGTH} characters.`,
      electionIdValue || previousState.electionId,
    );
  }
  if (electionIdValue && !UUID_PATTERN.test(electionIdValue)) {
    return withError("The draft election is invalid. Refresh and try again.");
  }

  try {
    const saved = await retryDatabaseConnection(() =>
      prisma.$transaction(async (transaction) => {
      let electionId = electionIdValue;
      if (!electionId) {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(604218731)::text AS lock_result
        `;
        const [existingDraft] = await transaction.$queryRaw<{ id: string }[]>`
          SELECT "id"
          FROM "Election"
          WHERE "createdById" = ${admin.id}::uuid
            AND "status" = 'DRAFT'::"ElectionStatus"
            AND "startsAt" IS NULL
            AND "endsAt" IS NULL
            AND "title" LIKE 'GRA Election - Candidate Applications %'
          ORDER BY "createdAt" DESC
          LIMIT 1
          FOR UPDATE
        `;
        if (existingDraft) {
          electionId = existingDraft.id;
        } else {
          const now = new Date();
          const cycleLabel = new Intl.DateTimeFormat("en", {
            timeZone: ELECTION_TIMEZONE,
            dateStyle: "medium",
            timeStyle: "short",
          }).format(now);
          const election = await transaction.election.create({
            data: {
              title: `GRA Election - Candidate Applications ${cycleLabel}`,
              timezone: ELECTION_TIMEZONE,
              status: "DRAFT",
              createdById: admin.id,
            },
            select: { id: true },
          });
          electionId = election.id;
          await transaction.auditLog.create({
            data: {
              actorId: admin.id,
              action: "ELECTION_CREATED",
              entityType: "ELECTION",
              entityId: electionId,
              outcome: "DRAFT",
              metadata: { candidateApplicationsOnly: true },
            },
          });
        }
      } else {
        const [election] = await transaction.$queryRaw<{
          id: string;
          status: ElectionStatus;
          startsAt: Date | null;
          endsAt: Date | null;
        }[]>`
          SELECT "id", "status", "startsAt", "endsAt"
          FROM "Election"
          WHERE "id" = ${electionId}::uuid
          FOR UPDATE
        `;
        if (!election) {
          return { error: "The draft election could not be found." as const };
        }
        if (
          election.status !== "DRAFT" ||
          election.startsAt !== null ||
          election.endsAt !== null
        ) {
          return {
            error: "This election is already scheduled. Add positions from its Voting setup card instead." as const,
          };
        }
      }

      const existingPositions = await transaction.position.findMany({
        where: { electionId },
        orderBy: { displayOrder: "asc" },
        select: { id: true, title: true, displayOrder: true },
      });
      if (existingPositions.length >= MAX_ELECTION_POSITIONS) {
        return {
          error: `An election can have at most ${MAX_ELECTION_POSITIONS} positions.` as const,
          electionId,
          positions: existingPositions.map(({ id, title }) => ({ id, title })),
        };
      }
      if (
        existingPositions.some(
          (position) =>
            position.title.toLocaleLowerCase("en") ===
            positionName.toLocaleLowerCase("en"),
        )
      ) {
        return {
          error: "That position has already been added." as const,
          electionId,
          positions: existingPositions.map(({ id, title }) => ({ id, title })),
        };
      }

      await transaction.position.create({
        data: {
          electionId,
          title: positionName,
          displayOrder: existingPositions.length,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ELECTION_POSITIONS_ADDED",
          entityType: "ELECTION",
          entityId: electionId,
          outcome: "UPDATED",
          metadata: { positions: [positionName] },
        },
      });

      const positions = await transaction.position.findMany({
        where: { electionId },
        orderBy: { displayOrder: "asc" },
        select: { id: true, title: true },
      });
      return { electionId, positions };
      }),
    );

    if (typeof saved.error === "string") {
      return {
        ...previousState,
        error: saved.error,
        success: null,
        electionId:
          "electionId" in saved && typeof saved.electionId === "string"
            ? saved.electionId
            : electionIdValue || previousState.electionId,
        positions:
          "positions" in saved && Array.isArray(saved.positions)
            ? saved.positions
            : previousState.positions,
      };
    }

    revalidateElectionSchedule();
    return {
      error: null,
      success: `"${positionName}" is now available on the voter candidate application form.`,
      electionId: saved.electionId,
      positions: saved.positions,
    };
  } catch (error) {
    logElectionActionFailure("Draft election position addition failed.", error);
    if (isRetryableDatabaseConnectionFailure(error)) {
      return withError(
        "The database connection is temporarily unavailable. Please try adding the position again in a moment.",
        electionIdValue || previousState.electionId,
      );
    }
    const errorCode = getElectionActionErrorCode(error);
    if (errorCode !== "UNKNOWN") {
      return withError(
        `The position could not be added (database error ${errorCode}). Please refresh and try again.`,
        electionIdValue || previousState.electionId,
      );
    }
    return withError(
      "An unexpected server error prevented the position from being saved. Refresh the page and try again.",
      electionIdValue || previousState.electionId,
    );
  }
}

export async function addElectionPositions(
  electionId: string,
  _previousState: AddElectionPositionsState,
  formData: FormData,
): Promise<AddElectionPositionsState> {
  let admin: Awaited<ReturnType<typeof getCurrentAdmin>>;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    return {
      ...INITIAL_STATE,
      error: "Positions cannot be updated right now because the database is unavailable.",
    };
  }

  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return { ...INITIAL_STATE, error: "You are not authorized to update election positions." };
  }
  if (!UUID_PATTERN.test(electionId)) {
    return { ...INITIAL_STATE, error: "The selected election is invalid." };
  }

  const positions = formData
    .getAll("positions")
    .filter((value): value is string => typeof value === "string")
    .map((position) => position.trim().normalize("NFKC"));
  if (
    !hasValidPositionNames(positions)
  ) {
    return {
      ...INITIAL_STATE,
      error: `Enter 1 to ${MAX_ELECTION_POSITIONS} unique position names, each ${MAX_POSITION_TITLE_LENGTH} characters or fewer.`,
    };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const elections = await transaction.$queryRaw<{
        id: string;
        status: ElectionStatus;
      }[]>`
        SELECT "id", "status"
        FROM "Election"
        WHERE "id" = ${electionId}::uuid
        FOR UPDATE
      `;
      if (elections.length === 0) {
        return { added: 0, error: "The selected election could not be found." };
      }
      if (!canAcceptPreElectionChanges(elections[0].status)) {
        return {
          added: 0,
          error: "Positions can only be changed before voting opens.",
        };
      }

      const existingPositions = await transaction.position.findMany({
        where: { electionId },
        select: { title: true, displayOrder: true },
      });
      if (existingPositions.length + positions.length > MAX_ELECTION_POSITIONS) {
        return {
          added: 0,
          error: `An election can have at most ${MAX_ELECTION_POSITIONS} positions.`,
        };
      }

      const existingNames = new Set(
        existingPositions.map(({ title }) => title.toLocaleLowerCase("en")),
      );
      if (
        positions.some((position) =>
          existingNames.has(position.toLocaleLowerCase("en")),
        )
      ) {
        return {
          added: 0,
          error: "One or more positions already exist in this election. Remove duplicates and try again.",
        };
      }

      const nextDisplayOrder =
        existingPositions.reduce(
          (highest, position) => Math.max(highest, position.displayOrder),
          -1,
        ) + 1;
      await transaction.position.createMany({
        data: positions.map((title, index) => ({
          electionId,
          title,
          displayOrder: nextDisplayOrder + index,
        })),
      });
      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ELECTION_POSITIONS_ADDED",
          entityType: "ELECTION",
          entityId: electionId,
          outcome: "UPDATED",
          metadata: { positions },
        },
      });

      return { added: positions.length, error: null };
    });

    if (result.error) {
      return { ...INITIAL_STATE, error: result.error };
    }

    revalidateElectionSchedule();
    return {
      error: null,
      success: `${result.added} position${result.added === 1 ? "" : "s"} added. Candidates can now apply for these positions.`,
    };
  } catch (error) {
    logElectionActionFailure("Election position update failed.", error);
    return {
      ...INITIAL_STATE,
      error: "The positions could not be added. Please try again.",
    };
  }
}

export async function removeElectionPosition(
  electionId: string,
  positionId: string,
  _previousState: RemoveElectionPositionState,
): Promise<RemoveElectionPositionState> {
  void _previousState;
  let admin: Awaited<ReturnType<typeof getCurrentAdmin>>;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    return {
      ...INITIAL_STATE,
      error: "Positions cannot be updated right now because the database is unavailable.",
    };
  }

  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return { ...INITIAL_STATE, error: "You are not authorized to update election positions." };
  }
  if (!UUID_PATTERN.test(electionId) || !UUID_PATTERN.test(positionId)) {
    return { ...INITIAL_STATE, error: "The selected position is invalid." };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const elections = await transaction.$queryRaw<{ status: ElectionStatus }[]>`
        SELECT "status"
        FROM "Election"
        WHERE "id" = ${electionId}::uuid
        FOR UPDATE
      `;
      if (elections.length === 0) {
        return {
          error: "The selected election could not be found.",
          title: null,
          removedCandidateCount: 0,
        };
      }
      if (!canAcceptPreElectionChanges(elections[0].status)) {
        return {
          error: "Positions can only be removed before voting opens.",
          title: null,
          removedCandidateCount: 0,
        };
      }

      const position = await transaction.position.findFirst({
        where: { id: positionId, electionId },
        select: { id: true, title: true },
      });
      if (!position) {
        return {
          error: "The selected position could not be found.",
          title: null,
          removedCandidateCount: 0,
        };
      }

      const ballotSelectionCount = await transaction.ballotSelection.count({
        where: { positionId, electionId },
      });
      if (ballotSelectionCount > 0) {
        return {
          error: "This position has recorded votes and cannot be removed.",
          title: null,
          removedCandidateCount: 0,
        };
      }

      const candidateCount = await transaction.candidate.count({
        where: { positionId, electionId },
      });
      await transaction.position.delete({ where: { id: positionId } });
      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ELECTION_POSITION_REMOVED",
          entityType: "POSITION",
          entityId: positionId,
          outcome: "DELETED",
          metadata: {
            electionId,
            title: position.title,
            removedCandidateCount: candidateCount,
          },
        },
      });

      return {
        error: null,
        title: position.title,
        removedCandidateCount: candidateCount,
      };
    });

    if (result.error || !result.title) {
      return { ...INITIAL_STATE, error: result.error };
    }

    revalidateElectionSchedule();
    revalidatePath("/admin/candidates");
    revalidatePath("/vote/candidates");
    revalidatePath("/vote/results");
    return {
      error: null,
      success: `“${result.title}” was removed${result.removedCandidateCount > 0 ? ` along with ${result.removedCandidateCount} candidate application${result.removedCandidateCount === 1 ? "" : "s"}` : ""}.`,
    };
  } catch (error) {
    logElectionActionFailure("Election position removal failed.", error);
    return {
      ...INITIAL_STATE,
      error: "The position could not be removed. Please refresh and try again.",
    };
  }
}

export async function updateElectionSchedule(
  electionId: string,
  _previousState: UpdateElectionScheduleState,
  formData: FormData,
): Promise<UpdateElectionScheduleState> {
  let admin: Awaited<ReturnType<typeof getCurrentAdmin>>;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    return {
      ...INITIAL_STATE,
      error: "The election schedule cannot be updated right now because the database is unavailable.",
    };
  }

  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return { ...INITIAL_STATE, error: "You are not authorized to update election schedules." };
  }
  if (!UUID_PATTERN.test(electionId)) {
    return { ...INITIAL_STATE, error: "The selected election is invalid." };
  }

  const startsAtValue = readText(formData, "startsAt");
  const endsAtValue = readText(formData, "endsAt");

  try {
    await synchronizeElectionStatuses();
    const result = await prisma.$transaction(async (transaction) => {
      const [election] = await transaction.$queryRaw<{
        status: ElectionStatus;
        startsAt: Date | null;
        endsAt: Date | null;
        timezone: string;
      }[]>`
        SELECT "status", "startsAt", "endsAt", "timezone"
        FROM "Election"
        WHERE "id" = ${electionId}::uuid
        FOR UPDATE
      `;

      if (!election) {
        return { error: "The selected election could not be found." };
      }

      const now = new Date();
      const status = getEffectiveElectionStatus(election, now);
      if (
        !canAcceptPreElectionChanges(status) &&
        status !== "OPEN" &&
        status !== "CLOSED"
      ) {
        return {
          error: "Only elections that have not opened or are currently open or closed can have their voting times changed.",
        };
      }
      if (status === "DRAFT") {
        const positionCount = await transaction.position.count({
          where: { electionId },
        });
        if (positionCount === 0) {
          return { error: "Add at least one position before scheduling voting." };
        }
      }

      const startsAt = status === "OPEN"
        ? election.startsAt
        : parseElectionDateTime(startsAtValue, election.timezone);
      const endsAt = parseElectionDateTime(endsAtValue, election.timezone);
      if (!endsAt || (status !== "OPEN" && !startsAt)) {
        return { error: "Enter valid voting opening and closing times." };
      }
      if (status !== "OPEN" && startsAt && startsAt <= now) {
        return { error: "The voting opening time must be in the future." };
      }
      if (endsAt <= now) {
        return { error: "The voting closing time must be in the future." };
      }
      if (startsAt && endsAt <= startsAt) {
        return { error: "The voting closing time must be after its opening time." };
      }
      if (status === "DRAFT") {
        const activeVoters = await transaction.voter.findMany({
          where: { status: "ACTIVE" },
          select: { id: true },
        });
        for (const batch of chunks(activeVoters, CHUNK_SIZE)) {
          await transaction.electionVoter.createMany({
            data: batch.map(({ id }) => ({
              electionId,
              voterId: id,
              status: "ELIGIBLE",
            })),
            skipDuplicates: true,
          });
        }
      }

      const nextStatus: ElectionStatus =
        status === "DRAFT" || status === "CLOSED" ? "SCHEDULED" : status;
      const updated = await transaction.election.update({
        where: { id: electionId },
        data: { startsAt, endsAt, status: nextStatus },
        select: { title: true },
      });

      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ELECTION_SCHEDULE_UPDATED",
          entityType: "ELECTION",
          entityId: electionId,
          outcome: nextStatus,
          metadata: {
            timezone: election.timezone,
            previousStartsAt: election.startsAt?.toISOString() ?? null,
            previousEndsAt: election.endsAt?.toISOString() ?? null,
            startsAt: startsAt?.toISOString() ?? null,
            endsAt: endsAt.toISOString(),
          },
        },
      });

      return {
        title: updated.title,
        startsAt,
        endsAt,
        timezone: election.timezone,
        status: nextStatus,
      };
    }, { maxWait: 15_000, timeout: 60_000 });

    if ("error" in result && typeof result.error === "string") {
      return { ...INITIAL_STATE, error: result.error };
    }

    revalidateElectionSchedule();
    const timingMessage =
      result.status === "OPEN"
        ? `Voting remains open until ${result.endsAt.toLocaleString("en", { timeZone: result.timezone, dateStyle: "medium", timeStyle: "short" })}.`
        : `Voting opens ${result.startsAt?.toLocaleString("en", { timeZone: result.timezone, dateStyle: "medium", timeStyle: "short" })} and closes ${result.endsAt.toLocaleString("en", { timeZone: result.timezone, dateStyle: "medium", timeStyle: "short" })}.`;
    return {
      error: null,
      success: `“${result.title}” schedule updated. ${timingMessage} (${result.timezone})`,
    };
  } catch (error) {
    logElectionActionFailure("Election schedule update failed.", error);
    return {
      ...INITIAL_STATE,
      error: "The election schedule could not be updated. Please try again.",
    };
  }
}

export async function deleteElection(
  electionId: string,
  _previousState: DeleteElectionState,
  _formData: FormData,
): Promise<DeleteElectionState> {
  void _previousState;
  void _formData;

  let admin: Awaited<ReturnType<typeof getCurrentAdmin>>;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    return {
      ...INITIAL_STATE,
      error: "Elections cannot be deleted right now because the database is unavailable.",
    };
  }

  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return { ...INITIAL_STATE, error: "You are not authorized to delete elections." };
  }
  if (!UUID_PATTERN.test(electionId)) {
    return { ...INITIAL_STATE, error: "The selected election is invalid." };
  }

  try {
    await synchronizeElectionStatuses();
    const result = await prisma.$transaction(async (transaction) => {
      const [election] = await transaction.$queryRaw<{
        id: string;
        title: string;
        status: ElectionStatus;
        startsAt: Date | null;
        endsAt: Date | null;
      }[]>`
        SELECT "id", "title", "status", "startsAt", "endsAt"
        FROM "Election"
        WHERE "id" = ${electionId}::uuid
        FOR UPDATE
      `;

      if (!election) {
        return { error: "The selected election could not be found." };
      }
      const currentStatus = getEffectiveElectionStatus(election);

      const [ballotCount, participationCount] = await Promise.all([
        transaction.ballot.count({ where: { electionId } }),
        transaction.voteParticipation.count({
          where: { electionVoter: { electionId } },
        }),
      ]);
      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ELECTION_DELETED",
          entityType: "ELECTION",
          entityId: electionId,
          outcome: "DELETED",
          metadata: {
            title: election.title,
            previousStatus: currentStatus,
            deletedBallots: ballotCount,
            deletedParticipations: participationCount,
          },
        },
      });

      await transaction.datasetImport.updateMany({
        where: { electionId },
        data: { electionId: null },
      });
      await transaction.voteParticipation.deleteMany({
        where: { electionVoter: { electionId } },
      });
      await transaction.ballotSelection.deleteMany({ where: { electionId } });
      await transaction.ballot.deleteMany({ where: { electionId } });
      await transaction.candidate.deleteMany({ where: { electionId } });
      await transaction.position.deleteMany({ where: { electionId } });
      await transaction.electionVoter.deleteMany({ where: { electionId } });
      await transaction.election.delete({ where: { id: electionId } });

      return { title: election.title };
    }, { maxWait: 15_000, timeout: 60_000 });

    if ("error" in result && typeof result.error === "string") {
      return { ...INITIAL_STATE, error: result.error };
    }

    revalidateElectionSchedule();
    return {
      error: null,
      success: `“${result.title}” and its election records were permanently deleted.`,
    };
  } catch (error) {
    logElectionActionFailure("Election deletion failed.", error);
    return {
      ...INITIAL_STATE,
      error: "The election could not be deleted. Please try again.",
    };
  }
}

function revalidateElectionSchedule() {
  revalidatePath("/admin");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/elections");
  revalidatePath("/admin/eligibility");
  revalidatePath("/vote/overview");
  revalidatePath("/vote/access");
  revalidatePath("/vote/candidate-application");
}
