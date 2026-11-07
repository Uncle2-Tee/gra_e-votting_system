"use client";

import { useActionState, useState } from "react";
import { CalendarPlus2, Plus, X } from "lucide-react";
import { createElection } from "@/app/admin/elections/actions";
import { ELECTION_TIMEZONE } from "@/lib/election-timezone";
import { NOMINATION_POSITION_OPTIONS } from "@/lib/nomination-positions";

const initialState = { error: null, success: null };

export default function AdminElectionCreate() {
  const [state, action, pending] = useActionState(createElection, initialState);
  const [startsAt, setStartsAt] = useState("");
  const [positions, setPositions] = useState<string[]>([""]);

  return (
    <form
      action={action}
      className="mb-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-950/[0.02] sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
          <CalendarPlus2 className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Create an election</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Set when voting should open and close. Import eligibility before the opening time.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-700">
          Election title
          <input
            autoComplete="off"
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            name="title"
            required
            minLength={3}
            maxLength={120}
            placeholder="e.g. 2026 Staff Association Election"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Voting opens
          <input
            type="datetime-local"
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            name="startsAt"
            required
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            aria-describedby="election-schedule-help"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Voting closes
          <input
            type="datetime-local"
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            name="endsAt"
            required
            min={startsAt || undefined}
            aria-describedby="election-schedule-help"
          />
        </label>
        <div className="text-xs font-medium text-slate-700 sm:col-span-2">
          Voting time zone
          <p id="election-schedule-help" className="mt-1.5 text-xs font-normal text-slate-600">
            {ELECTION_TIMEZONE}. Voting opens and closes at these times; exact schedule checks run whenever the system is accessed.
          </p>
        </div>
        <label className="text-xs font-medium text-slate-700 sm:col-span-2">
          Nomination positions
          <div className="mt-1.5 space-y-2">
            {positions.map((position, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  aria-label={`Nomination position ${index + 1}`}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                  name="positions"
                  required
                  value={position}
                  onChange={(event) =>
                    setPositions((current) =>
                      current.map((value, row) =>
                        row === index ? event.target.value : value,
                      ),
                    )
                  }
                >
                  <option value="" disabled>
                    Select a position
                  </option>
                  {NOMINATION_POSITION_OPTIONS.filter(
                    (option) =>
                      !positions.some(
                        (selected, row) => row !== index && selected === option,
                      ),
                  ).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {positions.length > 1 ? (
                  <button
                    type="button"
                    aria-label={`Remove position ${index + 1}`}
                    onClick={() =>
                      setPositions((current) =>
                        current.filter((_, positionIndex) => positionIndex !== index),
                      )
                    }
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
            ))}
            {positions.length < NOMINATION_POSITION_OPTIONS.length ? (
              <button
                type="button"
                onClick={() => setPositions((current) => [...current, ""])}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-800/20 px-3 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50"
              >
                <Plus className="size-3.5" />
                Add position
              </button>
            ) : null}
          </div>
        </label>
      </div>

      {state.error ? (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-800">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-900">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-900 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        <CalendarPlus2 className="size-4" />
        {pending ? "Scheduling election…" : "Schedule election"}
      </button>
      <input type="hidden" name="timezone" value={ELECTION_TIMEZONE} />
    </form>
  );
}
