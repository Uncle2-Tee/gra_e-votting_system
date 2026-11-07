"use client";

import { useActionState, useRef, useState } from "react";
import { FileSpreadsheet, ShieldCheck, X } from "lucide-react";
import { importEligibleVoters } from "@/app/admin/eligibility/actions";
import type { EligibilityImportState } from "@/lib/eligibility-import-types";

const initialState: EligibilityImportState = { error: null, result: null };

export default function AdminEligibilityImport() {
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
            <h2 className="text-sm font-semibold text-slate-900">Import voter registry</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Registered voters are eligible for every current and future election.
            </p>
          </div>
        </div>

        <label className="mt-6 block text-xs font-medium text-slate-700">
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

        {state.error && (
          <p aria-live="polite" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
            {state.error}
          </p>
        )}
        {state.result && (
          <div aria-live="polite" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
            <p className="text-xs font-semibold text-emerald-900">Import saved</p>
            <p className="mt-1 text-xs leading-5 text-emerald-800">
              {state.result.acceptedRows} registered · {state.result.electionsUpdated} current elections updated · {state.result.rejectedRows} rejected · {state.result.skippedRows} skipped
            </p>
          </div>
        )}
        <button
          className="mt-5 h-10 rounded-lg bg-emerald-800 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Validating and saving…" : "Import voter roster"}
        </button>
      </form>

      <aside className="rounded-xl border border-slate-200/80 bg-white p-5 transition duration-200 hover:border-emerald-200 hover:shadow-md sm:p-6">
        <div className="flex items-center gap-2 text-emerald-800">
          <ShieldCheck className="size-4" />
          <h2 className="text-sm font-semibold">Workbook requirements</h2>
        </div>
        <ul className="mt-4 space-y-3 text-xs leading-5 text-slate-600">
          <li><strong className="text-slate-800">Required columns:</strong> Name, Department, and Phone Number.</li>
          <li>One worksheet only; the first row contains column headers.</li>
          <li>Repeated people in one file are skipped. Existing voter accounts are matched without duplication.</li>
          <li>Voters are eligible for current open or upcoming elections and all elections created in the future. Closed elections are unchanged.</li>
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