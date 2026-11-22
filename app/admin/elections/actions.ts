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
export type PositionTemplateActionState = ElectionActionState;
export type DeleteElectionState = ElectionActionState;
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

export async function addPositionTemplates(
  _previousState: PositionTemplateActionState,
  formData: FormData,
): Promise<PositionTemplateActionState> {
  let admin: Awaited<ReturnType<typeof getCurrentAdmin>>;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    return { ...INITIAL_STATE, error: "Positions could not be saved because the database is unavailable." };
  }
  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return { ...INITIAL_STATE, error: "You are not authorized to manage positions." };
  }

  const positions = formData
    .getAll("positions")
    .filter((value): value is string => typeof value === "string")
    .map((position) => position.trim().normalize("NFKC"))
    .filter(Boolean);

  if (!hasValidPositionNames(positions)) {
    return { ...INITIAL_STATE, error: "Enter one or more unique valid position names." };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.positionTemplate.findMany({
        orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
        select: { title: true, displayOrder: true },
      });
      const knownNames = new Set(existing.map(({ title }) => title.toLocaleLowerCase("en")));
      const newPositions = positions.filter(
        (title) => !knownNames.has(title.toLocaleLowerCase("en")),
      );
      if (newPositions.length === 0) {
        return { added: 0 };
      }
      await transaction.positionTemplate.createMany({
        data: newPositions.map((title, index) => ({
          title,
          displayOrder: existing.length + index,
        })),
      });
      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: "POSITION_TEMPLATES_ADDED",
          entityType: "POSITION_TEMPLATE",
          entityId: "GLOBAL",
          outcome: "CREATED",
          metadata: { positions: newPositions },
        },
      });
      return { added: newPositions.length };
    });

    revalidatePath("/admin/positions");
    revalidatePath("/admin/elections");
    revalidatePath("/vote/overview");
    revalidatePath("/vote/candidate-application");
    return {
      error: null,
      success:
        result.added > 0
          ? `${result.added} position${result.added === 1 ? "" : "s"} saved. No election was created.`
          : "Those positions already exist.",
    };
  } catch (error) {
    logElectionActionFailure("Global position creation failed.", error);
    return { ...INITIAL_STATE, error: "The positions could not be saved. Please try again." };
  }
}

export async function removePositionTemplate(
  positionTemplateId: string,
  _previousState: PositionTemplateActionState,
  formData: FormData,
): Promise<PositionTemplateActionState> {
  void formData;
  let admin: Awaited<ReturnType<typeof getCurrentAdmin>>;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    return { ...INITIAL_STATE, error: "The position could not be removed because the database is unavailable." };
  }
  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return { ...INITIAL_STATE, error: "You are not authorized to manage positions." };
  }
  if (!UUID_PATTERN.test(positionTemplateId)) {
    return { ...INITIAL_STATE, error: "The position could not be found." };
  }

  try {
    const position = await prisma.positionTemplate.findUnique({
      where: { id: positionTemplateId },
      select: { id: true, title: true },
    });
    if (!position) {
      return { ...INITIAL_STATE, error: "The position could not be found." };
    }
    await prisma.$transaction(async (transaction) => {
      await transaction.positionTemplate.delete({ where: { id: positionTemplateId } });
      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: "POSITION_TEMPLATE_REMOVED",
          entityType: "POSITION_TEMPLATE",
          entityId: positionTemplateId,
          outcome: "DELETED",
          metadata: { position: position.title },
        },
      });
    });
    revalidatePath("/admin/positions");
    revalidatePath("/admin/elections");
    revalidatePath("/vote/overview");
    revalidatePath("/vote/candidate-application");
    return { error: null, success: `"${position.title}" was removed. No election was changed.` };
  } catch (error) {
    logElectionActionFailure("Global position removal failed.", error);
    return { ...INITIAL_STATE, error: "The position could not be removed. Please try again." };
  }
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
    errorCode === "P1001" ||
    (error instanceof Error && /can't reach database server/i.test(error.message))
  );
}

async function retryDatabaseConnection<T>(operation: () => Promise<T>) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === 1 || !isRetryableDatabaseConnectionFailure(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw new Error("Database retry attempts ended unexpectedly.");
}

