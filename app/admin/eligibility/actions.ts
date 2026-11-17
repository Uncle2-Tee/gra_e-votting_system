"use server";

import { Prisma, type ElectionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  decryptVoterField,
  encryptVoterField,
  createLegacyVoterNameLookupHash,
  normalizeVoterName,
  normalizeVoterStaffNumber,
} from "@/lib/voter-data-crypto";
import {
  getCurrentAdmin,
  isAdminDatabaseUnavailableError,
} from "@/lib/admin-security";
import { getEffectiveElectionStatus } from "@/lib/election-schedule";
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

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ...INITIAL_STATE, error: "Select an .xlsx file." };
  }
  if (!file.name.toLocaleLowerCase("en").endsWith(".xlsx") || file.size === 0 || file.size > MAX_FILE_SIZE) {
    return { ...INITIAL_STATE, error: "Upload a non-empty .xlsx file no larger than 5 MB." };
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

  try {
    const result = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(604218731)::text AS lock_result
      `;

      const lookupHashBatches = chunks(
        [...new Set(rows.flatMap((row) => row.voter
          ? [
              row.voter.staffNumberLookupHash,
              createLegacyVoterNameLookupHash(row.voter.name),
            ]
          : []))],
        CHUNK_SIZE,
      );
      const phoneHashBatches = chunks(
        [...new Set(rows.flatMap((row) => row.voter ? [row.voter.phoneLookupHash] : []))],
        CHUNK_SIZE,
      );
      const existingVotersById = new Map<
        string,
        {
          id: string;
          identificationLookupHash: string;
          phoneLookupHash: string | null;
          nameCiphertext: string;
        }
      >();
      const lookupBatchCount = Math.max(
        lookupHashBatches.length,
        phoneHashBatches.length,
      );
      for (let batchIndex = 0; batchIndex < lookupBatchCount; batchIndex += 1) {
        const filters: Prisma.VoterWhereInput[] = [];
        const lookupHashes = lookupHashBatches[batchIndex];
        const phoneHashes = phoneHashBatches[batchIndex];
        if (lookupHashes?.length) {
          filters.push({ identificationLookupHash: { in: lookupHashes } });
        }
        if (phoneHashes?.length) {
          filters.push({ phoneLookupHash: { in: phoneHashes } });
        }

        const existingBatch = await transaction.voter.findMany({
          where: { OR: filters },
          select: {
            id: true,
            identificationLookupHash: true,
            phoneLookupHash: true,
            nameCiphertext: true,
          },
        });
        for (const voter of existingBatch) {
          existingVotersById.set(voter.id, voter);
        }
      }
      const existingVoters = [...existingVotersById.values()];
      const voterIdsByStaffNumberHash = new Map<string, string[]>();
      const existingVotersByStaffNumberHash = new Map<
        string,
        {
          id: string;
          identificationLookupHash: string;
          phoneLookupHash: string | null;
          nameCiphertext: string;
        }
      >();
      const existingVotersByLegacyNameHash = new Map<
        string,
        (typeof existingVoters)[number]
      >();
      for (const voter of existingVoters) {
        existingVotersByStaffNumberHash.set(voter.identificationLookupHash, voter);
        existingVotersByLegacyNameHash.set(voter.identificationLookupHash, voter);
      }

      const phoneOwners = new Map<string, string>();
      for (const voter of existingVoters) {
        voterIdsByStaffNumberHash.set(voter.identificationLookupHash, [voter.id]);
        if (voter.phoneLookupHash) {
          phoneOwners.set(voter.phoneLookupHash, voter.id);
        }
      }

      const importRows = rows.map((row) => {
        if (row.status !== "ACCEPTED" || !row.voter) {
          return row;
        }
        let existing = existingVotersByStaffNumberHash.get(row.voter.staffNumberLookupHash);
        if (!existing) {
          const legacyCandidate = existingVotersByLegacyNameHash.get(
            createLegacyVoterNameLookupHash(row.voter.name),
          );
          if (legacyCandidate) {
            existing = legacyCandidate;
            existingVotersByStaffNumberHash.set(row.voter.staffNumberLookupHash, existing);
          }
        }
        const phoneOwner = phoneOwners.get(row.voter.phoneLookupHash);
        if (phoneOwner && phoneOwner !== existing?.id) {
          return {
            ...row,
            status: "REJECTED" as const,
            errorCodes: ["phone_already_registered"],
          };
        }
        if (
          existing?.identificationLookupHash === row.voter.staffNumberLookupHash &&
          existing?.phoneLookupHash === row.voter.phoneLookupHash &&
          normalizeVoterName(decryptVoterField(existing.nameCiphertext, "voter-name")) ===
            normalizeVoterName(row.voter.name)
        ) {
          return {
            ...row,
            status: "SKIPPED" as const,
            errorCodes: ["already_registered"],
          };
        }
        phoneOwners.set(row.voter.phoneLookupHash, existing?.id ?? row.voter.staffNumberLookupHash);
        return row;
      });
      const acceptedRows = importRows.filter((row) => row.status === "ACCEPTED");
      const rejectedRows = importRows.filter((row) => row.status === "REJECTED").length;
      const skippedRows = importRows.filter((row) => row.status === "SKIPPED").length;
      const acceptedVoters = acceptedRows.flatMap((row) => row.voter ? [row.voter] : []);
      const acceptedExistingVoters = acceptedVoters.flatMap((voter) => {
        const existing = existingVotersByStaffNumberHash.get(voter.staffNumberLookupHash);
        return existing
          ? [{
              id: existing.id,
              voter,
              phoneChanged: existing.phoneLookupHash !== voter.phoneLookupHash,
            }]
          : [];
      });

      const elections = await transaction.$queryRaw<{
        id: string;
        status: ElectionStatus;
        startsAt: Date | null;
        endsAt: Date | null;
      }[]>`
        SELECT "id", "status", "startsAt", "endsAt"
        FROM "Election"
        ORDER BY "id"
        FOR UPDATE
      `;
      const now = new Date();
      const eligibleElectionIds: string[] = [];
      for (const election of elections) {
        const status = getEffectiveElectionStatus(election, now);
        if (status !== election.status) {
          await transaction.election.update({
            where: { id: election.id },
            data: { status },
          });
        }
        if (["DRAFT", "SCHEDULED", "PUBLISHED", "OPEN"].includes(status)) {
          eligibleElectionIds.push(election.id);
        }
      }

      const importRecord = await transaction.datasetImport.create({
        data: {
          importedById: admin.id,
          filename: "eligible-voters.xlsx",
          status: "VALIDATING",
          totalRows: importRows.length,
        },
        select: { id: true },
      });

      for (const batch of chunks(acceptedVoters, CHUNK_SIZE)) {
        const newVoters = batch.filter(
          (voter) => !existingVotersByStaffNumberHash.has(voter.staffNumberLookupHash),
        );
        if (newVoters.length === 0) {
          continue;
        }
        await transaction.voter.createMany({
          data: newVoters.map((voter) => {
            const identity = normalizeVoterStaffNumber(voter.staffNumber);
            return {
              identificationCiphertext: encryptVoterField(identity, "voter-identity"),
              identificationLookupHash: voter.staffNumberLookupHash,
              nameCiphertext: encryptVoterField(voter.name, "voter-name"),
              phoneCiphertext: encryptVoterField(voter.phone, "voter-phone"),
              phoneLookupHash: voter.phoneLookupHash,
            };
          }),
          skipDuplicates: true,
        });
      }

      const existingIdsToUpdate = acceptedExistingVoters
        .filter(({ phoneChanged }) => phoneChanged)
        .map(({ id }) => id);
      if (existingIdsToUpdate.length > 0) {
        await transaction.voter.updateMany({
          where: { id: { in: existingIdsToUpdate } },
          data: { phoneLookupHash: null },
        });
        await transaction.electionVoter.updateMany({
          where: { voterId: { in: existingIdsToUpdate } },
          data: {
            voterCredentialDigest: null,
            voterCredentialCiphertext: null,
            voterCredentialIssuedAt: null,
            voterCredentialWindowStartedAt: null,
            voterCredentialRequestCount: 0,
          },
        });
      }
      for (const batch of chunks(acceptedExistingVoters, CHUNK_SIZE)) {
        const values = batch.map(({ id, voter }) => Prisma.sql`
          (${id}::uuid,
           ${encryptVoterField(normalizeVoterStaffNumber(voter.staffNumber), "voter-identity")},
           ${voter.staffNumberLookupHash}, ${encryptVoterField(voter.name, "voter-name")},
           ${encryptVoterField(voter.phone, "voter-phone")}, ${voter.phoneLookupHash})
        `);
        if (values.length > 0) {
          await transaction.$executeRaw(Prisma.sql`
            UPDATE "Voter" AS target
            SET "identificationCiphertext" = imported."identificationCiphertext",
                "identificationLookupHash" = imported."identificationLookupHash",
                "nameCiphertext" = imported."nameCiphertext",
                "phoneCiphertext" = imported."phoneCiphertext",
                "phoneLookupHash" = imported."phoneLookupHash",
                "updatedAt" = CURRENT_TIMESTAMP
            FROM (VALUES ${Prisma.join(values)}) AS imported(
              "id", "identificationCiphertext", "identificationLookupHash",
              "nameCiphertext", "phoneCiphertext", "phoneLookupHash"
            )
            WHERE target."id" = imported."id"
          `);
        }
      }

      for (const batch of chunks(acceptedVoters, CHUNK_SIZE)) {
        const voters = await transaction.voter.findMany({
          where: {
            identificationLookupHash: {
              in: batch.map((voter) => voter.staffNumberLookupHash),
            },
          },
          select: { id: true, identificationLookupHash: true },
        });
        for (const voter of voters) {
          voterIdsByStaffNumberHash.set(
            voter.identificationLookupHash,
            [...(voterIdsByStaffNumberHash.get(voter.identificationLookupHash) ?? []), voter.id],
          );
        }
      }

      const voterIds = [...new Set(
        [...new Set(rows.flatMap((row) => row.voter ? [row.voter.staffNumberLookupHash] : []))]
          .flatMap((lookupHash) => voterIdsByStaffNumberHash.get(lookupHash) ?? []),
      )];
      for (const electionId of eligibleElectionIds) {
        for (const batch of chunks(voterIds, CHUNK_SIZE)) {
          await transaction.electionVoter.createMany({
            data: batch.map((voterId) => ({
              electionId,
              voterId,
              status: "ELIGIBLE",
            })),
            skipDuplicates: true,
          });
          await transaction.electionVoter.updateMany({
            where: {
              electionId,
              voterId: { in: batch },
              status: "SUSPENDED",
            },
            data: { status: "ELIGIBLE" },
          });
        }
      }

      await transaction.datasetImportRecord.createMany({
        data: importRows.map((row) => ({
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
            eligibilityScope: "ALL_CURRENT_AND_FUTURE_ELECTIONS",
            acceptedRows: acceptedRows.length,
            rejectedRows,
            skippedRows,
            electionsUpdated: eligibleElectionIds.length,
          },
        },
      });
      return {
        acceptedRows: acceptedRows.length,
        rejectedRows,
        skippedRows,
        electionsUpdated: eligibleElectionIds.length,
      };
    }, { maxWait: 10_000, timeout: 60_000 });
    revalidatePath("/admin");
    revalidatePath("/admin/voters");
    revalidatePath("/admin/eligibility");
    return {
      error: null,
      result: {
        ...result,
      },
    };
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

}