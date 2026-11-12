"use client";

import { useActionState, useState } from "react";
import { ListPlus, Save, Trash2 } from "lucide-react";
import {
  addElectionPositions,
  removeElectionPosition,
  type AddElectionPositionsState,
  type RemoveElectionPositionState,
} from "@/app/admin/elections/actions";
import CandidatePositionPicker from "@/components/candidate-position-picker";
import { MAX_ELECTION_POSITIONS } from "@/lib/candidate-positions";
import { getPositionColors } from "@/lib/position-colors";

const INITIAL_STATE: AddElectionPositionsState = { error: null, success: null };
const INITIAL_REMOVE_STATE: RemoveElectionPositionState = { error: null, success: null };

function RemovePositionButton({
  electionId,
  position,
}: {
  electionId: string;
  position: { id: string; title: string };
}) {
  const [state, action, pending] = useActionState(
    removeElectionPosition.bind(null, electionId, position.id),
    INITIAL_REMOVE_STATE,
  );

  return (
    <form action={action} className="flex items-center gap-2">
      {state.error ? (
        <p role="alert" className="max-w-56 text-[10px] leading-4 text-red-700">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        aria-label={`Remove ${position.title} position`}
        title={`Remove ${position.title}`}
        onClick={(event) => {
          if (!window.confirm(`Remove "${position.title}"? Any candidate applications for this position will also be deleted. Positions with recorded votes cannot be removed.`)) {
            event.preventDefault();
          }
        }}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </button>
    </form>
  );
}

export default function AdminElectionPositionManager({
  election,
}: {
  election: {
    id: string;
    status: string;
    positions: {
      id: string;
      title: string;
      includedInElection: boolean;
    }[];
  };
}) {
  const [state, action, pending] = useActionState(
    addElectionPositions.bind(null, election.id),
    INITIAL_STATE,
  );
  const [newPositions, setNewPositions] = useState<string[]>([]);
  const canEditPositions = ["DRAFT", "SCHEDULED", "PUBLISHED"].includes(election.status);
  return (
    <details className="mt-2">
      <summary className="w-fit cursor-pointer list-none rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
        <span className="inline-flex items-center gap-1.5">
          <ListPlus className="size-3.5" />
          Manage positions for candidate applications ({election.positions.length})
        </span>
      </summary>
      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
        <p className="text-[11px] font-semibold text-slate-700">Current positions</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-500">
          Positions not selected for an election remain saved but are hidden from voter applications and voting. Deleting a position also deletes its applications.
        </p>
        {election.positions.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {election.positions.map((position) => (
              <li
                key={position.id}
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span
                    className="min-w-0 break-words rounded-md border px-2 py-1 text-[10px] font-medium"
                    style={getPositionColors(position.title).badge}
                  >
                    {position.title}
                  </span>
                  {!position.includedInElection ? (
                    <span className="text-[9px] font-medium text-slate-500">
                      Not selected
                    </span>
                  ) : null}
                </div>
                {canEditPositions ? (
                  <RemovePositionButton electionId={election.id} position={position} />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[11px] text-slate-500">No positions have been added.</p>
        )}

        {canEditPositions && election.positions.length < MAX_ELECTION_POSITIONS ? (
          <form action={action} className="mt-4 space-y-2">
            <label htmlFor={`custom-position-${election.id}`} className="text-[11px] font-semibold text-slate-700">
              Add positions
            </label>
            <CandidatePositionPicker
              id={election.id}
              positions={newPositions}
              onChange={setNewPositions}
              existingPositions={election.positions.map(({ title }) => title)}
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
        ) : canEditPositions ? (
          <p className="mt-3 text-[11px] text-slate-500">
            This election has reached the {MAX_ELECTION_POSITIONS}-position limit.
          </p>
        ) : (
          <p className="mt-3 text-[11px] text-slate-500">
            Positions cannot be changed after voting opens.
          </p>
        )}
      </div>
    </details>
  );
}
