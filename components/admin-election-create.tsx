"use client";

import { useActionState, useState } from "react";
import { CalendarPlus2 } from "lucide-react";
import { createElection } from "@/app/admin/elections/actions";
import { ELECTION_TIMEZONE } from "@/lib/election-timezone";
import NominationPositionPicker from "@/components/nomination-position-picker";

const initialState = { error: null, success: null };

export default function AdminElectionCreate() {
  const [state, action, pending] = useActionState(createElection, initialState);
  const [startsAt, setStartsAt] = useState("");
  const [positions, setPositions] = useState<string[]>([]);
  const [submitIntent, setSubmitIntent] = useState<"publish-positions" | "schedule-vote">("schedule-vote");

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
          <h2 className="text-sm font-semibold text-slate-900">Set up the next vote</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            All positions in a voting cycle share one opening and closing time. Publish positions first and set the shared schedule later, or set both up now. Previous voting cycles remain in the schedule history.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-700">
          Voting opens
          <input
            type="datetime-local"
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            name="startsAt"
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
            min={startsAt || undefined}
            aria-describedby="election-schedule-help"
          />
        </label>
        <div className="text-xs font-medium text-slate-700 sm:col-span-2">
          Voting time zone
          <p id="election-schedule-help" className="mt-1.5 text-xs font-normal text-slate-600">
            {ELECTION_TIMEZONE}. These opening and closing times apply to every position in this voting cycle.
          </p>
        </div>
        <div className="text-xs font-medium text-slate-700 sm:col-span-2">
          <label htmlFor="custom-position-create-election">Nomination positions</label>
          <p id="voting-positions-help" className="mt-1.5 text-[11px] leading-4 font-normal text-slate-500">
            Select one or more positions. Candidates can select these positions on the nomination form after they are published.
          </p>
          <div className="mt-2">
            <NominationPositionPicker
              id="create-election"
              positions={positions}
              onChange={setPositions}
            />
          </div>
        </div>
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

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          name="intent"
          value="publish-positions"
          disabled={pending}
          onClick={() => setSubmitIntent("publish-positions")}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-800/20 bg-white px-4 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {pending && submitIntent === "publish-positions" ? "Publishing…" : "Publish positions"}
        </button>
        <button
          type="submit"
          name="intent"
          value="schedule-vote"
          disabled={pending}
          onClick={() => setSubmitIntent("schedule-vote")}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-900 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          <CalendarPlus2 className="size-4" />
          {pending && submitIntent === "schedule-vote" ? "Scheduling…" : "Schedule vote"}
        </button>
      </div>
      <input type="hidden" name="timezone" value={ELECTION_TIMEZONE} />
    </form>
  );
}
