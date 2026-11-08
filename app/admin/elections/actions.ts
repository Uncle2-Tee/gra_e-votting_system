"use server";

import { Prisma, type ElectionStatus } from "@prisma/client";
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
} from "@/lib/nomination-positions";
import { prisma } from "@/lib/prisma";

export type CreateElectionState = {
  error: string | null;
  success: string | null;
};

export type UpdateElectionScheduleState = CreateElectionState;
export type AddElectionPositionsState = CreateElectionState;
export type DeleteScheduledElectionState = CreateElectionState;

const INITIAL_STATE: CreateElectionState = { error: null, success: null };
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

function logElectionActionFailure(action: string, error: unknown) {
  const errorCode =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : "UNKNOWN";
  console.error(action, {
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorCode,
  });
}

export async function createElection(
  _previousState: CreateElectionState,
  formData: FormData,
): Promise<CreateElectionState> {
  let admin: Awaited<ReturnType<typeof getCurrentAdmin>>;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    return {
      ...INITIAL_STATE,
      error: "Elections cannot be created right now because the database is unavailable.",
    };
  }

  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return { ...INITIAL_STATE, error: "You are not authorized to configure voting." };
  }

  const positions = formData
    .getAll("positions")
    .filter((value): value is string => typeof value === "string")
    .map((position) => position.trim().normalize("NFKC"));
  const intent = readText(formData, "intent") || "schedule-vote";
  if (intent !== "publish-positions" && intent !== "schedule-vote") {
    return { ...INITIAL_STATE, error: "Choose whether to publish positions or schedule voting." };
  }
  const publishPositionsOnly = intent === "publish-positions";
  const startsAtValue = readText(formData, "startsAt");
  const endsAtValue = readText(formData, "endsAt");

  if (
    !hasValidPositionNames(positions)
  ) {
    return {
      ...INITIAL_STATE,
      error: `Enter 1 to ${MAX_ELECTION_POSITIONS} unique position names, each ${MAX_POSITION_TITLE_LENGTH} characters or fewer.`,
    };
  }

  let startsAt: Date | null = null;
  let endsAt: Date | null = null;
  if (!publishPositionsOnly) {
    startsAt = parseElectionDateTime(startsAtValue, ELECTION_TIMEZONE);
    endsAt = parseElectionDateTime(endsAtValue, ELECTION_TIMEZONE);
    if (!startsAt || !endsAt) {
      return { ...INITIAL_STATE, error: "Enter valid voting opening and closing times." };
    }
    if (startsAt <= new Date()) {
      return { ...INITIAL_STATE, error: "The voting opening time must be in the future." };
    }
    if (endsAt <= startsAt) {
      return {
        ...INITIAL_STATE,
        error: "The voting closing time must be after its opening time.",
      };
    }
  }
  const votingStartsAt = startsAt ?? new Date();
  const cycleLabel = new Intl.DateTimeFormat("en", {
    timeZone: ELECTION_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(votingStartsAt);
  const title = publishPositionsOnly
    ? `GRA Election - Nominations ${cycleLabel}`
    : `GRA Election - ${cycleLabel}`;
  const initialStatus = publishPositionsOnly ? "DRAFT" : "SCHEDULED";

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(604218731)::text AS lock_result
      `;
      const created = await transaction.election.create({
        data: {
          title,
          timezone: ELECTION_TIMEZONE,
          startsAt,
          endsAt,
          status: initialStatus,
          createdById: admin.id,
        },
        select: { id: true },
      });

      const registeredVoters = await transaction.voter.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      for (const batch of chunks(registeredVoters, CHUNK_SIZE)) {
        await transaction.electionVoter.createMany({
          data: batch.map(({ id }) => ({
            electionId: created.id,
            voterId: id,
            status: "ELIGIBLE",
          })),
          skipDuplicates: true,
        });
      }

      await transaction.position.createMany({
        data: positions.map((position, index) => ({
          electionId: created.id,
          title: position,
          displayOrder: index,
        })),
      });

      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ELECTION_CREATED",
          entityType: "ELECTION",
          entityId: created.id,
          outcome: initialStatus,
          metadata: {
            timezone: ELECTION_TIMEZONE,
            startsAt: startsAt?.toISOString() ?? null,
            endsAt: endsAt?.toISOString() ?? null,
            positions,
          },
        },
      });
    });

    revalidateElectionSchedule();
    if (publishPositionsOnly) {
      return {
        error: null,
        success: "Nomination positions are published. Candidates can now apply and be reviewed before voting is scheduled.",
      };
    }
    if (!startsAt || !endsAt) {
      return { ...INITIAL_STATE, error: "Enter valid voting opening and closing times." };
    }
    return {
      error: null,
      success: `Voting is scheduled to open on ${startsAt.toLocaleString("en", { timeZone: ELECTION_TIMEZONE, dateStyle: "medium", timeStyle: "short" })} and close on ${endsAt.toLocaleString("en", { timeZone: ELECTION_TIMEZONE, dateStyle: "medium", timeStyle: "short" })} (${ELECTION_TIMEZONE}). The selected positions are available for nominations.`,
    };
  } catch (error) {
    logElectionActionFailure(
      publishPositionsOnly
        ? "Nomination position publishing failed."
        : "Election creation failed.",
      error,
    );
    return {
      ...INITIAL_STATE,
      error: publishPositionsOnly
        ? "Nomination positions could not be published. Please try again."
        : "The election could not be created. Please try again.",
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
      error: `Enter 1 to ${MAX_ELECTION_POSITIONS} unique position names, each ${MAX_POSITION_TITLE_LENGTH} characters or fewer.`,
    };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const elections = await transaction.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "Election"
        WHERE "id" = ${electionId}::uuid
        FOR UPDATE
      `;
      if (elections.length === 0) {
        return { added: 0, error: "The selected election could not be found." };
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
      success: `${result.added} position${result.added === 1 ? "" : "s"} added. They are now available on the voter nomination form.`,
    };
  } catch (error) {
    logElectionActionFailure("Election position update failed.", error);
    return {
      ...INITIAL_STATE,
      error: "The positions could not be added. Please try again.",
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
      if (!canAcceptPreElectionChanges(status) && status !== "OPEN") {
        return {
          error: "Only elections that have not opened or are currently open can have their voting times changed.",
        };
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

      const nextStatus: ElectionStatus = status === "DRAFT" ? "SCHEDULED" : status;
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
    });

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

export async function deleteScheduledElection(
  electionId: string,
  _previousState: DeleteScheduledElectionState,
  _formData: FormData,
): Promise<DeleteScheduledElectionState> {
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
      error: "Scheduled elections cannot be deleted right now because the database is unavailable.",
    };
  }

  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return { ...INITIAL_STATE, error: "You are not authorized to delete scheduled elections." };
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
      if (currentStatus !== "SCHEDULED") {
        return { error: "Only scheduled elections can be deleted." };
      }

      const [ballotCount, participationCount] = await Promise.all([
        transaction.ballot.count({ where: { electionId } }),
        transaction.voteParticipation.count({
          where: { electionVoter: { electionId } },
        }),
      ]);
      if (ballotCount > 0 || participationCount > 0) {
        return {
          error: "This election has voting activity and cannot be deleted.",
        };
      }

      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: "SCHEDULED_ELECTION_DELETED",
          entityType: "ELECTION",
          entityId: electionId,
          outcome: "DELETED",
          metadata: { title: election.title, previousStatus: currentStatus },
        },
      });

      await transaction.datasetImport.updateMany({
        where: { electionId },
        data: { electionId: null },
      });
      await transaction.candidate.deleteMany({ where: { electionId } });
      await transaction.position.deleteMany({ where: { electionId } });
      await transaction.electionVoter.deleteMany({ where: { electionId } });
      await transaction.election.delete({ where: { id: electionId } });

      return { title: election.title };
    });

    if ("error" in result && typeof result.error === "string") {
      return { ...INITIAL_STATE, error: result.error };
    }

    revalidateElectionSchedule();
    return {
      error: null,
      success: `“${result.title}” and its setup records were deleted.`,
    };
  } catch (error) {
    logElectionActionFailure("Scheduled election deletion failed.", error);
    return {
      ...INITIAL_STATE,
      error: "The scheduled election could not be deleted. Please try again.",
    };
  }
}

function revalidateElectionSchedule() {
  revalidatePath("/admin");
  revalidatePath("/admin/elections");
  revalidatePath("/admin/eligibility");
  revalidatePath("/vote");
  revalidatePath("/vote/nominate");
}
