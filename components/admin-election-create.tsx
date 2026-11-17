"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { CalendarPlus2, ChevronDown } from "lucide-react";
import {
  scheduleNewElection,
  type UpdateElectionScheduleState,
} from "@/app/admin/elections/actions";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  initialPositionTemplates,
}: {
  initialPositionTemplates: {
    id: string;
    title: string;
    displayOrder: number;
  }[];
}) {
  const [scheduleState, schedule, scheduling] = useActionState(
    scheduleNewElection,
    initialScheduleState,
  );
  const [selectedPositionIds, setSelectedPositionIds] = useState(
    () =>
      initialPositionTemplates
        .map(({ id }) => id),
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
  const positionsScheduled = Boolean(scheduleState.success);
  const selectedPositionTitles = initialPositionTemplates
    .filter(({ id }) => selectedPositionIds.includes(id))
    .map(({ title }) => title);

  return (
    <section className="mb-6 min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-950/[0.02] sm:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
          <CalendarPlus2 className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 sm:text-sm">Set up the next vote</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Choose the saved positions for this election. No election is created until you schedule it.
          </p>
        </div>
      </div>

      <form
        id="election-schedule-form"
        action={schedule}
        className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      >
        <section aria-labelledby="create-election-positions" className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="create-election-positions" className="text-xs font-semibold text-slate-800">
                Choose positions
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                All saved positions start selected. Uncheck any you don’t want.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-800">
              {selectedPositionIds.length} selected
            </span>
          </div>

          {initialPositionTemplates.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={positionsScheduled || scheduling}
                className="mt-3 flex h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs outline-none transition hover:border-emerald-300 focus-visible:border-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-700/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
              >
                <span className="min-w-0 truncate">
                  {selectedPositionTitles.length > 0
                    ? selectedPositionTitles.join(", ")
                    : "Choose positions"}
                </span>
                <ChevronDown className="size-4 shrink-0 text-slate-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-64 w-(--anchor-width) overflow-y-auto"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Available positions</DropdownMenuLabel>
                  {initialPositionTemplates.map((position) => {
                    const selected = selectedPositionIds.includes(position.id);
                    return (
                      <DropdownMenuCheckboxItem
                        key={position.id}
                        checked={selected}
                        disabled={positionsScheduled || scheduling}
                        onCheckedChange={(checked) => {
                          setSelectedPositionIds((current) => {
                            if (!checked) {
                              return current.filter((id) => id !== position.id);
                            }
                            if (current.includes(position.id)) {
                              return current;
                            }
                            return [...current, position.id];
                          });
                        }}
                        className="py-2 text-xs"
                      >
                        {position.title}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
              {selectedPositionIds.map((id) => (
                <input
                  key={id}
                  type="hidden"
                  name="positionTemplateIds"
                  value={id}
                />
              ))}
            </DropdownMenu>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-xs leading-5 text-slate-600">
              Position options appear here after they have been configured on an election.
            </p>
          )}
        </section>

        <section
          aria-labelledby="schedule-election-voting"
          className="min-w-0 border-t border-slate-100 pt-5 lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0"
        >
          <h3 id="schedule-election-voting" className="text-xs font-semibold text-slate-800">
            Election schedule
          </h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            The election is created when you schedule it.
          </p>
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <label className="min-w-0 text-[11px] font-medium text-slate-700 sm:text-xs">
              Voting opens
              <input
                type="datetime-local"
                className="mt-1.5 h-11 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 sm:px-3 sm:text-sm"
                name="startsAt"
                required
                disabled={positionsScheduled || scheduling}
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
                disabled={positionsScheduled || scheduling}
                lang={deviceLocale || undefined}
                aria-describedby="election-date-format-help"
              />
            </label>
            <p
              id="election-date-format-help"
              className="text-[11px] font-normal leading-4 text-slate-500 sm:col-span-2"
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
              positionsScheduled ||
              selectedPositionIds.length === 0
            }
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:opacity-100 sm:w-auto"
          >
            <CalendarPlus2 className="size-4" />
            {scheduling ? "Scheduling…" : "Schedule election"}
          </button>
        </section>
      </form>
    </section>
  );
}
