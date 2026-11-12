import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const electionTitle = "[TEST DATA] GRA E-Voting Candidate Demo";
const timezone = "Africa/Accra";

function getTestDatabaseUrl() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Test election data cannot be changed in production.");
  }
  if (process.env.ALLOW_TEST_DATA !== "YES") {
    throw new Error("Set ALLOW_TEST_DATA=YES to confirm this test-data operation.");
  }
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("Set TEST_DATABASE_URL to a dedicated development/test database.");
  }
  return url;
}

const prisma = new PrismaClient({
  datasources: { db: { url: getTestDatabaseUrl() } },
});

try {
  const admin = await prisma.user.findFirst({
    where: {
      status: "ACTIVE",
      role: { in: ["SUPER_ADMIN", "ELECTION_ADMIN"] },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!admin) {
    throw new Error("Sign in to the test application once to create an administrator, then run this command again.");
  }

  const now = new Date();
  const startsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const election = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.election.findFirst({
      where: { title: electionTitle },
      select: { id: true },
    });

    const savedElection = existing
      ? await transaction.election.update({
          where: { id: existing.id },
          data: {
            description: "Test-only election for trying the public candidate form. Safe to remove with npm run db:delete:test.",
            status: "SCHEDULED",
            startsAt,
            endsAt,
            timezone,
          },
          select: { id: true },
        })
      : await transaction.election.create({
          data: {
            title: electionTitle,
            description: "Test-only election for trying the public candidate form. Safe to remove with npm run db:delete:test.",
            status: "SCHEDULED",
            startsAt,
            endsAt,
            timezone,
            createdById: admin.id,
          },
          select: { id: true },
        });

    const positionExamples = [
      {
        title: "President",
        description: "Test candidate for the President position.",
        displayOrder: 1,
      },
      {
        title: "Vice President",
        description: "Test candidate for the Vice President position.",
        displayOrder: 2,
      },
      {
        title: "Secretary",
        description: "Test candidate for the Secretary position.",
        displayOrder: 3,
      },
    ];

    for (const position of positionExamples) {
      const existingPosition = await transaction.position.findFirst({
        where: { electionId: savedElection.id, title: position.title },
        select: { id: true },
      });
      if (existingPosition) {
        await transaction.position.update({
          where: { id: existingPosition.id },
          data: position,
        });
      } else {
        await transaction.position.create({
          data: { ...position, electionId: savedElection.id },
        });
      }
    }

    return savedElection;
  });

  console.log(`Created or refreshed "${electionTitle}" (${election.id}).`);
  console.log(`Candidate options: President, Vice President, Secretary.`);
  console.log(`Voting opens in 30 days and closes in 37 days (${timezone}).`);
  console.log("Open /vote/candidate-application to test. Remove this election with npm run db:delete:test.");
} finally {
  await prisma.$disconnect();
}
