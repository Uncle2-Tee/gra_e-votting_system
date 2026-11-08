"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteElection,
  type DeleteElectionState,
} from "@/app/admin/elections/actions";

const INITIAL_STATE: DeleteElectionState = { error: null, success: null };

export default function AdminElectionDeleteButton({
  electionId,
  title,
}: {
  electionId: string;
  title: string;
}) {
  const [state, action, pending] = useActionState(
    deleteElection.bind(null, electionId),
    INITIAL_STATE,
  );

  return (
    <form
      action={action}
      className="flex flex-col items-end gap-1"
      onSubmit={(event) => {
        if (!window.confirm(`Permanently delete “${title}” and all election records, including any ballots and results? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        aria-label={`Delete ${title}`}
        title="Delete election"
        disabled={pending}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60"
      >
        <Trash2 className="size-4" />
      </button>
      {state.error ? (
        <p role="alert" className="max-w-48 text-right text-[10px] leading-4 text-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
