"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, ShieldCheck, X } from "lucide-react";
import { importEligibleVoters } from "@/app/admin/eligibility/actions";
import type { EligibilityImportState } from "@/lib/eligibility-import-types";

type ElectionOption = {
  id: string;
  title: string;
  status: string;
};

const initialState: EligibilityImportState = { error: null, result: null };

export default function AdminEligibilityImport({
  elections,
  electionsError,
}: {
  elections: ElectionOption[];
  electionsError: string | null;
}) {
  const [state, action, pending] = useActionState(importEligibleVoters, initialState);
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <form action={action} className="rounded-xl border border-slate-200/80 bg-white p-5 transition duration-200 hover:border-emerald-200 hover:shadow-md sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
            <FileSpreadsheet className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Upload eligible voters</h2>
            <p className="mt-0.5 text-xs text-slate-500">Each roster applies to one election.</p>
          </div>
        </div>

        <label className="mt-6 block text-xs font-medium text-slate-700">
          Election
          <select
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            name="electionId"
            required
            defaultValue=""
            disabled={elections.length === 0 || pending}
          >
            <option value="" disabled>Select an election</option>
            {elections.map((election) => (
              <option key={election.id} value={election.id}>
                {election.title} · {election.status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-xs font-medium text-slate-700">
          Excel workbook (.xlsx)
          <input
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-emerald-800"
            name="file"
            required
            type="file"
            disabled={pending}
            onChange={(event) => setSelectedFileName(event.currentTarget.files?.[0]?.name ?? "")}
            ref={fileInputRef}
          />
          {selectedFileName && (
            <span className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <span className="min-w-0 truncate text-[11px] text-slate-700" title={selectedFileName}>
                {selectedFileName}
              </span>
              <button
                aria-label={`Remove ${selectedFileName}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                disabled={pending}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                  setSelectedFileName("");
                }}
                type="button"
              >
                <X className="size-3.5" />
                Remove file
              </button>
            </span>
          )}
          <span className="mt-1.5 block text-[11px] leading-5 text-slate-500">
            Maximum 5 MB and 5,000 voter rows. Phone values must be formatted as text to preserve leading zeroes.
          </span>
        </label>

        {electionsError ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
            {electionsError}
          </p>
        ) : elections.length === 0 ? (
          <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            <p>There are no elections available for importing eligibility. Create a draft election first.</p>
            <Link
              href="/admin/elections"
              className="mt-2 inline-flex font-semibold text-emerald-900 underline decoration-emerald-700/40 underline-offset-2 hover:text-emerald-950"
            >
              Create an election
            </Link>
          </div>
        ) : null}
        {state.error && (
          <p aria-live="polite" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
            {state.error}
          </p>
        )}
        {state.result && (
          <div aria-live="polite" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
            <p className="text-xs font-semibold text-emerald-900">Import saved</p>
            <p className="mt-1 text-xs leading-5 text-emerald-800">
              {state.result.acceptedRows} eligible · {state.result.rejectedRows} rejected · {state.result.skippedRows} skipped
            </p>
          </div>
        )}
        <button
          className="mt-5 h-10 rounded-lg bg-emerald-800 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={elections.length === 0 || pending}
          type="submit"
        >
          {pending ? "Validating and saving…" : "Import eligibility"}
        </button>
      </form>

      <aside className="rounded-xl border border-slate-200/80 bg-white p-5 transition duration-200 hover:border-emerald-200 hover:shadow-md sm:p-6">
        <div className="flex items-center gap-2 text-emerald-800">
          <ShieldCheck className="size-4" />
          <h2 className="text-sm font-semibold">Workbook requirements</h2>
        </div>
        <ul className="mt-4 space-y-3 text-xs leading-5 text-slate-600">
          <li><strong className="text-slate-800">Required columns:</strong> Name and Phone Number.</li>
          <li><strong className="text-slate-800">Optional columns:</strong> Email and Department.</li>
          <li>One worksheet only; the first row contains column headers.</li>
          <li>Repeated people in one file are skipped. Existing voters are linked to this election without duplicating their account.</li>
          <li>The upload adds or restores eligibility; it does not remove voters omitted from a later file.</li>
          <li>Personal values are encrypted before storage. Import history stores counts and row numbers, not spreadsheet values.</li>
        </ul>
        <a
          className="mt-5 inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          href="/admin/eligibility/template"
        >
          Download Excel template
        </a>
      </aside>
    </div>
  );
}