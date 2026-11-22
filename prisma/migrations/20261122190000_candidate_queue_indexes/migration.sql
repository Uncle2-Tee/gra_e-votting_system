CREATE INDEX IF NOT EXISTS "CandidateApplication_status_createdAt_id_idx"
ON "CandidateApplication"("status", "createdAt", "id");

CREATE INDEX IF NOT EXISTS "CandidateApplication_status_reviewedAt_createdAt_idx"
ON "CandidateApplication"("status", "reviewedAt", "createdAt");
