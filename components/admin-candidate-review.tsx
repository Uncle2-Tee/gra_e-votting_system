"use client";

import Image from "next/image";
import { useActionState } from "react";
import {
  Building2,
  BadgeCheck,
  Check,
  Clock3,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  removeApprovedCandidate,
  reviewCandidate,
} from "@/app/admin/candidates/actions";
import type {
  CandidateReviewState,
  PendingCandidate,
} from "@/lib/candidate-types";
import { getElectionDisplayTitle } from "@/lib/election-display-title";
import { getPositionColors } from "@/lib/position-colors";

const initialState: CandidateReviewState = { error: null, success: null };

function formatSubmittedAt(value: string) {
  return `${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

function CandidateCard({ application }: { application: PendingCandidate }) {
  const [state, action, pending] = useActionState(reviewCandidate, initialState);
  const positionColors = getPositionColors(application.positionTitle);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-950/[0.03] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-950/[0.06]">
      <div className="absolute inset-x-0 top-0 h-1" style={positionColors.accent} />
      <div className="p-4">
        <div className="flex min-w-0 items-center gap-3">
          {application.photoUrl ? (
            <Image
              src={application.photoUrl}
              alt={`${application.name} profile`}
              width={44}
              height={44}
              unoptimized
              className="size-11 shrink-0 rounded-xl object-cover ring-2 ring-white"
            />
          ) : (
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold ring-2 ring-white"
              style={positionColors.avatar}
            >
              {application.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="truncate text-sm font-semibold tracking-tight text-slate-950">
                {application.name}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                <Clock3 className="size-2.5" />
                Awaiting review
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Submitted {formatSubmittedAt(application.submittedAt)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium"
            style={positionColors.badge}
          >
            <UserRound className="size-3 shrink-0" />
            <span className="truncate">{application.positionTitle}</span>
          </span>
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-medium text-emerald-900">
            <Building2 className="size-3 shrink-0 text-emerald-700" />
            <span className="truncate">{application.electionTitle}</span>
          </span>
        </div>

        {application.biography ? (
          <details className="group/statement mt-3 rounded-xl border border-emerald-100/80 bg-emerald-50/40">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[10px] font-semibold text-emerald-900 [&::-webkit-details-marker]:hidden">
            <ShieldCheck className="size-3.5 text-emerald-700" />
            Candidate statement
            <span className="ml-auto text-[9px] font-medium text-emerald-700 group-open/statement:hidden">
              Read
            </span>
            <span className="ml-auto hidden text-[9px] font-medium text-emerald-700 group-open/statement:inline">
              Hide
            </span>
          </summary>
          <div className="border-t border-emerald-100/80 px-3 py-2.5">
            <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">
              {application.biography}
            </p>
          </div>
          </details>
        ) : null}

        <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1.5">
            {application.email ? (
              <a className="inline-flex min-w-0 items-center gap-1 break-all text-[10px] text-slate-500 transition hover:text-emerald-800" href={`mailto:${application.email}`}>
                <Mail className="size-3 shrink-0 text-slate-400" />
                {application.email}
              </a>
            ) : null}
            {application.phone ? (
              <a className="inline-flex min-w-0 items-center gap-1 break-all text-[10px] text-slate-500 transition hover:text-emerald-800" href={`tel:${application.phone}`}>
                <Phone className="size-3 shrink-0 text-slate-400" />
                {application.phone}
              </a>
            ) : null}
          </div>

          <form action={action} className="sm:shrink-0">
            <input type="hidden" name="candidateId" value={application.id} />
            {state.error ? (
              <p aria-live="polite" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 sm:max-w-xs" role="alert">
                {state.error}
              </p>
            ) : null}
            {state.success ? (
              <p aria-live="polite" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900 sm:max-w-xs" role="status">
                {state.success}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-800 px-3 text-[11px] font-semibold text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                disabled={pending}
                name="decision"
                type="submit"
                value="APPROVED"
              >
                <Check className="size-3.5" />
                {pending ? "Saving…" : "Approve"}
              </button>
              <button
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-[11px] font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
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
        </div>
      </div>
    </article>
  );
}

function ApprovedCandidateCard({ application }: { application: PendingCandidate }) {
  const [state, action, pending] = useActionState(
    removeApprovedCandidate,
    initialState,
  );
  const positionColors = getPositionColors(application.positionTitle);

  return (
    <article
      className="flex h-fit w-full min-w-0 items-start gap-3 rounded-xl border border-l-4 p-3.5 shadow-sm shadow-slate-950/[0.04] transition-colors hover:shadow-md"
      style={{ ...positionColors.surface, borderLeftColor: positionColors.accentColor }}
    >
      {application.photoUrl ? (
        <Image
          src={application.photoUrl}
          alt={`${application.name} profile`}
          width={44}
          height={44}
          unoptimized
          className="size-11 shrink-0 rounded-xl object-cover ring-2 ring-white"
        />
      ) : (
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
          style={positionColors.avatar}
        >
          {application.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="break-words text-sm font-semibold text-slate-900">
            {application.name}
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-800">
            <BadgeCheck className="size-3" />
            Approved
          </span>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-md border px-2 py-0.5 font-medium" style={positionColors.badge}>
            {application.positionTitle}
          </span>
          <span className="font-normal text-slate-400">·</span>
          <span className="font-normal text-slate-600">
            {getElectionDisplayTitle(application.electionTitle)}
          </span>
        </p>
        <div className="mt-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1">
          {application.email ? (
            <a className="inline-flex min-w-0 items-center gap-1 break-all text-[10px] text-slate-500 hover:text-emerald-800" href={`mailto:${application.email}`}>
              <Mail className="size-3 shrink-0 text-slate-400" />
              {application.email}
            </a>
          ) : null}
          {application.phone ? (
            <a className="inline-flex min-w-0 items-center gap-1 break-all text-[10px] text-slate-500 hover:text-emerald-800" href={`tel:${application.phone}`}>
              <Phone className="size-3 shrink-0 text-slate-400" />
              {application.phone}
            </a>
          ) : null}
        </div>
        {application.biography ? (
          <p className="mt-2 whitespace-pre-wrap border-t border-slate-100 pt-2 text-xs leading-5 text-slate-600">
            {application.biography}
          </p>
        ) : null}
        <form action={action} className="mt-3 border-t border-slate-100 pt-2">
          <input type="hidden" name="candidateId" value={application.id} />
          {state.error ? (
            <p role="alert" className="mb-2 text-[10px] leading-4 text-red-700">
              {state.error}
            </p>
          ) : null}
          <button
            type="submit"
            aria-label={`Remove ${application.name} from approved candidates`}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
          >
            <X className="size-3" />
            {pending ? "Removing…" : "Remove candidate"}
          </button>
        </form>
      </div>
    </article>
  );
}

export default function AdminCandidateReview({
  applications,
  approvedApplications,
  error,
}: {
  applications: PendingCandidate[];
  approvedApplications: PendingCandidate[];
  error: string | null;
}) {
  return (
    <section id="candidates" className="mt-8 scroll-mt-24">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
            Candidate management
          </p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">
            Candidate review
            <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 align-middle text-[10px] font-semibold text-amber-800">
              {applications.length} pending
            </span>
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            Verify each applicant’s identity and eligibility before approving
            candidates for voter-facing display.
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
            <CandidateCard key={application.id} application={application} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-9 text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
            <Check className="size-5" />
          </span>
          <h3 className="mt-3 text-xs font-semibold text-slate-800">
            No candidate applications are waiting for review
          </h3>
          <p className="mt-1.5 text-[11px] text-slate-500">
            New applications submitted from the voter portal will appear here.
          </p>
        </div>
      )}

      <section className="mt-10 border-t border-slate-200 pt-7">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
            Candidate records
          </p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">
            Approved candidates
            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-1 align-middle text-[10px] font-semibold text-emerald-800">
              {approvedApplications.length} approved
            </span>
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            Approved applications are kept here for administrator reference.
          </p>
        </div>

        {approvedApplications.length > 0 ? (
          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {approvedApplications.map((application) => (
              <ApprovedCandidateCard key={application.id} application={application} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center">
            <p className="text-xs font-medium text-slate-700">
              No applications have been approved yet.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
