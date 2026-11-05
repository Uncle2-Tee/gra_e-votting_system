"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCurrentAdmin,
  isAdminDatabaseUnavailableError,
} from "@/lib/admin-security";
import { parseElectionDateTime } from "@/lib/election-schedule";
import { ELECTION_TIMEZONE } from "@/lib/election-timezone";
import { prisma } from "@/lib/prisma";

export type CreateElectionState = {
  error: string | null;
  success: string | null;
};

const INITIAL_STATE: CreateElectionState = { error: null, success: null };

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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
    return { ...INITIAL_STATE, error: "You are not authorized to create elections." };
  }

  const title = readText(formData, "title").normalize("NFKC");
  const description = readText(formData, "description").normalize("NFKC");
  const positionsText = readText(formData, "positions").normalize("NFKC");
  const startsAtValue = readText(formData, "startsAt");
  const endsAtValue = readText(formData, "endsAt");
  const positions = positionsText
    .split(/\r?\n/)
    .map((position) => position.trim())
    .filter(Boolean);

  if (title.length < 3 || title.length > 120) {
    return {
      ...INITIAL_STATE,
      error: "Enter an election title between 3 and 120 characters.",
    };
  }
  if (description.length > 2000) {
    return {
      ...INITIAL_STATE,
      error: "The election description must be 2,000 characters or fewer.",
    };
  }
  if (
    positions.length === 0 ||
    positions.length > 20 ||
    positions.some((position) => position.length > 80) ||
    new Set(positions.map((position) => position.toLocaleLowerCase("en"))).size !== positions.length
  ) {
    return {
      ...INITIAL_STATE,
      error: "Enter 1 to 20 unique position names, each 80 characters or fewer.",
    };
  }
  const startsAt = parseElectionDateTime(startsAtValue, ELECTION_TIMEZONE);
  const endsAt = parseElectionDateTime(endsAtValue, ELECTION_TIMEZONE);
  if (!startsAt || !endsAt) {
    return {
      ...INITIAL_STATE,
      error: "Enter valid voting opening and closing times.",
    };
  }
  if (startsAt <= new Date()) {
    return {
      ...INITIAL_STATE,
      error: "The voting opening time must be in the future.",
    };
  }
  if (endsAt <= startsAt) {
    return {
      ...INITIAL_STATE,
      error: "The voting closing time must be after its opening time.",
    };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const created = await transaction.election.create({
        data: {
          title,
          description: description || null,
          timezone: ELECTION_TIMEZONE,
          startsAt,
          endsAt,
          status: "SCHEDULED",
          createdById: admin.id,
        },
        select: { id: true },
      });

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
          outcome: "SCHEDULED",
          metadata: {
            timezone: ELECTION_TIMEZONE,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
          },
        },
      });

      return created;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/elections");
    revalidatePath("/admin/eligibility");
    revalidatePath("/vote");
    revalidatePath("/vote/nominate");
    return {
      error: null,
      success: `“${title}” was scheduled to open on ${startsAt.toLocaleString("en", { timeZone: ELECTION_TIMEZONE, dateStyle: "medium", timeStyle: "short" })} and close on ${endsAt.toLocaleString("en", { timeZone: ELECTION_TIMEZONE, dateStyle: "medium", timeStyle: "short" })} (${ELECTION_TIMEZONE}).`,
    };
  } catch (error) {
    const errorCode =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : "UNKNOWN";
    console.error("Election creation failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode,
    });
    return {
      ...INITIAL_STATE,
      error: "The election could not be created. Please try again.",
    };
  }
}
