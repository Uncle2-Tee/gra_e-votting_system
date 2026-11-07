"use client";

import { useActionState } from "react";
import { Archive } from "lucide-react";
import {
  archiveElection,
  type ArchiveElectionState,
} from "@/app/admin/elections/actions";

const INITIAL_STATE: ArchiveElectionState = { error: null, success: null };

export default function AdminElectionArchiveButton({
  electionId,
  title,
}: {
  electionId: string;
  title: string;
}) {
  const [state, action, pending] = useActionState(
    archiveElection.bind(null, electionId),
    INITIAL_STATE,
  );

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        aria-label={`Archive ${title}`}
        title="Archive election"
        disabled={pending}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60"
      >
        <Archive className="size-4" />
      </button>
      {state.error ? (
        <p role="alert" className="max-w-48 text-right text-[10px] leading-4 text-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
