"use client";

import { useState } from "react";
import { useActionState } from "react";
import { ListPlus, Plus, Save, X } from "lucide-react";
import {
  addElectionPositions,
  type AddElectionPositionsState,
} from "@/app/admin/elections/actions";
import { NOMINATION_POSITION_OPTIONS } from "@/lib/nomination-positions";

const INITIAL_STATE: AddElectionPositionsState = { error: null, success: null };

export default function AdminElectionPositionManager({
  election,
}: {
  election: {
    id: string;
    positions: string[];
  };
}) {
  const [state, action, pending] = useActionState(
    addElectionPositions.bind(null, election.id),
    INITIAL_STATE,
  );
  const [newPositions, setNewPositions] = useState([""]);

  return (
    <details className="mt-2">
      <summary className="w-fit cursor-pointer list-none rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
        <span className="inline-flex items-center gap-1.5">
          <ListPlus className="size-3.5" />
          Manage nomination positions ({election.positions.length})
        </span>
      </summary>
      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
        <p className="text-[11px] font-semibold text-slate-700">Current positions</p>
        {election.positions.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {election.positions.map((position) => (
              <li
                key={position}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700"
              >
                {position}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[11px] text-slate-500">No positions have been added.</p>
        )}

        {NOMINATION_POSITION_OPTIONS.some(
          (option) =>
            !election.positions.some(
              (existing) => existing.toLocaleLowerCase("en") === option.toLocaleLowerCase("en"),
            ),
        ) ? (
          <form action={action} className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold text-slate-700">Add positions</p>
            {newPositions.map((position, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  aria-label={`New position ${index + 1}`}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                  name="positions"
                  required
                  value={position}
                  onChange={(event) =>
                    setNewPositions((current) =>
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
                      !election.positions.some(
                        (existing) =>
                          existing.toLocaleLowerCase("en") === option.toLocaleLowerCase("en"),
                      ) &&
                      !newPositions.some(
                        (selected, row) => row !== index && selected === option,
                      ),
                  ).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {newPositions.length > 1 ? (
                  <button
                    type="button"
                    aria-label={`Remove new position ${index + 1}`}
                    onClick={() =>
                      setNewPositions((current) =>
                        current.filter((_, row) => row !== index),
                      )
                    }
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
            {newPositions.length <
            NOMINATION_POSITION_OPTIONS.filter((option) =>
              !election.positions.some(
                (existing) =>
                  existing.toLocaleLowerCase("en") === option.toLocaleLowerCase("en"),
              ),
            ).length ? (
              <button
                type="button"
                onClick={() => setNewPositions((current) => [...current, ""])}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-800/20 bg-white px-2.5 text-[11px] font-semibold text-emerald-900 transition hover:bg-emerald-50"
              >
                <Plus className="size-3.5" />
                Add another
              </button>
            ) : null}
            {state.error ? (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
                {state.error}
              </p>
            ) : null}
            {state.success ? (
              <p role="status" className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] text-emerald-900">
                {state.success}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-800 px-3.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
            >
              <Save className="size-3.5" />
              {pending ? "Adding positions…" : "Save positions"}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-[11px] text-slate-500">
            All available nomination positions have been added to this election.
          </p>
        )}
      </div>
    </details>
  );
}
