"use client";

import { useActionState, useState } from "react";
import { ListPlus, Save } from "lucide-react";
import {
  addElectionPositions,
  type AddElectionPositionsState,
} from "@/app/admin/elections/actions";
import NominationPositionPicker from "@/components/nomination-position-picker";
import { MAX_ELECTION_POSITIONS } from "@/lib/nomination-positions";

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
  const [newPositions, setNewPositions] = useState<string[]>([]);
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

        {election.positions.length < MAX_ELECTION_POSITIONS ? (
          <form action={action} className="mt-4 space-y-2">
            <label htmlFor={`custom-position-${election.id}`} className="text-[11px] font-semibold text-slate-700">
              Add positions
            </label>
            <NominationPositionPicker
              id={election.id}
              positions={newPositions}
              onChange={setNewPositions}
              existingPositions={election.positions}
            />
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
            This election has reached the {MAX_ELECTION_POSITIONS}-position limit.
          </p>
        )}
      </div>
    </details>
  );
}
