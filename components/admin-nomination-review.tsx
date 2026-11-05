"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Check, Clock3, Mail, Phone, X } from "lucide-react";
import { reviewNomination } from "@/app/admin/nominations/actions";
import type {
  NominationReviewState,
  PendingNomination,
} from "@/lib/nomination-types";

const initialState: NominationReviewState = { error: null, success: null };

function formatSubmittedAt(value: string) {
  return `${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

function NominationCard({ application }: { application: PendingNomination }) {
  const [state, action, pending] = useActionState(reviewNomination, initialState);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/[0.03] transition duration-200 hover:border-emerald-200 hover:shadow-md">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          {application.photoUrl ? (
            <Image
              src={application.photoUrl}
              alt={`${application.name} profile`}
              width={48}
              height={48}
              unoptimized
              className="size-12 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-900">
              {application.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
            </span>
          )}
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">{application.name}</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-800">
              <Clock3 className="size-3" />
              Pending review
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-emerald-800">
            {application.positionTitle} <span className="font-normal text-slate-400">·</span>{" "}
            <span className="font-normal text-slate-600">{application.electionTitle}</span>
          </p>
          </div>
        </div>
        <p className="text-[10px] text-slate-400">
          Submitted {formatSubmittedAt(application.submittedAt)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
        {application.email ? (
          <a className="inline-flex min-w-0 items-center gap-1.5 break-all hover:text-emerald-800" href={`mailto:${application.email}`}>
            <Mail className="size-3.5 text-slate-400" />
            {application.email}
          </a>
        ) : null}
        {application.phone ? (
          <a className="inline-flex min-w-0 items-center gap-1.5 break-all hover:text-emerald-800" href={`tel:${application.phone}`}>
            <Phone className="size-3.5 text-slate-400" />
            {application.phone}
          </a>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <p className="text-[9px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
          Candidate statement
        </p>
        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">
          {application.biography || "No candidate statement was provided."}
        </p>
      </div>

      <form action={action} className="mt-4">
        <input type="hidden" name="candidateId" value={application.id} />
        <label className="block text-[11px] font-medium text-slate-700">
          Review note
          <textarea
            className="mt-1.5 min-h-16 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            name="reviewNote"
            maxLength={500}
            placeholder="Required when rejecting; optional when approving."
            disabled={pending}
          />
        </label>
        {state.error ? (
          <p aria-live="polite" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-800" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p aria-live="polite" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900" role="status">
            {state.success}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-800 px-3.5 text-xs font-semibold text-white transition hover:bg-emerald-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending}
            name="decision"
            type="submit"
            value="APPROVED"
          >
            <Check className="size-3.5" />
            {pending ? "Saving…" : "Approve nomination"}
          </button>
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending}
            name="decision"
            type="submit"
            value="REJECTED"
          >
            <X className="size-3.5" />
            Reject
          </button>
        </div>
      </form>
    </article>
  );
}

export default function AdminNominationReview({
  applications,
  error,
}: {
  applications: PendingNomination[];
  error: string | null;
}) {
  return (
    <section id="nominations" className="mt-8 scroll-mt-24">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
            Candidate management
          </p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">
            Nomination review
            <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 align-middle text-[10px] font-semibold text-amber-800">
              {applications.length} pending
            </span>
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            Verify each applicant’s identity and eligibility before approving a
            nominee for voter-facing display.
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-800">
          {error}
        </p>
      ) : applications.length > 0 ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {applications.map((application) => (
            <NominationCard key={application.id} application={application} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-9 text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
            <Check className="size-5" />
          </span>
          <h3 className="mt-3 text-xs font-semibold text-slate-800">
            No nominations are waiting for review
          </h3>
          <p className="mt-1.5 text-[11px] text-slate-500">
            New applications submitted from the voter portal will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
