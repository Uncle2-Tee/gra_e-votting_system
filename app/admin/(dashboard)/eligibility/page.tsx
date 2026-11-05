import { Suspense } from "react";
import { connection } from "next/server";
import AdminEligibilityImport from "@/components/admin-eligibility-import";
import { synchronizeElectionStatuses } from "@/lib/election-schedule";
import { prisma } from "@/lib/prisma";

async function EligibilityData() {
  await connection();
  let elections: { id: string; title: string; status: string }[] = [];
  let electionsError: string | null = null;
  try {
    await synchronizeElectionStatuses();
    elections = await prisma.election.findMany({
      where: { status: { in: ["DRAFT", "SCHEDULED", "PUBLISHED"] } },
      orderBy: [{ startsAt: "asc" }, { title: "asc" }],
      select: { id: true, title: true, status: true },
    });
  } catch (error) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error &&
      typeof error.code === "string" ? error.code : "UNKNOWN";
    console.error("Could not load elections for eligibility import.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode,
    });
    electionsError = "Election options are unavailable because the database could not be reached.";
  }

  return (
    <AdminEligibilityImport elections={elections} electionsError={electionsError} />
  );
}

export default function AdminEligibilityPage() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-9">
      <div className="mb-6">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
          Voter management
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
          Eligibility &amp; imports
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Import an election roster. Only matched, eligible voter records can be used by a future election sign-in and voting workflow.
        </p>
      </div>
      <Suspense fallback={<div className="rounded-xl border border-slate-200/80 bg-white px-5 py-8 text-sm text-slate-500">Loading eligibility imports…</div>}>
        <EligibilityData />
      </Suspense>
    </main>
  );
}