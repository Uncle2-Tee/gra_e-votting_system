export type NominationApplicationState = {
  error: string | null;
  success: boolean;
};

export type NominationReviewState = {
  error: string | null;
  success: string | null;
};

export type NominationPositionOption = {
  id: string;
  title: string;
  electionTitle: string;
};

export type ApprovedNominee = {
  id: string;
  name: string;
  biography: string | null;
  photoUrl: string | null;
  positionTitle: string;
  electionTitle: string;
};

export type VoterPortalData = {
  databaseStatus: "connected" | "unavailable";
  elections: {
    id: string;
    title: string;
    status: "SCHEDULED" | "PUBLISHED" | "OPEN";
    startsAt: string;
    endsAt: string;
    timezone: string;
  }[];
  approvedNomineesCount: number;
  positions: NominationPositionOption[];
  nominees: ApprovedNominee[];
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

export type PendingNomination = {
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

export type PendingNominationData = {
  applications: PendingNomination[];
  approvedApplications: PendingNomination[];
  error: string | null;
};
