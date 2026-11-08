import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import {
  getCurrentAdmin,
  isAdminDatabaseUnavailableError,
} from "@/lib/admin-security";

export async function GET(request: Request) {
  let admin: Awaited<ReturnType<typeof getCurrentAdmin>>;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    return NextResponse.json(
      { error: "The database is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Eligible voters");
  worksheet.addRow(["Name", "Phone Number"]);
  worksheet.getRow(1).font = { bold: true };
  worksheet.columns = [{ width: 36 }, { width: 24 }];

  const bytes = await workbook.xlsx.writeBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="eligible-voter-template.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}