export async function scheduleNewElection(
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
      error: "An election cannot be scheduled right now because the database is unavailable.",
    };
  }

  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return { ...INITIAL_STATE, error: "You are not authorized to schedule elections." };
  }

  const rawPositionTemplateIds = formData.getAll("positionTemplateIds");
  const positionTemplateIds = rawPositionTemplateIds.filter(
    (value): value is string => typeof value === "string",
  );
  const uniquePositionTemplateIds = [...new Set(positionTemplateIds)];
  if (
    positionTemplateIds.length !== rawPositionTemplateIds.length ||
    uniquePositionTemplateIds.length !== positionTemplateIds.length ||
    uniquePositionTemplateIds.some((id) => !UUID_PATTERN.test(id))
  ) {
    return {
      ...INITIAL_STATE,
      error: "One or more selected positions are invalid. Refresh and try again.",
    };
  }
  if (uniquePositionTemplateIds.length === 0) {
    return {
      ...INITIAL_STATE,
      error: "Select at least one position for this election.",
    };
  }

  const startsAt = parseElectionDateTime(
    readText(formData, "startsAt"),
    ELECTION_TIMEZONE,
  );
  const endsAt = parseElectionDateTime(
    readText(formData, "endsAt"),
    ELECTION_TIMEZONE,
  );
  const now = new Date();
  if (!startsAt || !endsAt) {
    return { ...INITIAL_STATE, error: "Enter valid voting opening and closing times." };
  }
  if (startsAt <= now) {
    return { ...INITIAL_STATE, error: "The voting opening time must be in the future." };
  }
  if (endsAt <= startsAt) {
    return { ...INITIAL_STATE, error: "The voting closing time must be after its opening time." };
  }

  try {
    const result = await retryDatabaseConnection(() =>
      prisma.$transaction(async (transaction) => {
        const positionTemplates = await transaction.positionTemplate.findMany({
          where: { id: { in: uniquePositionTemplateIds } },
          orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
          select: { id: true, title: true },
        });
        if (positionTemplates.length !== uniquePositionTemplateIds.length) {
          return {
            error: "One or more selected positions could not be found. Refresh and try again.",
          } as const;
        }

        const cycleLabel = new Intl.DateTimeFormat("en", {
          timeZone: ELECTION_TIMEZONE,
          dateStyle: "medium",
          timeStyle: "short",
        }).format(now);
        const election = await transaction.election.create({
          data: {
            title: `GRA Election - ${cycleLabel}`,
            timezone: ELECTION_TIMEZONE,
            status: "SCHEDULED",
            startsAt,
            endsAt,
            createdById: admin.id,
            positions: {
              create: positionTemplates.map(({ title }, displayOrder) => ({
                title,
                displayOrder,
              })),
            },
          },
          select: {
            id: true,
            title: true,
            positions: { select: { id: true, title: true } },
          },
        });
        const approvedApplications = await transaction.candidateApplication.findMany({
          where: {
            status: "APPROVED",
            positionTemplate: { title: { in: positionTemplates.map(({ title }) => title) } },
          },
          select: {
            nameCiphertext: true,
            applicantEmailCiphertext: true,
            applicantPhoneCiphertext: true,
            applicantLookupHash: true,
            photoData: true,
            photoMimeType: true,
            positionTemplate: { select: { title: true } },
          },
        });
        const approvedCandidates = approvedApplications.flatMap((application) => {
          const position = election.positions.find(
            ({ title }) => title === application.positionTemplate.title,
          );
          if (!position) {
            return [];
          }
          return [{
            electionId: election.id,
            positionId: position.id,
            nameCiphertext: application.nameCiphertext,
            applicantEmailCiphertext: application.applicantEmailCiphertext,
            applicantPhoneCiphertext: application.applicantPhoneCiphertext,
            applicantLookupHash: application.applicantLookupHash,
            photoData: application.photoData,
            photoMimeType: application.photoMimeType,
            status: "APPROVED" as const,
          }];
        });
        if (approvedCandidates.length > 0) {
          await transaction.candidate.createMany({
            data: approvedCandidates,
            skipDuplicates: true,
          });
        }

        const activeVoters = await transaction.voter.findMany({
          where: { status: "ACTIVE" },
          select: { id: true },
        });
        for (const batch of chunks(activeVoters, CHUNK_SIZE)) {
          await transaction.electionVoter.createMany({
            data: batch.map(({ id }) => ({
              electionId: election.id,
              voterId: id,
              status: "ELIGIBLE",
            })),
            skipDuplicates: true,
          });
        }

        await transaction.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ELECTION_CREATED",
            entityType: "ELECTION",
            entityId: election.id,
            outcome: "SCHEDULED",
            metadata: {
              timezone: ELECTION_TIMEZONE,
              startsAt: startsAt.toISOString(),
              endsAt: endsAt.toISOString(),
              positions: positionTemplates.map(({ title }) => title),
            },
          },
        });

        return { election };
      }, { maxWait: 15_000, timeout: 60_000 }),
    );

    if ("error" in result && typeof result.error === "string") {
      return { ...INITIAL_STATE, error: result.error };
    }

    revalidateElectionSchedule();
    return {
      error: null,
      success: `“${result.election.title}” scheduled. Voting opens ${startsAt.toLocaleString("en", { timeZone: ELECTION_TIMEZONE, dateStyle: "medium", timeStyle: "short" })} and closes ${endsAt.toLocaleString("en", { timeZone: ELECTION_TIMEZONE, dateStyle: "medium", timeStyle: "short" })}. (${ELECTION_TIMEZONE})`,
    };
  } catch (error) {
    logElectionActionFailure("Election creation failed.", error);
    return {
      ...INITIAL_STATE,
      error: "The election could not be scheduled. Please try again.",
    };
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
      error: `Enter one or more unique position names, each ${MAX_POSITION_TITLE_LENGTH} characters or fewer.`,
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
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(604218731)::text AS lock_result
      `;
      const positionTemplates = await transaction.positionTemplate.findMany({
        orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
        select: { title: true, displayOrder: true },
      });
      const knownPositionNames = new Set(
        positionTemplates.map(({ title }) => title.toLocaleLowerCase("en")),
      );
      const newPositionTemplates = positions
        .filter((title) => !knownPositionNames.has(title.toLocaleLowerCase("en")))
        .map((title, index) => ({
          title,
          displayOrder: positionTemplates.length + index,
        }));
      if (newPositionTemplates.length > 0) {
        await transaction.positionTemplate.createMany({
          data: newPositionTemplates,
        });
      }
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
  const rawPositionIds = formData.getAll("positionIds");
  const submittedPositionIds = rawPositionIds.filter(
    (positionId): positionId is string => typeof positionId === "string",
  );

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
      const selectedPositionIds = [...new Set(submittedPositionIds)];
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
        if (
          submittedPositionIds.length !== rawPositionIds.length ||
          selectedPositionIds.some((positionId) => !UUID_PATTERN.test(positionId))
        ) {
          return { error: "One or more selected positions are invalid. Refresh and try again." };
        }
        if (selectedPositionIds.length === 0) {
          return { error: "Select at least one position before scheduling voting." };
        }
        const electionPositions = await transaction.position.findMany({
          where: { electionId },
          select: { id: true },
        });
        if (electionPositions.length === 0) {
          return { error: "Add at least one position before scheduling voting." };
        }
        const electionPositionIds = new Set(
          electionPositions.map(({ id }) => id),
        );
        if (selectedPositionIds.some((id) => !electionPositionIds.has(id))) {
          return { error: "One or more selected positions do not belong to this election. Refresh and try again." };
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
        await transaction.position.updateMany({
          where: { electionId },
          data: { includedInElection: false },
        });
        await transaction.position.updateMany({
          where: { electionId, id: { in: selectedPositionIds } },
          data: { includedInElection: true },
        });

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
            ...(status === "DRAFT"
              ? { includedPositionIds: selectedPositionIds }
              : {}),
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
  revalidatePath("/vote/ballot");
  revalidatePath("/vote/candidate-application");
  revalidatePath("/vote/candidates");
  revalidatePath("/vote/results");
}
