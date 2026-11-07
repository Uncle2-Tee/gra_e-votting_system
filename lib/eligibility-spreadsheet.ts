import ExcelJS from "exceljs";
import { createVoterIdentityLookupHash, normalizePhoneNumber } from "@/lib/voter-data-crypto";
import type { EligibilityImportRowResult } from "@/lib/eligibility-import-types";

const MAX_IMPORT_ROWS = 5000;

export class EligibilitySpreadsheetError extends Error {}

function getCellText(cell: ExcelJS.Cell) {
  const value = cell.value;
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (typeof value === "object" && ("formula" in value || "sharedFormula" in value)) {
    throw new EligibilitySpreadsheetError("Formula cells are not supported. Replace them with plain values.");
  }

  throw new EligibilitySpreadsheetError("Cells must contain plain text or numbers.");
}

function normalizedHeader(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en").replace(/[^a-z0-9]/g, "");
}

function resolveHeaders(worksheet: ExcelJS.Worksheet) {
  const headers = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = normalizedHeader(getCellText(cell));
    if (header) {
      if (headers.has(header)) {
        throw new EligibilitySpreadsheetError("The spreadsheet contains duplicate column headers.");
      }
      headers.set(header, columnNumber);
    }
  });

  const findColumn = (aliases: string[]) =>
    aliases.map((alias) => headers.get(alias)).find((column) => column !== undefined);
  const name = findColumn(["name", "fullname", "votername"]);
  const phone = findColumn([
    "phone",
    "phonenumber",
    "phonenumbers",
    "mobile",
    "mobilenumber",
    "telephone",
    "contactnumber",
  ]);
  const department = findColumn(["department", "unit", "division"]);

  if (!name || !phone || !department) {
    throw new EligibilitySpreadsheetError(
      "The first row must include Name, Department, and Phone Number columns. Email is optional.",
    );
  }

  return {
    name,
    phone,
    email: findColumn(["email", "emailaddress"]),
    department,
  };
}

function cellValue(worksheet: ExcelJS.Worksheet, row: number, column?: number) {
  return column ? getCellText(worksheet.getRow(row).getCell(column)) : "";
}

export async function parseEligibilitySpreadsheet(input: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  try {
    const workbookBuffer = new ArrayBuffer(input.byteLength);
    new Uint8Array(workbookBuffer).set(input);
    await workbook.xlsx.load(workbookBuffer);
  } catch {
    throw new EligibilitySpreadsheetError("The file is not a valid .xlsx workbook.");
  }

  if (workbook.worksheets.length !== 1) {
    throw new EligibilitySpreadsheetError("Upload a workbook with exactly one worksheet.");
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) {
    throw new EligibilitySpreadsheetError("The worksheet must contain a header and at least one voter row.");
  }
  if (worksheet.rowCount > MAX_IMPORT_ROWS + 1) {
    throw new EligibilitySpreadsheetError(`The workbook cannot contain more than ${MAX_IMPORT_ROWS} voter rows.`);
  }

  const columns = resolveHeaders(worksheet);
  const seenIdentities = new Set<string>();
  const rows: EligibilityImportRowResult[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const rowErrors: string[] = [];
    let name = "";
    let phone = "";
    let email = "";
    let department = "";

    try {
      name = cellValue(worksheet, rowNumber, columns.name);
      const phoneCell = worksheet.getRow(rowNumber).getCell(columns.phone);
      if (typeof phoneCell.value === "number") {
        rowErrors.push("phone_must_be_text");
      } else {
        phone = getCellText(phoneCell);
      }
      email = cellValue(worksheet, rowNumber, columns.email);
      department = cellValue(worksheet, rowNumber, columns.department);
    } catch (error) {
      if (error instanceof EligibilitySpreadsheetError) {
        rowErrors.push("unsupported_cell_value");
      } else {
        throw error;
      }
    }

    if (!name && !phone && !email && !department && rowErrors.length === 0) {
      rows.push({ rowNumber, status: "SKIPPED", errorCodes: ["empty_row"] });
      continue;
    }

    if (!name || name.length > 150) {
      rowErrors.push("invalid_name");
    }
    if (!phone || phone.length > 30 || !/^\+?[0-9\s().-]+$/.test(phone)) {
      rowErrors.push("invalid_phone");
    }
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      rowErrors.push("invalid_email");
    }
    if (department.length > 150) {
      rowErrors.push("invalid_department");
    }
    if (!department) {
      rowErrors.push("missing_department");
    }

    if (rowErrors.length > 0) {
      rows.push({ rowNumber, status: "REJECTED", errorCodes: rowErrors });
      continue;
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const digits = normalizedPhone.replace(/^\+/, "");
    if (digits.length < 7 || digits.length > 15) {
      rows.push({ rowNumber, status: "REJECTED", errorCodes: ["invalid_phone"] });
      continue;
    }

    const lookupHash = createVoterIdentityLookupHash(name, normalizedPhone);
    if (seenIdentities.has(lookupHash)) {
      rows.push({ rowNumber, status: "SKIPPED", errorCodes: ["duplicate_in_upload"] });
      continue;
    }
    seenIdentities.add(lookupHash);
    rows.push({
      rowNumber,
      status: "ACCEPTED",
      errorCodes: [],
      voter: {
        name: name.normalize("NFKC").trim().replace(/\s+/g, " "),
        phone: normalizedPhone,
        email: email || null,
        department: department || null,
        lookupHash,
      },
    });
  }

  if (!rows.some((row) => row.status !== "SKIPPED" || row.errorCodes[0] !== "empty_row")) {
    throw new EligibilitySpreadsheetError("The worksheet does not contain any voter rows.");
  }

  return rows;
}

export { MAX_IMPORT_ROWS };
