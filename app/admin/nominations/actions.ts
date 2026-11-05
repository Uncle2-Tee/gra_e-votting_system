"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  getCurrentAdmin,
  isAdminDatabaseUnavailableError,
} from "@/lib/admin-security";
import { prisma } from "@/lib/prisma";
import type { NominationReviewState } from "@/lib/nomination-types";

const INITIAL_STATE: NominationReviewState = { error: null, success: null };
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function reviewNomination(
  _previousState: NominationReviewState,
  formData: FormData,
): Promise<NominationReviewState> {
  let admin: Awaited<ReturnType<typeof getCurrentAdmin>>;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    return {
      ...INITIAL_STATE,
      error: "Nomination review is temporarily unavailable because the database cannot be reached.",
    };
  }
  if (!admin) {
    return { ...INITIAL_STATE, error: "Your administrator session has expired. Sign in again." };
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return { ...INITIAL_STATE, error: "You are not authorized to review nominations." };
  }

  const candidateId = formData.get("candidateId");
  const decision = formData.get("decision");
  const reviewNote = formData.get("reviewNote");
  if (
    typeof candidateId !== "string" ||
    !UUID_PATTERN.test(candidateId) ||
    (decision !== "APPROVED" && decision !== "REJECTED")
  ) {
    return { ...INITIAL_STATE, error: "This review request is invalid. Refresh and try again." };
  }
  const note = typeof reviewNote === "string" ? reviewNote.trim() : "";
  if (decision === "REJECTED" && (note.length < 5 || note.length > 500)) {
    return {
      ...INITIAL_STATE,
      error: "Enter a rejection reason between 5 and 500 characters.",
    };
  }
  if (decision === "APPROVED" && note.length > 500) {
    return { ...INITIAL_STATE, error: "The review note must be 500 characters or fewer." };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const candidate = await transaction.candidate.findUnique({
        where: { id: candidateId },
        select: { id: true, electionId: true, status: true },
      });
      if (!candidate || candidate.status !== "PENDING") {
        return "already-reviewed" as const;
      }

      const lockedElections = await transaction.$queryRaw<{ status: string }[]>(
        Prisma.sql`SELECT "status" FROM "Election" WHERE "id" = ${candidate.electionId} FOR UPDATE`,
      );
      if (
        !lockedElections[0] ||
        !["DRAFT", "SCHEDULED", "PUBLISHED"].includes(lockedElections[0].status)
      ) {
        return "closed" as const;
      }

      const updated = await transaction.candidate.updateMany({
        where: { id: candidate.id, status: "PENDING" },
        data: {
          status: decision,
          reviewedById: admin.id,
          reviewedAt: new Date(),
          reviewNote: note || null,
        },
      });
      if (updated.count !== 1) {
        return "already-reviewed" as const;
      }

      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: decision === "APPROVED"
            ? "CANDIDATE_NOMINATION_APPROVED"
            : "CANDIDATE_NOMINATION_REJECTED",
          entityType: "CANDIDATE",
          entityId: candidate.id,
          outcome: decision,
        },
      });
      return "reviewed" as const;
    });

    if (result === "already-reviewed") {
      return {
        ...INITIAL_STATE,
        error: "This application has already been reviewed. Refresh the queue.",
      };
    }
    if (result === "closed") {
      return {
        ...INITIAL_STATE,
        error: "Applications cannot be reviewed after an election has opened.",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/nominations");
    revalidatePath("/vote");
    return {
      error: null,
      success: decision === "APPROVED"
        ? "Nomination approved. The profile is now eligible for display."
        : "Nomination rejected. The decision has been recorded.",
    };
  } catch (error) {
    const errorCode =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : "UNKNOWN";
    console.error("Candidate nomination review failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode,
    });
    return {
      ...INITIAL_STATE,
      error: "The review could not be saved. Refresh the page and try again.",
    };
  }
}
