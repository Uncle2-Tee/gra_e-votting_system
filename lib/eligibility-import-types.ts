export type EligibilityImportRowResult = {
  rowNumber: number;
  status: "ACCEPTED" | "REJECTED" | "SKIPPED";
  errorCodes: string[];
  voter?: {
    name: string;
    phone: string;
    email: string | null;
    department: string | null;
    lookupHash: string;
  };
};

export type EligibilityImportState = {
  error: string | null;
  result: {
    acceptedRows: number;
    rejectedRows: number;
    skippedRows: number;
  } | null;
};
