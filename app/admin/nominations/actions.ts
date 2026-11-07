"use server";

import { randomUUID } from "node:crypto";
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
  if (note.length > 500) {
    return { ...INITIAL_STATE, error: "The review note must be 500 characters or fewer." };
  }

  try {
    const auditId = randomUUID();
    const resultRows = await prisma.$queryRaw<{
      result: "already-reviewed" | "unavailable" | "reviewed";
    }[]>(Prisma.sql`
      WITH eligible_candidate AS MATERIALIZED (
        SELECT candidate."id"
        FROM "Candidate" AS candidate
        JOIN "Election" AS election
          ON election."id" = candidate."electionId"
        WHERE candidate."id" = ${candidateId}::uuid
          AND candidate."status" = 'PENDING'
        FOR SHARE OF election
      ),
      updated_candidate AS (
        UPDATE "Candidate" AS candidate
        SET
          "status" = ${decision}::"CandidateStatus",
          "reviewedById" = ${admin.id}::uuid,
          "reviewedAt" = CURRENT_TIMESTAMP,
          "reviewNote" = ${note || null},
          "updatedAt" = CURRENT_TIMESTAMP
        FROM eligible_candidate
        WHERE candidate."id" = eligible_candidate."id"
          AND candidate."status" = 'PENDING'
        RETURNING candidate."id"
      ),
      audit_entry AS (
        INSERT INTO "AuditLog" (
          "id",
          "actorId",
          "action",
          "entityType",
          "entityId",
          "outcome"
        )
        SELECT
          ${auditId}::uuid,
          ${admin.id}::uuid,
          ${decision === "APPROVED" ? "CANDIDATE_NOMINATION_APPROVED" : "CANDIDATE_NOMINATION_REJECTED"},
          'CANDIDATE',
          "id"::text,
          ${decision}
        FROM updated_candidate
        RETURNING "id"
      )
      SELECT CASE
        WHEN EXISTS (SELECT 1 FROM updated_candidate) THEN 'reviewed'
        WHEN EXISTS (
          SELECT 1
          FROM "Candidate"
          WHERE "id" = ${candidateId}::uuid
            AND "status" = 'PENDING'
        ) THEN 'unavailable'
        ELSE 'already-reviewed'
      END AS "result",
      (SELECT COUNT(*) FROM audit_entry) AS "auditCount"
    `);
    const result = resultRows[0]?.result;

    if (result === "already-reviewed") {
      return {
        ...INITIAL_STATE,
        error: "This application has already been reviewed. Refresh the queue.",
      };
    }
    if (result === "unavailable") {
      return {
        ...INITIAL_STATE,
        error: "This application is no longer available for review.",
      };
    }
    if (result !== "reviewed") {
      throw new Error("The nomination review query returned no result.");
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
