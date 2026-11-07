ALTER TABLE "Candidate"
DROP CONSTRAINT "Candidate_positionId_electionId_fkey";

ALTER TABLE "Candidate"
ADD CONSTRAINT "Candidate_positionId_electionId_fkey"
FOREIGN KEY ("positionId", "electionId")
REFERENCES "Position"("id", "electionId")
ON DELETE CASCADE
ON UPDATE CASCADE;
