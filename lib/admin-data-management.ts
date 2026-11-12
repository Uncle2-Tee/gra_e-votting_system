import "server-only";

import { Prisma } from "@prisma/client";
import { connection } from "next/server";
import { decryptVoterField } from "@/lib/voter-data-crypto";
import { prisma } from "@/lib/prisma";

export const ADMIN_DATA_KINDS = [
  "voters",
  "eligibility",
  "ballots",
  "candidates",
  "positions",
  "imports",
] as const;

export type AdminDataKind = (typeof ADMIN_DATA_KINDS)[number];

export const ADMIN_DATA_KIND_LABELS: Record<AdminDataKind, string> = {
  voters: "Voter records",
  eligibility: "Eligibility assignments",
  ballots: "Anonymous ballots",
  candidates: "Candidate applications",
  positions: "Election positions",
  imports: "Import batches",
};

export type AdminDataRecord = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
};

export type AdminDataPage = {
  databaseStatus: "connected" | "unavailable";
  kind: AdminDataKind;
  page: number;
  totalPages: number;
  total: number;
  records: AdminDataRecord[];
  error: string | null;
};

const PAGE_SIZE = 25;

export function isAdminDataKind(value: string | undefined): value is AdminDataKind {
  return ADMIN_DATA_KINDS.some((kind) => kind === value);
}

function getDatabaseErrorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code;
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return error.errorCode ?? "INITIALIZATION";
  }
  return "UNKNOWN";
}

export async function getAdminDataPage(
  kind: AdminDataKind,
  requestedPage: number,
): Promise<AdminDataPage> {
  await connection();

  try {
    let total: number;
    let records: AdminDataRecord[];
    let page: number;

    switch (kind) {
      case "voters": {
        total = await prisma.voter.count();
        page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
        const voters = await prisma.voter.findMany({
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true,
            nameCiphertext: true,
            status: true,
            createdAt: true,
          },
        });
        records = voters.map((voter) => ({
          id: voter.id,
          title: decryptVoterField(voter.nameCiphertext, "voter-name"),
          detail: `${voter.status} · Record ${voter.id.slice(0, 8)}`,
          createdAt: voter.createdAt.toISOString(),
        }));
        break;
      }
      case "eligibility": {
        total = await prisma.electionVoter.count();
        page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
        const assignments = await prisma.electionVoter.findMany({
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true,
            status: true,
            createdAt: true,
            election: { select: { title: true } },
            voter: { select: { id: true, nameCiphertext: true } },
          },
        });
        records = assignments.map((assignment) => ({
          id: assignment.id,
          title: decryptVoterField(assignment.voter.nameCiphertext, "voter-name"),
          detail: `${assignment.election.title} · ${assignment.status} · Voter ${assignment.voter.id.slice(0, 8)}`,
          createdAt: assignment.createdAt.toISOString(),
        }));
        break;
      }
      case "ballots": {
        total = await prisma.ballot.count();
        page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
        const ballots = await prisma.ballot.findMany({
          orderBy: [{ acceptedAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true,
            acceptedAt: true,
            election: { select: { title: true } },
            _count: { select: { selections: true } },
          },
        });
        records = ballots.map((ballot) => ({
          id: ballot.id,
          title: ballot.election.title,
          detail: `Anonymous ballot ${ballot.id.slice(0, 8)} · ${ballot._count.selections} selection${ballot._count.selections === 1 ? "" : "s"}`,
          createdAt: ballot.acceptedAt.toISOString(),
        }));
        break;
      }
      case "candidates": {
        total = await prisma.candidate.count();
        page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
        const candidates = await prisma.candidate.findMany({
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true,
            nameCiphertext: true,
            status: true,
            createdAt: true,
            election: { select: { title: true } },
            position: { select: { title: true } },
          },
        });
        records = candidates.map((candidate) => ({
          id: candidate.id,
          title: decryptVoterField(candidate.nameCiphertext, "candidate-name"),
          detail: `${candidate.election.title} · ${candidate.position.title} · ${candidate.status}`,
          createdAt: candidate.createdAt.toISOString(),
        }));
        break;
      }
      case "positions": {
        total = await prisma.position.count();
        page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
        const positions = await prisma.position.findMany({
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            createdAt: true,
            election: { select: { title: true } },
            _count: { select: { candidates: true } },
          },
        });
        records = positions.map((position) => ({
          id: position.id,
          title: position.title,
          detail: `${position.election.title} · ${position._count.candidates} candidate${position._count.candidates === 1 ? "" : "s"}`,
          createdAt: position.createdAt.toISOString(),
        }));
        break;
      }
      case "imports": {
        total = await prisma.datasetImport.count();
        page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
        const imports = await prisma.datasetImport.findMany({
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true,
            filename: true,
            status: true,
            createdAt: true,
            totalRows: true,
          },
        });
        records = imports.map((datasetImport) => ({
          id: datasetImport.id,
          title: datasetImport.filename,
          detail: `${datasetImport.status} · ${datasetImport.totalRows} row${datasetImport.totalRows === 1 ? "" : "s"}`,
          createdAt: datasetImport.createdAt.toISOString(),
        }));
        break;
      }
    }

    return {
      databaseStatus: "connected",
      kind,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      total,
      records,
      error: null,
    };
  } catch (error) {
    const errorCode = getDatabaseErrorCode(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(
      `Could not load administrator data management records. errorName=${errorName} errorCode=${errorCode}`,
    );
    return {
      databaseStatus: "unavailable",
      kind,
      page: 1,
      totalPages: 1,
      total: 0,
      records: [],
      error: "Records could not be loaded. Check the database connection and try again.",
    };
  }
}
