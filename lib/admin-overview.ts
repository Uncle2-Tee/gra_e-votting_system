import "server-only";

import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export type AdminOverview = {
  databaseStatus: "connected";
  stats: {
    totalElections: number;
    registeredVoters: number;
    eligibleVoters: number;
    participants: number;
    turnoutPercentage: number;
  };
  elections: {
    id: string;
    title: string;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
  }[];
  auditEvents: {
    id: string;
    action: string;
    entityType: string;
    outcome: string;
    createdAt: string;
  }[];
} | {
  databaseStatus: "unavailable";
  stats: null;
  elections: [];
  auditEvents: [];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  await connection();

  try {
    const [
      totalElections,
      registeredVoters,
      eligibleVoters,
      participants,
      elections,
      auditEvents,
    ] = await prisma.$transaction([
      prisma.election.count(),
      prisma.voter.count(),
      prisma.electionVoter.count({ where: { status: "ELIGIBLE" } }),
      prisma.voteParticipation.count({
        where: { electionVoter: { status: "ELIGIBLE" } },
      }),
      prisma.election.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          action: true,
          entityType: true,
          outcome: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      databaseStatus: "connected",
      stats: {
        totalElections,
        registeredVoters,
        eligibleVoters,
        participants,
        turnoutPercentage:
          eligibleVoters === 0
            ? 0
            : Math.round((participants / eligibleVoters) * 1000) / 10,
      },
      elections: elections.map((election) => ({
        ...election,
        startsAt: election.startsAt?.toISOString() ?? null,
        endsAt: election.endsAt?.toISOString() ?? null,
      })),
      auditEvents: auditEvents.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? ` (${error.code})`
        : "";
    console.warn(`Failed to load the administrator dashboard overview: ${errorName}${errorCode}`);
    return {
      databaseStatus: "unavailable",
      stats: null,
      elections: [],
      auditEvents: [],
    };
  }
}
