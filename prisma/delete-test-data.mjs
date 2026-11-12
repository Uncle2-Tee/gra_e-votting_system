import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const electionTitles = [
  "[TEST DATA] GRA E-Voting Candidate Demo",
  "[TEST DATA] GRA E-Voting Ballot Demo",
];

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
  const elections = await prisma.election.findMany({
    where: { title: { in: electionTitles } },
    select: { id: true, title: true },
  });
  if (elections.length === 0) {
    console.log("No test elections were found.");
  } else {
    await prisma.$transaction(async (transaction) => {
      for (const election of elections) {
        const imports = await transaction.datasetImport.findMany({
          where: { electionId: election.id },
          select: { id: true },
        });
        const importIds = imports.map(({ id }) => id);
        if (importIds.length > 0) {
          await transaction.datasetImportRecord.deleteMany({
            where: { importId: { in: importIds } },
          });
        }
        await transaction.ballotSelection.deleteMany({
          where: { electionId: election.id },
        });
        await transaction.candidate.deleteMany({
          where: { electionId: election.id },
        });
        await transaction.ballot.deleteMany({
          where: { electionId: election.id },
        });

        const eligibility = await transaction.electionVoter.findMany({
          where: { electionId: election.id },
          select: { id: true },
        });
        const eligibilityIds = eligibility.map(({ id }) => id);
        if (eligibilityIds.length > 0) {
          await transaction.demoBallotCredential.deleteMany({
            where: { electionVoterId: { in: eligibilityIds } },
          });
          await transaction.voteParticipation.deleteMany({
            where: { electionVoterId: { in: eligibilityIds } },
          });
        }
        await transaction.electionVoter.deleteMany({
          where: { electionId: election.id },
        });
        await transaction.datasetImport.deleteMany({
          where: { electionId: election.id },
        });
        await transaction.position.deleteMany({
          where: { electionId: election.id },
        });
        await transaction.election.delete({
          where: { id: election.id },
        });
      }
    });
    console.log(`Deleted ${elections.length} test election(s) and their related records.`);
    console.log("Audit history and voter records are retained.");
  }
} finally {
  await prisma.$disconnect();
}
