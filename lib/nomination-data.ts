import "server-only";

import { connection } from "next/server";
import {
  decryptVoterField,
} from "@/lib/voter-data-crypto";
import { synchronizeElectionStatuses } from "@/lib/election-schedule";
import { prisma } from "@/lib/prisma";
import type {
  PendingNominationData,
  VoterPortalData,
} from "@/lib/nomination-types";

export async function getVoterPortalData(): Promise<VoterPortalData> {
  await connection();

  try {
    await synchronizeElectionStatuses();
    const [positions, candidates] = await Promise.all([
      prisma.position.findMany({
        where: { election: { status: { in: ["SCHEDULED", "PUBLISHED"] } } },
        orderBy: [{ election: { startsAt: "asc" } }, { displayOrder: "asc" }],
        select: {
          id: true,
          title: true,
          election: { select: { title: true } },
        },
      }),
      prisma.candidate.findMany({
        where: {
          status: "APPROVED",
          election: { status: { in: ["SCHEDULED", "PUBLISHED", "OPEN"] } },
        },
        orderBy: [
          { election: { startsAt: "asc" } },
          { position: { displayOrder: "asc" } },
          { createdAt: "asc" },
        ],
        select: {
          id: true,
          nameCiphertext: true,
          biography: true,
          photoData: true,
          photoMimeType: true,
          position: { select: { title: true } },
          election: { select: { title: true } },
        },
      }),
    ]);

    return {
      databaseStatus: "connected",
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
          candidate.photoData && candidate.photoMimeType === "image/webp"
            ? `/admin/candidates/${candidate.id}/photo`
            : null,
        positionTitle: candidate.position.title,
        electionTitle: candidate.election.title,
      })),
    };
  } catch (error) {
    logNominationDataError("voter portal", error);
    return { databaseStatus: "unavailable", positions: [], nominees: [] };
  }
}

export async function getPendingNominationData(): Promise<PendingNominationData> {
  await connection();

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
          photoData: true,
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
          photoData: true,
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
    logNominationDataError("administrator nomination queue", error);
    return {
      applications: [],
      approvedApplications: [],
      error: "Nomination applications could not be loaded from the database.",
    };
  }
}

function mapAdminNomination(application: {
  id: string;
  nameCiphertext: string;
  applicantEmailCiphertext: string | null;
  applicantPhoneCiphertext: string | null;
  biography: string | null;
  photoData: Uint8Array<ArrayBufferLike> | null;
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
      application.photoData && application.photoMimeType === "image/webp"
        ? `/admin/candidates/${application.id}/photo`
        : null,
    electionTitle: application.election.title,
    positionTitle: application.position.title,
    submittedAt: application.createdAt.toISOString(),
  };
}

function logNominationDataError(scope: string, error: unknown) {
  const errorCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "UNKNOWN";
  console.error(`Could not load ${scope} nomination data.`, {
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorCode,
  });
}
