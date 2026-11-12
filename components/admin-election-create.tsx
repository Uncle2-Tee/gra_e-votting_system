"use client";

import { useActionState, useSyncExternalStore } from "react";
import { CalendarPlus2, Plus } from "lucide-react";
import {
  addDraftElectionPosition,
  updateElectionSchedule,
  type AddDraftElectionPositionState,
  type UpdateElectionScheduleState,
} from "@/app/admin/elections/actions";
import { CANDIDATE_POSITION_OPTIONS, MAX_ELECTION_POSITIONS, MAX_POSITION_TITLE_LENGTH } from "@/lib/candidate-positions";
import { ELECTION_TIMEZONE } from "@/lib/election-timezone";
import { getPositionColors } from "@/lib/position-colors";

const initialScheduleState: UpdateElectionScheduleState = {
  error: null,
  success: null,
};
const subscribeToDeviceLocale = (onLocaleChange: () => void) => {
  window.addEventListener("languagechange", onLocaleChange);
  return () => window.removeEventListener("languagechange", onLocaleChange);
};
const getDeviceLocale = () => navigator.language;
const getServerDeviceLocale = () => "";

export default function AdminElectionCreate({
  initialDraft,
}: {
  initialDraft: {
    electionId: string;
    positions: { id: string; title: string }[];
  } | null;
}) {
  const initialPositionState: AddDraftElectionPositionState = {
    error: null,
    success: null,
    electionId: initialDraft?.electionId ?? null,
    positions: initialDraft?.positions ?? [],
  };
  const [positionState, addPosition, addingPosition] = useActionState(
    addDraftElectionPosition,
    initialPositionState,
  );
  const [scheduleState, schedule, scheduling] = useActionState(
    updateElectionSchedule.bind(null, positionState.electionId ?? ""),
    initialScheduleState,
  );
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
  const positionNames = new Set(
    positionState.positions.map(({ title }) => title.toLocaleLowerCase("en")),
  );
  const availablePositions = CANDIDATE_POSITION_OPTIONS.filter(
    (title) => !positionNames.has(title.toLocaleLowerCase("en")),
  );
  const positionsScheduled = Boolean(scheduleState.success);

  return (
    <section className="mb-6 min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-950/[0.02] sm:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
          <CalendarPlus2 className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Set up the next vote</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Add positions first. Each saved position becomes available immediately on the voter candidate application form.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="create-election-positions">
          <h3 id="create-election-positions" className="text-xs font-semibold text-slate-800">
            Available positions
          </h3>
          <form
            key={positionState.positions.length}
            action={addPosition}
            className="mt-2 space-y-2"
          >
            <input
              type="hidden"
              name="electionId"
              value={positionState.electionId ?? ""}
            />
            {availablePositions.length > 0 ? (
              <select
                aria-label="Select a standard position"
                name="standardPosition"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:bg-slate-50"
                disabled={addingPosition || positionsScheduled || positionState.positions.length >= MAX_ELECTION_POSITIONS}
              >
                <option value="">Select a position (e.g. President)</option>
                {availablePositions.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            ) : null}
            {positionState.positions.length < MAX_ELECTION_POSITIONS ? (
              <div className="flex min-w-0 items-center gap-2">
                <input
                  aria-label="New position name"
                  name="customPosition"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:bg-slate-50"
                  maxLength={MAX_POSITION_TITLE_LENGTH}
                  placeholder="Or enter a new position"
                  disabled={addingPosition || positionsScheduled}
                />
                <button
                  type="submit"
                  disabled={
                    addingPosition ||
                    positionsScheduled ||
                    positionState.positions.length >= MAX_ELECTION_POSITIONS
                  }
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-800/20 bg-white px-4 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                  {addingPosition ? "Adding…" : "Add"}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                This election has reached the {MAX_ELECTION_POSITIONS}-position limit.
              </p>
            )}
          </form>

          {positionState.error ? (
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
              {positionState.error}
            </p>
          ) : null}
          {positionState.success ? (
            <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
              {positionState.success}
            </p>
          ) : null}
          {positionState.positions.length > 0 ? (
            <ul aria-label="Saved positions" className="mt-3 flex flex-wrap gap-2">
              {positionState.positions.map((position) => (
                <li
                  key={position.id}
                  className="rounded-full border px-2.5 py-1 text-[10px] font-medium"
                  style={getPositionColors(position.title).badge}
                >
                  {position.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              No positions have been added yet.
            </p>
          )}
          {positionsScheduled ? (
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Voting is scheduled. Manage any additional position changes from this election’s schedule card.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="schedule-election-voting">
          <h3 id="schedule-election-voting" className="text-xs font-semibold text-slate-800">
            Schedule voting
          </h3>
          <form action={schedule} className="mt-2">
            <input
              type="hidden"
              name="timezone"
              value={ELECTION_TIMEZONE}
            />
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4">
              <label className="min-w-0 text-[11px] font-medium text-slate-700 sm:text-xs">
                Voting opens
                <input
                  type="datetime-local"
                  className="mt-1.5 h-11 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 sm:px-3 sm:text-sm"
                  name="startsAt"
                  required
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
                  required
                  lang={deviceLocale || undefined}
                  aria-describedby="election-date-format-help"
                />
              </label>
              <p
                id="election-date-format-help"
                className="col-span-2 text-[11px] font-normal leading-4 text-slate-500"
              >
                Date format follows your device settings{dateFormatExample ? ` (example: ${dateFormatExample})` : ""}.
              </p>
            </div>
            {scheduleState.error ? (
              <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
                {scheduleState.error}
              </p>
            ) : null}
            {scheduleState.success ? (
              <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
                {scheduleState.success}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={
                scheduling ||
                !positionState.electionId ||
                positionState.positions.length === 0
              }
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:opacity-100"
            >
              <CalendarPlus2 className="size-4" />
              {scheduling ? "Scheduling…" : "Schedule vote"}
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}
