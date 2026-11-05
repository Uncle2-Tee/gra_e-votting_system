"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  encryptVoterField,
  normalizePhoneNumber,
  normalizeVoterName,
} from "@/lib/voter-data-crypto";
import {
  getCurrentAdmin,
  isAdminDatabaseUnavailableError,
} from "@/lib/admin-security";
import {
  canAcceptPreElectionChanges,
  getEffectiveElectionStatus,
} from "@/lib/election-schedule";
import { prisma } from "@/lib/prisma";
import {
  EligibilitySpreadsheetError,
  parseEligibilitySpreadsheet,
} from "@/lib/eligibility-spreadsheet";
import type { EligibilityImportState } from "@/lib/eligibility-import-types";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const CHUNK_SIZE = 500;
const INITIAL_STATE: EligibilityImportState = { error: null, result: null };

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export async function importEligibleVoters(
  _previousState: EligibilityImportState,
  formData: FormData,
): Promise<EligibilityImportState> {
  let admin: Awaited<ReturnType<typeof getCurrentAdmin>>;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    return {
      ...INITIAL_STATE,
      error: "Eligibility imports are temporarily unavailable because the database cannot be reached.",
    };
  }
  if (!admin) {
    redirect("/admin/login");
  }

  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN") {
    return { ...INITIAL_STATE, error: "You are not authorized to import voter eligibility." };
  }

  const electionId = formData.get("electionId");
  const file = formData.get("file");
  if (typeof electionId !== "string" || !(file instanceof File)) {
    return { ...INITIAL_STATE, error: "Select an election and an .xlsx file." };
  }
  if (!file.name.toLocaleLowerCase("en").endsWith(".xlsx") || file.size === 0 || file.size > MAX_FILE_SIZE) {
    return { ...INITIAL_STATE, error: "Upload a non-empty .xlsx file no larger than 5 MB." };
  }

  const election = await prisma.election.findUnique({
    where: { id: electionId },
    select: { id: true, status: true },
  });
  if (!election || !["DRAFT", "SCHEDULED", "PUBLISHED"].includes(election.status)) {
    return {
      ...INITIAL_STATE,
      error: "Eligibility can only be imported for an election that has not opened.",
    };
  }

  let rows;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      return { ...INITIAL_STATE, error: "The uploaded file is not a valid .xlsx workbook." };
    }
    rows = await parseEligibilitySpreadsheet(bytes);
  } catch (error) {
    if (error instanceof EligibilitySpreadsheetError) {
      return { ...INITIAL_STATE, error: error.message };
    }
    throw error;
  }

  const acceptedRows = rows.filter((row) => row.status === "ACCEPTED");
  const rejectedRows = rows.filter((row) => row.status === "REJECTED").length;
  const skippedRows = rows.filter((row) => row.status === "SKIPPED").length;
  const acceptedVoters = acceptedRows.flatMap((row) => row.voter ? [row.voter] : []);

  try {
    const importStatus = await prisma.$transaction(async (transaction) => {
      const lockedElections = await transaction.$queryRaw<{
        status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "OPEN" | "CLOSED" | "RESULTS_PUBLISHED" | "ARCHIVED";
        startsAt: Date | null;
        endsAt: Date | null;
      }[]>(
        Prisma.sql`SELECT "status", "startsAt", "endsAt" FROM "Election" WHERE "id" = ${election.id} FOR UPDATE`,
      );
      const lockedElection = lockedElections[0];
      const now = new Date();
      if (!lockedElection) {
        return "closed" as const;
      }

      const status = getEffectiveElectionStatus(lockedElection, now);
      if (status !== lockedElection.status && (status === "OPEN" || status === "CLOSED")) {
        await transaction.election.update({
          where: { id: election.id },
          data: { status },
        });
      }
      if (!canAcceptPreElectionChanges(status)) {
        return "closed" as const;
      }

      const importRecord = await transaction.datasetImport.create({
        data: {
          electionId: election.id,
          importedById: admin.id,
          filename: "eligibility-roster.xlsx",
          status: "VALIDATING",
          totalRows: rows.length,
        },
        select: { id: true },
      });

      for (const batch of chunks(acceptedVoters, CHUNK_SIZE)) {
        await transaction.voter.createMany({
          data: batch.map((voter) => {
            const identity = JSON.stringify([
              normalizeVoterName(voter.name),
              normalizePhoneNumber(voter.phone),
            ]);
            return {
              identificationCiphertext: encryptVoterField(identity, "voter-identity"),
              identificationLookupHash: voter.lookupHash,
              nameCiphertext: encryptVoterField(voter.name, "voter-name"),
              phoneCiphertext: encryptVoterField(voter.phone, "voter-phone"),
              emailCiphertext: voter.email
                ? encryptVoterField(voter.email, "voter-email")
                : null,
              departmentCiphertext: voter.department
                ? encryptVoterField(voter.department, "voter-department")
                : null,
            };
          }),
          skipDuplicates: true,
        });
      }

      const votersByLookupHash = new Map<string, string>();
      for (const batch of chunks(acceptedVoters, CHUNK_SIZE)) {
        const voters = await transaction.voter.findMany({
          where: {
            identificationLookupHash: {
              in: batch.map((voter) => voter.lookupHash),
            },
          },
          select: { id: true, identificationLookupHash: true },
        });
        for (const voter of voters) {
          votersByLookupHash.set(voter.identificationLookupHash, voter.id);
        }
      }

      const electionVoterIds = acceptedVoters.flatMap((voter) => {
        const voterId = votersByLookupHash.get(voter.lookupHash);
        return voterId ? [voterId] : [];
      });
      for (const batch of chunks(electionVoterIds, CHUNK_SIZE)) {
        await transaction.electionVoter.createMany({
          data: batch.map((voterId) => ({
            electionId: election.id,
            voterId,
            status: "ELIGIBLE",
          })),
          skipDuplicates: true,
        });
        await transaction.electionVoter.updateMany({
          where: {
            electionId: election.id,
            voterId: { in: batch },
            status: "SUSPENDED",
          },
          data: { status: "ELIGIBLE" },
        });
      }

      await transaction.datasetImportRecord.createMany({
        data: rows.map((row) => ({
          importId: importRecord.id,
          rowNumber: row.rowNumber,
          status: row.status,
          ...(row.errorCodes.length > 0 ? { errorCodes: row.errorCodes } : {}),
        })),
      });

      await transaction.datasetImport.update({
        where: { id: importRecord.id },
        data: {
          status: rejectedRows > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
          acceptedRows: acceptedRows.length,
          rejectedRows,
          completedAt: now,
        },
      });

      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ELIGIBILITY_ROSTER_IMPORTED",
          entityType: "DATASET_IMPORT",
          entityId: importRecord.id,
          outcome: rejectedRows > 0 ? "COMPLETED_WITH_ERRORS" : "SUCCESS",
          metadata: {
            electionId: election.id,
            acceptedRows: acceptedRows.length,
            rejectedRows,
            skippedRows,
          },
        },
      });
      return "imported" as const;
    }, { maxWait: 10_000, timeout: 60_000 });

    if (importStatus === "closed") {
      return {
        ...INITIAL_STATE,
        error: "This election has opened or closed. Eligibility can no longer be changed.",
      };
    }
  } catch (error) {
    const errorCode =
      error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "UNKNOWN";
    console.error("Eligibility roster import failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode,
    });
    return {
      ...INITIAL_STATE,
      error: "The roster could not be saved. No partial import was committed. Check the server logs and try again.",
    };
  }

  return {
    error: null,
    result: {
      acceptedRows: acceptedRows.length,
      rejectedRows,
      skippedRows,
    },
  };
}