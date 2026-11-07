import "server-only";

import { connection } from "next/server";
import { synchronizeElectionStatuses } from "@/lib/election-schedule";
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
    timezone: string;
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

export type AdminElectionSchedules = {
  databaseStatus: "connected";
  elections: {
    id: string;
    title: string;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    timezone: string;
    positions: string[];
  }[];
} | {
  databaseStatus: "unavailable";
  elections: [];
};

export async function getAdminElectionSchedules(): Promise<AdminElectionSchedules> {
  await connection();

  try {
    await synchronizeElectionStatuses();
    const elections = await prisma.election.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        status: true,
        startsAt: true,
        endsAt: true,
        timezone: true,
        positions: {
          orderBy: { displayOrder: "asc" },
          select: { title: true },
        },
      },
    });

    return {
      databaseStatus: "connected",
      elections: elections.map((election) => ({
        ...election,
        startsAt: election.startsAt?.toISOString() ?? null,
        endsAt: election.endsAt?.toISOString() ?? null,
        positions: election.positions.map(({ title }) => title),
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
    console.warn(`Failed to load administrator election schedules: ${errorName}${errorCode}`);
    return { databaseStatus: "unavailable", elections: [] };
  }
}

export async function getAdminOverview(): Promise<AdminOverview> {
  await connection();

  try {
    await synchronizeElectionStatuses();
    const [
      totalElections,
      registeredVoters,
      eligibleVoters,
      participants,
      elections,
      auditEvents,
    ] = await Promise.all([
      prisma.election.count(),
      prisma.voter.count(),
      prisma.electionVoter.count({ where: { status: "ELIGIBLE" } }),
      prisma.voteParticipation.count({
        where: { electionVoter: { status: "ELIGIBLE" } },
      }),
      prisma.election.findMany({
        where: { status: { not: "ARCHIVED" } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
          timezone: true,
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
