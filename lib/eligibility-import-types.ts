export type EligibilityImportRowResult = {
  rowNumber: number;
  status: "ACCEPTED" | "REJECTED" | "SKIPPED";
  errorCodes: string[];
  voter?: {
    staffNumber: string;
    staffNumberLookupHash: string;
    name: string;
    phone: string;
    phoneLookupHash: string;
  };
};

export type EligibilityImportState = {
  error: string | null;
  result: {
    acceptedRows: number;
    rejectedRows: number;
    skippedRows: number;
    electionsUpdated: number;
  } | null;
};
