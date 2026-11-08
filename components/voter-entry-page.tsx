"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound, LockKeyhole, Vote } from "lucide-react";
import { requestVoterId } from "@/app/vote/ballot-actions";
import type { VoterActionState } from "@/lib/voter-ballot-types";

type VotingElection = {
  id: string;
  title: string;
};

const initialState: VoterActionState = { error: null, message: null };

export default function VoterEntryPage({
  enabled,
  databaseAvailable,
  elections,
}: {
  enabled: boolean;
  databaseAvailable: boolean;
  elections: VotingElection[];
}) {
  const [state, requestId, pending] = useActionState(requestVoterId, initialState);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
      <header className="mb-7">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
          GRA E-Voting · Voter access
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Start voting
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Verify your voter-roster details to receive your election ID by SMS. Then enter that ID on your ballot to vote for each position.
        </p>
      </header>

      <div className="grid gap-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7">
            <ol aria-label="Voting step" className="grid grid-cols-1 gap-3">
              <li className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white">
                  1
                </span>
                <span>
                  <span className="block text-xs font-semibold text-slate-900">Get your voter ID</span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">Verify your roster details</span>
                </span>
              </li>
            </ol>
          </div>

          {!enabled ? (
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <LockKeyhole className="mt-0.5 size-5 shrink-0 text-amber-800" />
                <div>
                  <h2 className="text-sm font-semibold text-amber-950">Voting access is not enabled</h2>
                  <p className="mt-1 text-xs leading-5 text-amber-900/80">
                    Voter ID requests and ballot submission are not currently available. Please contact the election administrator for assistance.
                  </p>
                </div>
              </div>
            </div>
          ) : !databaseAvailable ? (
            <div role="alert" className="p-6 sm:p-8">
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <LockKeyhole className="mt-0.5 size-5 shrink-0 text-amber-800" />
                <div>
                  <h2 className="text-sm font-semibold text-amber-950">Voting information is temporarily unavailable</h2>
                  <p className="mt-1 text-xs leading-5 text-amber-900/80">
                    We could not load active elections. Please try again later or contact the election administrator.
                  </p>
                </div>
              </div>
            </div>
          ) : elections.length === 0 ? (
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <Vote className="mt-0.5 size-5 shrink-0 text-blue-800" />
                <div>
                  <h2 className="text-sm font-semibold text-blue-950">No election is accepting votes right now</h2>
                  <p className="mt-1 text-xs leading-5 text-blue-900/80">
                    When an election opens, it will appear here. You can review published results in the meantime.
                  </p>
                  <Link href="/vote/results" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 hover:underline">
                    View election results <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form action={requestId} className="space-y-5 p-5 sm:p-7">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Confirm your voter details</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Enter your name and phone number exactly as recorded in the eligible voter roster. Your ID is sent only to the roster phone number.
                </p>
              </div>

              <label className="block text-xs font-medium text-slate-700">
                Election
                <select
                  name="electionId"
                  required
                  defaultValue={elections[0].id}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                >
                  {elections.map((election) => (
                    <option key={election.id} value={election.id}>{election.title}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-700">
                  Full name as listed in the roster
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={150}
                    placeholder="e.g. Ama Mensah"
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-700">
                  Phone number in the roster
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    minLength={7}
                    maxLength={32}
                    placeholder="e.g. +233 24 123 4567"
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                  />
                </label>
              </div>

              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] leading-5 text-slate-600">
                If your phone number is missing or incorrect in the roster, contact the election administrator before requesting an ID.
              </p>

              {state.error ? (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-800">
                  {state.error}
                </p>
              ) : null}
              {state.message ? (
                <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-3 text-xs leading-5 text-blue-900">
                  {state.message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60"
              >
                <KeyRound className="size-4" />
                {pending ? "Verifying and sending ID…" : "Verify details and send voter ID"}
              </button>
            </form>
          )}
        </section>

      </div>
    </main>
  );
}
