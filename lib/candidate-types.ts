export type CandidateApplicationState = {
  error: string | null;
  success: boolean;
};

export type CandidateReviewState = {
  error: string | null;
  success: string | null;
};

export type CandidatePositionOption = {
  id: string;
  title: string;
  electionTitle: string;
};

export type ApprovedCandidate = {
  id: string;
  name: string;
  biography: string | null;
  photoUrl: string | null;
  positionTitle: string;
  electionTitle: string;
};

export type VoterPortalData = {
  databaseStatus: "connected" | "unavailable";
  ballotingEnabled: boolean;
  elections: {
    id: string;
    title: string;
    status: "SCHEDULED" | "PUBLISHED" | "OPEN";
    startsAt: string;
    endsAt: string;
    timezone: string;
    hasApprovedCandidates: boolean;
  }[];
  approvedCandidatesCount: number;
  positions: CandidatePositionOption[];
  candidates: ApprovedCandidate[];
};

export type VoterResultsData = {
  databaseStatus: "connected" | "unavailable";
  elections: {
    id: string;
    title: string;
    status: "OPEN" | "FINAL";
    resultsAvailableAt: string | null;
    timezone: string;
    ballotsCast: number;
    positions: {
      id: string;
      title: string;
      candidates: {
        id: string;
        name: string;
        photoUrl: string | null;
        votes: number;
        percentage: number;
      }[];
    }[];
  }[];
};

export type PendingCandidate = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  biography: string | null;
  photoUrl: string | null;
  electionTitle: string;
  positionTitle: string;
  submittedAt: string;
};

export type PendingCandidateData = {
  applications: PendingCandidate[];
  approvedApplications: PendingCandidate[];
  error: string | null;
};
