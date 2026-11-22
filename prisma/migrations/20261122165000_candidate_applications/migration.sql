CREATE TABLE "CandidateApplication" (
    "id" UUID NOT NULL,
    "positionTemplateId" UUID NOT NULL,
    "nameCiphertext" TEXT NOT NULL,
    "applicantEmailCiphertext" TEXT,
    "applicantPhoneCiphertext" TEXT,
    "applicantLookupHash" TEXT NOT NULL,
    "biography" TEXT,
    "photoData" BYTEA,
    "photoMimeType" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CandidateApplication_positionTemplateId_applicantLookupHash_key"
ON "CandidateApplication"("positionTemplateId", "applicantLookupHash");
CREATE INDEX "CandidateApplication_positionTemplateId_status_idx"
ON "CandidateApplication"("positionTemplateId", "status");
CREATE INDEX "CandidateApplication_reviewedById_reviewedAt_idx"
ON "CandidateApplication"("reviewedById", "reviewedAt");

ALTER TABLE "CandidateApplication"
ADD CONSTRAINT "CandidateApplication_positionTemplateId_fkey"
FOREIGN KEY ("positionTemplateId") REFERENCES "PositionTemplate"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CandidateApplication"
ADD CONSTRAINT "CandidateApplication_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
