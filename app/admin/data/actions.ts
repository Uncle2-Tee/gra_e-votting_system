"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCurrentAdmin,
  isAdminDatabaseUnavailableError,
} from "@/lib/admin-security";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_DATA_KINDS,
  type AdminDataKind,
} from "@/lib/admin-data-management";

export type AdminDataActionState = {
  error: string | null;
  success: string | null;
};

const INITIAL_STATE: AdminDataActionState = { error: null, success: null };
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isAdminDataKind(value: string): value is AdminDataKind {
  return ADMIN_DATA_KINDS.some((kind) => kind === value);
}

function logDeleteFailure(error: unknown) {
  const errorCode =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : error instanceof Prisma.PrismaClientInitializationError
        ? error.errorCode
        : "UNKNOWN";
  console.error("Administrator record deletion failed.", {
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorCode,
  });
}

export async function deleteAdminDataRecord(
  _previousState: AdminDataActionState,
  formData: FormData,
): Promise<AdminDataActionState> {
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
      error: "Records cannot be deleted while the database is unavailable.",
    };
  }

  if (!admin) {
    redirect("/admin/login");
  }
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return { ...INITIAL_STATE, error: "You are not authorized to delete records." };
  }

  const kindValue = formData.get("kind");
  const recordId = formData.get("recordId");
  if (
    typeof kindValue !== "string" ||
    !isAdminDataKind(kindValue) ||
    typeof recordId !== "string" ||
    !UUID_PATTERN.test(recordId)
  ) {
    return { ...INITIAL_STATE, error: "This deletion request is invalid. Refresh and try again." };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      switch (kindValue) {
        case "voters": {
          const voter = await transaction.voter.findUnique({
            where: { id: recordId },
            select: { id: true },
          });
          if (!voter) {
            return { error: "The voter record could not be found." };
          }
          const participations = await transaction.voteParticipation.deleteMany({
            where: { electionVoter: { voterId: recordId } },
          });
          const eligibilities = await transaction.electionVoter.deleteMany({
            where: { voterId: recordId },
          });
          await transaction.auditLog.create({
            data: {
              actorId: admin.id,
              action: "OPERATIONAL_RECORD_DELETED",
              entityType: "VOTER",
              entityId: recordId,
              outcome: "DELETED",
              metadata: {
                deletedEligibilities: eligibilities.count,
                deletedParticipations: participations.count,
              },
            },
          });
          await transaction.voter.delete({ where: { id: recordId } });
          return { success: "Voter and its eligibility records were permanently deleted." };
        }
        case "eligibility": {
          const assignment = await transaction.electionVoter.findUnique({
            where: { id: recordId },
            select: { id: true, electionId: true },
          });
          if (!assignment) {
            return { error: "The eligibility assignment could not be found." };
          }
          const participations = await transaction.voteParticipation.deleteMany({
            where: { electionVoterId: recordId },
          });
          await transaction.auditLog.create({
            data: {
              actorId: admin.id,
              action: "OPERATIONAL_RECORD_DELETED",
              entityType: "ELIGIBILITY",
              entityId: recordId,
              outcome: "DELETED",
              metadata: {
                electionId: assignment.electionId,
                deletedParticipations: participations.count,
              },
            },
          });
          await transaction.electionVoter.delete({ where: { id: recordId } });
          return { success: "Eligibility assignment was permanently deleted." };
        }
        case "ballots": {
          const ballot = await transaction.ballot.findUnique({
            where: { id: recordId },
            select: {
              id: true,
              electionId: true,
              _count: { select: { selections: true } },
            },
          });
          if (!ballot) {
            return { error: "The anonymous ballot could not be found." };
          }
          await transaction.auditLog.create({
            data: {
              actorId: admin.id,
              action: "OPERATIONAL_RECORD_DELETED",
              entityType: "BALLOT",
              entityId: recordId,
              outcome: "DELETED",
              metadata: {
                electionId: ballot.electionId,
                deletedSelections: ballot._count.selections,
              },
            },
          });
          await transaction.ballotSelection.deleteMany({
            where: { ballotId: recordId },
          });
          await transaction.ballot.delete({ where: { id: recordId } });
          return { success: "Anonymous ballot and its selections were permanently deleted." };
        }
        case "candidates": {
          const candidate = await transaction.candidate.findUnique({
            where: { id: recordId },
            select: { id: true, electionId: true, positionId: true },
          });
          if (!candidate) {
            return { error: "The candidate record could not be found." };
          }
          const selectionCount = await transaction.ballotSelection.count({
            where: { candidateId: recordId },
          });
          if (selectionCount > 0) {
            return {
              error: "This candidate is referenced by recorded ballots. Delete the related election instead.",
            };
          }
          await transaction.auditLog.create({
            data: {
              actorId: admin.id,
              action: "OPERATIONAL_RECORD_DELETED",
              entityType: "CANDIDATE",
              entityId: recordId,
              outcome: "DELETED",
              metadata: {
                electionId: candidate.electionId,
                positionId: candidate.positionId,
              },
            },
          });
          await transaction.candidate.delete({ where: { id: recordId } });
          return { success: "Candidate record was permanently deleted." };
        }
        case "positions": {
          const position = await transaction.position.findUnique({
            where: { id: recordId },
            select: { id: true, electionId: true, title: true },
          });
          if (!position) {
            return { error: "The position could not be found." };
          }
          const [selectionCount, participationCount] = await Promise.all([
            transaction.ballotSelection.count({ where: { positionId: recordId } }),
            transaction.voteParticipation.count({ where: { positionId: recordId } }),
          ]);
          if (selectionCount > 0 || participationCount > 0) {
            return {
              error: "This position has recorded voting activity. Delete its election to remove the linked records.",
            };
          }
          const candidates = await transaction.candidate.count({
            where: { positionId: recordId },
          });
          await transaction.auditLog.create({
            data: {
              actorId: admin.id,
              action: "OPERATIONAL_RECORD_DELETED",
              entityType: "POSITION",
              entityId: recordId,
              outcome: "DELETED",
              metadata: {
                electionId: position.electionId,
                title: position.title,
                deletedCandidates: candidates,
              },
            },
          });
          await transaction.candidate.deleteMany({
            where: { positionId: recordId },
          });
          await transaction.position.delete({ where: { id: recordId } });
          return { success: "Position and its candidate records were permanently deleted." };
        }
        case "imports": {
          const datasetImport = await transaction.datasetImport.findUnique({
            where: { id: recordId },
            select: { id: true, filename: true },
          });
          if (!datasetImport) {
            return { error: "The import batch could not be found." };
          }
          await transaction.auditLog.create({
            data: {
              actorId: admin.id,
              action: "OPERATIONAL_RECORD_DELETED",
              entityType: "DATASET_IMPORT",
              entityId: recordId,
              outcome: "DELETED",
              metadata: { filename: datasetImport.filename },
            },
          });
          await transaction.datasetImport.delete({ where: { id: recordId } });
          return { success: "Import batch and its row records were permanently deleted." };
        }
        default:
          return { error: "This record type cannot be deleted here." };
      }
    }, { maxWait: 15_000, timeout: 60_000 });

    if (typeof result.error === "string") {
      return { ...INITIAL_STATE, error: result.error };
    }
    if (typeof result.success !== "string") {
      return { ...INITIAL_STATE, error: "This record type cannot be deleted here." };
    }

    for (const path of [
      "/admin",
      "/admin/data",
      "/admin/elections",
      "/admin/voters",
      "/admin/candidates",
      "/admin/eligibility",
      "/admin/results",
      "/vote/overview",
      "/vote/access",
      "/vote/candidates",
      "/vote/results",
    ]) {
      revalidatePath(path);
    }
    return { error: null, success: result.success };
  } catch (error) {
    logDeleteFailure(error);
    return {
      ...INITIAL_STATE,
      error:
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003"
          ? "This record is still referenced by related data. Delete its parent election to remove the linked records."
          : "The record could not be deleted. Refresh and try again.",
    };
  }
}
