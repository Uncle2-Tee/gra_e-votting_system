"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { CalendarClock, Save } from "lucide-react";
import {
  updateElectionSchedule,
  type UpdateElectionScheduleState,
} from "@/app/admin/elections/actions";

const initialState: UpdateElectionScheduleState = { error: null, success: null };

function toLocalDateTime(value: string | null, timezone: string) {
  if (!value) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(
    parts.map(({ type, value: part }) => [type, part]),
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export default function AdminElectionScheduleEditor({
  election,
}: {
  election: {
    id: string;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    timezone: string;
    positions: {
      id: string;
      title: string;
      includedInElection: boolean;
    }[];
  };
}) {
  const canEdit =
    ["DRAFT", "SCHEDULED", "PUBLISHED"].includes(election.status) ||
    election.status === "OPEN" ||
    election.status === "CLOSED";
  const isOpen = election.status === "OPEN";
  const isClosed = election.status === "CLOSED";
  const initialStartsAt = toLocalDateTime(election.startsAt, election.timezone);
  const boundAction = useMemo(
    () => updateElectionSchedule.bind(null, election.id),
    [election.id],
  );
  const [state, action, pending] = useActionState(boundAction, initialState);
  const [startsAt, setStartsAt] = useState(initialStartsAt);

  if (!canEdit) {
    return null;
  }

  return (
    <details className="mt-2">
      <summary className="w-fit cursor-pointer list-none rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5" />
          {isClosed ? "Schedule election reopening" : "Edit voting time"}
        </span>
      </summary>
      <form
        action={action}
        className="mt-3 grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 sm:grid-cols-2"
      >
        {isOpen ? (
          <div className="text-xs font-medium text-slate-700">
            Voting opened
            <p className="mt-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-normal text-slate-600">
              {election.startsAt
                ? new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: election.timezone,
                  }).format(new Date(election.startsAt))
                : "Already open"}
            </p>
            <span className="mt-1 block text-[10px] font-normal text-slate-500">
              The opening time cannot be changed after voting begins.
            </span>
          </div>
        ) : (
          <label className="text-xs font-medium text-slate-700">
            Voting opens
            <input
              type="datetime-local"
              name="startsAt"
              required
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            />
          </label>
        )}
        <label className="text-xs font-medium text-slate-700">
          Voting closes
          <input
            type="datetime-local"
            name="endsAt"
            required
            min={isOpen ? undefined : startsAt || undefined}
            defaultValue={toLocalDateTime(election.endsAt, election.timezone)}
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>
        {election.status === "DRAFT" ? (
          <fieldset className="sm:col-span-2">
            <legend className="text-xs font-semibold text-slate-800">
              Positions in this election
            </legend>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              All positions are selected by default. Unchecked positions stay saved but are excluded from voter applications and voting.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {election.positions.map((position) => (
                <label
                  key={position.id}
                  className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                >
                  <input
                    type="checkbox"
                    name="positionIds"
                    value={position.id}
                    defaultChecked={position.includedInElection}
                    disabled={pending}
                    className="size-4 shrink-0 accent-emerald-700"
                  />
                  <span className="min-w-0 truncate">{position.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <p className="text-[10px] leading-4 text-slate-500 sm:col-span-2">
          Times use {election.timezone}.{" "}
          {isOpen
            ? "The schedule is shared by every position. Only the closing time can be changed while voting is open."
            : isClosed
              ? "Choose a future opening and closing time to reopen this election. Votes already recorded will be kept, and voters can only vote for positions they have not already voted in."
              : election.status === "DRAFT"
                ? "Choose one or more positions, then set the opening and closing times."
                : "Only selected positions appear in voter applications and voting. Opening must remain in the future, and closing must be later than opening."}
        </p>
        {state.error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 sm:col-span-2">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p role="status" className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-900 sm:col-span-2">
            {state.success}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
          >
            <Save className="size-3.5" />
            {pending ? "Saving schedule…" : "Save voting time"}
          </button>
        </div>
      </form>
    </details>
  );
}
