ALTER TABLE "Voter"
ADD COLUMN "phoneLookupHash" TEXT;

CREATE UNIQUE INDEX "Voter_phoneLookupHash_key"
ON "Voter"("phoneLookupHash");

ALTER TABLE "ElectionVoter"
ADD COLUMN "voterCredentialDigest" TEXT,
ADD COLUMN "voterCredentialIssuedAt" TIMESTAMP(3),
ADD COLUMN "voterCredentialWindowStartedAt" TIMESTAMP(3),
ADD COLUMN "voterCredentialRequestCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "ElectionVoter_voterCredentialDigest_key"
ON "ElectionVoter"("voterCredentialDigest");

ALTER TABLE "VoteParticipation"
ADD COLUMN "positionId" UUID;

DROP INDEX "VoteParticipation_electionVoterId_key";

ALTER TABLE "VoteParticipation"
ALTER COLUMN "recordedAt" DROP DEFAULT,
ALTER COLUMN "recordedAt" DROP NOT NULL;

CREATE UNIQUE INDEX "VoteParticipation_electionVoterId_positionId_key"
ON "VoteParticipation"("electionVoterId", "positionId");

ALTER TABLE "VoteParticipation"
ADD CONSTRAINT "VoteParticipation_positionId_fkey"
FOREIGN KEY ("positionId") REFERENCES "Position"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
