-- Add encrypted applicant contact fields and administrator review metadata.
ALTER TABLE "Candidate"
ADD COLUMN "applicantEmailCiphertext" TEXT,
ADD COLUMN "applicantPhoneCiphertext" TEXT,
ADD COLUMN "applicantLookupHash" TEXT,
ADD COLUMN "reviewedById" UUID,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewNote" TEXT;

CREATE UNIQUE INDEX "Candidate_positionId_applicantLookupHash_key"
ON "Candidate"("positionId", "applicantLookupHash");

CREATE INDEX "Candidate_reviewedById_reviewedAt_idx"
ON "Candidate"("reviewedById", "reviewedAt");

ALTER TABLE "Candidate"
ADD CONSTRAINT "Candidate_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
