"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { CalendarPlus2 } from "lucide-react";
import { createElection } from "@/app/admin/elections/actions";
import { ELECTION_TIMEZONE } from "@/lib/election-timezone";
import CandidatePositionPicker from "@/components/candidate-position-picker";

const initialState = { error: null, success: null };
const subscribeToDeviceLocale = (onLocaleChange: () => void) => {
  window.addEventListener("languagechange", onLocaleChange);
  return () => window.removeEventListener("languagechange", onLocaleChange);
};
const getDeviceLocale = () => navigator.language;
const getServerDeviceLocale = () => "";

export default function AdminElectionCreate() {
  const [state, action, pending] = useActionState(createElection, initialState);
  const [startsAt, setStartsAt] = useState("");
  const [positions, setPositions] = useState<string[]>([]);
  const deviceLocale = useSyncExternalStore(
    subscribeToDeviceLocale,
    getDeviceLocale,
    getServerDeviceLocale,
  );
  const dateFormatExample = deviceLocale
    ? new Intl.DateTimeFormat(deviceLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(2026, 10, 10)))
    : "";
  const [submitIntent, setSubmitIntent] = useState<"publish-positions" | "schedule-vote">("schedule-vote");

  return (
    <form
      action={action}
      className="mb-6 min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-950/[0.02] sm:p-6"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
          <CalendarPlus2 className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Set up the next vote</h2>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-2 gap-2 sm:gap-4">
        <label className="min-w-0 text-[11px] font-medium text-slate-700 sm:text-xs">
          Voting opens
          <input
            type="datetime-local"
            className="mt-1.5 h-11 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 sm:px-3 sm:text-sm"
            name="startsAt"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            lang={deviceLocale || undefined}
            aria-describedby="election-date-format-help"
          />
        </label>
        <label className="min-w-0 text-[11px] font-medium text-slate-700 sm:text-xs">
          Voting closes
          <input
            type="datetime-local"
            className="mt-1.5 h-11 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 sm:px-3 sm:text-sm"
            name="endsAt"
            min={startsAt || undefined}
            lang={deviceLocale || undefined}
            aria-describedby="election-date-format-help"
          />
        </label>
        <p id="election-date-format-help" className="col-span-2 text-[11px] font-normal leading-4 text-slate-500">
          Date format follows your device settings{dateFormatExample ? ` (example: ${dateFormatExample})` : ""}.
        </p>
        <div className="col-span-2 text-xs font-medium text-slate-700">
          <label htmlFor="custom-position-create-election">Available positions</label>
          <div className="mt-2">
            <CandidatePositionPicker
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

      <div className="mt-5 flex items-center justify-between gap-2 sm:justify-start">
        <button
          type="submit"
          name="intent"
          value="publish-positions"
          disabled={pending}
          onClick={() => setSubmitIntent("publish-positions")}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-emerald-800/20 bg-white px-3 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60 sm:px-4"
        >
          {pending && submitIntent === "publish-positions" ? "Publishing…" : "Publish positions"}
        </button>
        <button
          type="submit"
          name="intent"
          value="schedule-vote"
          disabled={pending}
          onClick={() => setSubmitIntent("schedule-vote")}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-800 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-900 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 sm:px-4"
        >
          <CalendarPlus2 className="size-4" />
          {pending && submitIntent === "schedule-vote" ? "Scheduling…" : "Schedule vote"}
        </button>
      </div>
      <input type="hidden" name="timezone" value={ELECTION_TIMEZONE} />
    </form>
  );
}
