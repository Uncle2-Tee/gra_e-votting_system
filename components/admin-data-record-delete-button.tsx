"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteAdminDataRecord,
  type AdminDataActionState,
} from "@/app/admin/data/actions";
import type { AdminDataKind } from "@/lib/admin-data-management";

const INITIAL_STATE: AdminDataActionState = { error: null, success: null };

const deletionEffects: Record<AdminDataKind, string> = {
  voters:
    "This also deletes the voter's eligibility assignments and participation markers. Anonymous ballots cannot be linked back to a voter and will remain.",
  eligibility:
    "This also deletes participation markers for this assignment. Anonymous ballots cannot be linked back to it and will remain.",
  ballots: "This also permanently deletes all selections on this anonymous ballot.",
  candidates:
    "This permanently deletes the candidate application. Candidates referenced by recorded ballots cannot be removed.",
  positions:
    "This also deletes its candidate records. Positions with recorded voting activity cannot be removed.",
  imports: "This also deletes the import batch's row records.",
};

export default function AdminDataRecordDeleteButton({
  kind,
  recordId,
  title,
}: {
  kind: AdminDataKind;
  recordId: string;
  title: string;
}) {
  const [state, action, pending] = useActionState(
    deleteAdminDataRecord,
    INITIAL_STATE,
  );

  return (
    <form
      action={action}
      className="flex flex-col items-start gap-1 sm:items-end"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Permanently delete "${title}"? ${deletionEffects[kind]} This action cannot be undone.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="recordId" value={recordId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-wait disabled:opacity-60"
      >
        <Trash2 className="size-3.5" />
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state.error ? (
        <p role="alert" className="max-w-64 text-left text-[10px] leading-4 text-rose-700 sm:text-right">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="max-w-64 text-left text-[10px] leading-4 text-emerald-800 sm:text-right">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
