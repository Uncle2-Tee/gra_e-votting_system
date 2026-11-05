-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ELECTION_ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'OPEN', 'CLOSED', 'RESULTS_PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('ELIGIBLE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'VALIDATING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRecordStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CredentialIssuanceStatus" AS ENUM ('ISSUED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "nameCiphertext" TEXT NOT NULL,
    "emailCiphertext" TEXT NOT NULL,
    "emailLookupHash" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voter" (
    "id" UUID NOT NULL,
    "identificationCiphertext" TEXT NOT NULL,
    "identificationLookupHash" TEXT NOT NULL,
    "nameCiphertext" TEXT NOT NULL,
    "emailCiphertext" TEXT,
    "phoneCiphertext" TEXT,
    "departmentCiphertext" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoterVerification" (
    "id" UUID NOT NULL,
    "voterId" UUID NOT NULL,
    "challengeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoterVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Election" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ElectionStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL,
    "resultsPublishedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionVoter" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "voterId" UUID NOT NULL,
    "status" "EligibilityStatus" NOT NULL DEFAULT 'ELIGIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectionVoter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialIssuance" (
    "id" UUID NOT NULL,
    "electionVoterId" UUID NOT NULL,
    "status" "CredentialIssuanceStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CredentialIssuance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteParticipation" (
    "id" UUID NOT NULL,
    "electionVoterId" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "minSelections" INTEGER NOT NULL DEFAULT 1,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "nameCiphertext" TEXT NOT NULL,
    "biography" TEXT,
    "photoUrl" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ballot" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "anonymousCredentialDigest" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ballot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BallotSelection" (
    "id" UUID NOT NULL,
    "ballotId" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "candidateId" UUID NOT NULL,

    CONSTRAINT "BallotSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetImport" (
    "id" UUID NOT NULL,
    "electionId" UUID,
    "importedById" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "acceptedRows" INTEGER NOT NULL DEFAULT 0,
    "rejectedRows" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DatasetImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetImportRecord" (
    "id" UUID NOT NULL,
    "importId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" "ImportRecordStatus" NOT NULL,
    "errorCodes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatasetImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "outcome" TEXT NOT NULL,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailLookupHash_key" ON "User"("emailLookupHash");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Voter_identificationLookupHash_key" ON "Voter"("identificationLookupHash");

-- CreateIndex
CREATE UNIQUE INDEX "VoterVerification_challengeHash_key" ON "VoterVerification"("challengeHash");

-- CreateIndex
CREATE INDEX "VoterVerification_voterId_expiresAt_idx" ON "VoterVerification"("voterId", "expiresAt");

-- CreateIndex
CREATE INDEX "Election_status_startsAt_endsAt_idx" ON "Election"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ElectionVoter_voterId_status_idx" ON "ElectionVoter"("voterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionVoter_electionId_voterId_key" ON "ElectionVoter"("electionId", "voterId");

-- CreateIndex
CREATE UNIQUE INDEX "CredentialIssuance_electionVoterId_key" ON "CredentialIssuance"("electionVoterId");

-- CreateIndex
CREATE UNIQUE INDEX "VoteParticipation_electionVoterId_key" ON "VoteParticipation"("electionVoterId");

-- CreateIndex
CREATE INDEX "Position_electionId_displayOrder_idx" ON "Position"("electionId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Position_id_electionId_key" ON "Position"("id", "electionId");

-- CreateIndex
CREATE INDEX "Candidate_electionId_positionId_status_idx" ON "Candidate"("electionId", "positionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_id_positionId_electionId_key" ON "Candidate"("id", "positionId", "electionId");

-- CreateIndex
CREATE INDEX "Ballot_electionId_acceptedAt_idx" ON "Ballot"("electionId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ballot_electionId_anonymousCredentialDigest_key" ON "Ballot"("electionId", "anonymousCredentialDigest");

-- CreateIndex
CREATE UNIQUE INDEX "Ballot_id_electionId_key" ON "Ballot"("id", "electionId");

-- CreateIndex
CREATE INDEX "BallotSelection_electionId_positionId_idx" ON "BallotSelection"("electionId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "BallotSelection_ballotId_positionId_candidateId_key" ON "BallotSelection"("ballotId", "positionId", "candidateId");

-- CreateIndex
CREATE INDEX "DatasetImport_createdAt_status_idx" ON "DatasetImport"("createdAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetImportRecord_importId_rowNumber_key" ON "DatasetImportRecord"("importId", "rowNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_userId_expiresAt_idx" ON "AdminSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "VoterVerification" ADD CONSTRAINT "VoterVerification_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Election" ADD CONSTRAINT "Election_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionVoter" ADD CONSTRAINT "ElectionVoter_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionVoter" ADD CONSTRAINT "ElectionVoter_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialIssuance" ADD CONSTRAINT "CredentialIssuance_electionVoterId_fkey" FOREIGN KEY ("electionVoterId") REFERENCES "ElectionVoter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteParticipation" ADD CONSTRAINT "VoteParticipation_electionVoterId_fkey" FOREIGN KEY ("electionVoterId") REFERENCES "ElectionVoter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_positionId_electionId_fkey" FOREIGN KEY ("positionId", "electionId") REFERENCES "Position"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ballot" ADD CONSTRAINT "Ballot_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallotSelection" ADD CONSTRAINT "BallotSelection_ballotId_electionId_fkey" FOREIGN KEY ("ballotId", "electionId") REFERENCES "Ballot"("id", "electionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallotSelection" ADD CONSTRAINT "BallotSelection_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallotSelection" ADD CONSTRAINT "BallotSelection_positionId_electionId_fkey" FOREIGN KEY ("positionId", "electionId") REFERENCES "Position"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallotSelection" ADD CONSTRAINT "BallotSelection_candidateId_positionId_electionId_fkey" FOREIGN KEY ("candidateId", "positionId", "electionId") REFERENCES "Candidate"("id", "positionId", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetImport" ADD CONSTRAINT "DatasetImport_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetImport" ADD CONSTRAINT "DatasetImport_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetImportRecord" ADD CONSTRAINT "DatasetImportRecord_importId_fkey" FOREIGN KEY ("importId") REFERENCES "DatasetImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
