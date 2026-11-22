"use client";

import { useActionState, useState } from "react";
import { ListPlus, Save, Trash2 } from "lucide-react";
import {
  addPositionTemplates,
  removePositionTemplate,
  type PositionTemplateActionState,
} from "@/app/admin/elections/actions";
import CandidatePositionPicker from "@/components/candidate-position-picker";
import { getPositionColors } from "@/lib/position-colors";

const INITIAL_STATE: PositionTemplateActionState = { error: null, success: null };

function RemovePositionButton({
  position,
}: {
  position: { id: string; title: string };
}) {
  const [state, action, pending] = useActionState(
    removePositionTemplate.bind(null, position.id),
    INITIAL_STATE,
  );

  return (
    <form action={action} className="flex items-center gap-2">
      {state.error ? (
        <p role="alert" className="max-w-56 text-[10px] leading-4 text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="max-w-56 text-[10px] leading-4 text-emerald-800">
          {state.success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        aria-label={`Remove ${position.title} position`}
        title={`Remove ${position.title}`}
        onClick={(event) => {
          if (!window.confirm(`Remove "${position.title}" from the global position list? Existing election positions will not be changed.`)) {
            event.preventDefault();
          }
        }}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </button>
    </form>
  );
}

export default function AdminPositionManager({
  positions,
  databaseStatus,
}: {
  positions: { id: string; title: string; displayOrder: number }[];
  databaseStatus: "connected" | "unavailable";
}) {
  const [state, action, pending] = useActionState(addPositionTemplates, INITIAL_STATE);
  const [newPositions, setNewPositions] = useState<string[]>([]);

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-9">
      <div className="mb-6">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
          Election operations
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
          Positions
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Configure the positions available to the voting system. Saving positions does not create or draft an election.
        </p>
      </div>

      <section className="grid gap-5 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)]">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
              <ListPlus className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Add positions</h2>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Positions are saved globally and only become election positions when an administrator schedules an election.
              </p>
            </div>
          </div>
          {databaseStatus === "connected" ? (
            <form action={action} className="mt-5 space-y-3">
              <CandidatePositionPicker
                id="global-positions"
                positions={newPositions}
                onChange={setNewPositions}
                existingPositions={positions.map(({ title }) => title)}
              />
              {state.error ? (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
                  {state.error}
                </p>
              ) : null}
              {state.success ? (
                <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
                  {state.success}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={pending || newPositions.length === 0}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-xs font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="size-3.5" />
                {pending ? "Saving…" : "Save positions"}
              </button>
            </form>
          ) : (
            <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
              Position management is unavailable because the database is unavailable.
            </p>
          )}
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Saved positions</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {positions.length} {positions.length === 1 ? "position" : "positions"} configured
            </p>
          </div>
          {positions.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {positions.map((position) => (
                <li key={position.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span
                    className="min-w-0 break-words rounded-md border px-2.5 py-1.5 text-xs font-semibold"
                    style={getPositionColors(position.title).badge}
                  >
                    {position.title}
                  </span>
                  <RemovePositionButton position={position} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">
                {databaseStatus === "connected" ? "No positions configured" : "Positions unavailable"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {databaseStatus === "connected"
                  ? "Add positions above. This will not create an election."
                  : "Try again when the database connection is available."}
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
