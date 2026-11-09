"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Check, Clock3, ShieldCheck } from "lucide-react";
import { submitPositionVote } from "@/app/vote/ballot-actions";
import type { VoterActionState } from "@/lib/voter-ballot-types";

type BallotPosition = {
  id: string;
  title: string;
  candidates: { id: string; name: string }[];
};

type BallotElection = {
  id: string;
  title: string;
  endsAt: string;
  positions: BallotPosition[];
};

const initialState: VoterActionState = { error: null, message: null };

function PositionBallotCard({
  electionId,
  position,
  hasVoterSession,
  voterId,
  alreadyVoted,
}: {
  electionId: string;
  position: BallotPosition;
  hasVoterSession: boolean;
  voterId: string;
  alreadyVoted: boolean;
}) {
  const [state, submitVote, pending] = useActionState(submitPositionVote, initialState);
  const [candidateId, setCandidateId] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const selectedCandidate = position.candidates.find(
    (candidate) => candidate.id === candidateId,
  );
  const alreadySubmitted = alreadyVoted || Boolean(state.message);
  const voterIdReady = hasVoterSession || /^GRA-[A-Za-z0-9_-]{32}$/.test(voterId);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-700 uppercase">
            Position
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">{position.title}</h2>
        </div>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600">
          {position.candidates.length}{" "}
          {position.candidates.length === 1 ? "candidate" : "candidates"}
        </span>
      </div>

      <form action={submitVote} className="mt-4">
        <input type="hidden" name="electionId" value={electionId} />
        <input type="hidden" name="positionId" value={position.id} />
        {!hasVoterSession ? (
          <input type="hidden" name="voterId" value={voterId} />
        ) : null}
        <fieldset className="space-y-2.5">
          <legend className="mb-2 text-xs font-medium text-slate-700">
            Choose one candidate
          </legend>
          {alreadyVoted ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-900">
              Your vote for this position has been recorded.
            </p>
          ) : position.candidates.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">
              No approved candidates are available for this position.
            </p>
          ) : position.candidates.map((candidate) => {
            const selected = candidateId === candidate.id;
            return (
              <label
                key={candidate.id}
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                  selected
                    ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/10"
                    : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="candidateId"
                  required
                  value={candidate.id}
                  checked={selected}
                  disabled={alreadySubmitted}
                  onChange={() => {
                    setCandidateId(candidate.id);
                    setReviewing(false);
                  }}
                  className="size-4 accent-emerald-700"
                />
                <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                  {candidate.name}
                </span>
                {selected ? <BadgeCheck aria-label="Selected" className="size-4 text-emerald-700" /> : null}
              </label>
            );
          })}
        </fieldset>

        {reviewing && selectedCandidate ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-emerald-800 uppercase">
              <ShieldCheck className="size-3.5" />
              Review your choice
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{selectedCandidate.name}</p>
            <p className="mt-2 text-[11px] leading-5 text-slate-600">
              Your vote for this position cannot be changed after it is submitted.
            </p>
          </div>
        ) : null}

        {state.error ? (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.message ? (
          <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {state.message}
          </p>
        ) : null}

        <div className="mt-4">
          {!reviewing ? (
            <button
              type="button"
              onClick={() => setReviewing(true)}
              disabled={
                !candidateId ||
                !voterIdReady ||
                pending ||
                alreadySubmitted ||
                position.candidates.length === 0
              }
              className="h-10 w-full rounded-lg bg-emerald-800 px-4 text-xs font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Review selection
            </button>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setReviewing(false)}
                disabled={pending || alreadySubmitted}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Change selection
              </button>
              <button
                type="submit"
                disabled={pending || alreadySubmitted}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
              >
                {pending ? "Recording vote…" : <><Check className="size-4" /> Confirm and vote</>}
              </button>
            </div>
          )}
        </div>
      </form>
    </section>
  );
}

export default function VoterBallotPage({
  elections,
  enabled,
  initialElectionId,
  identityVerified,
  voterId: verifiedVoterId,
  hasVoterSession,
  submittedPositionIds,
}: {
  elections: BallotElection[];
  enabled: boolean;
  initialElectionId: string;
  identityVerified: boolean;
  voterId: string;
  hasVoterSession: boolean;
  submittedPositionIds: string[];
}) {
  const [voterId, setVoterId] = useState("");
  const election =
    elections.find((item) => item.id === initialElectionId) ?? elections[0];

  if (!enabled) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">Voting setup in progress</h1>
          <p className="mt-2 text-sm text-slate-600">Ballot submission is not enabled yet.</p>
        </div>
      </main>
    );
  }

  if (!election) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">Voting is not open</h1>
          <p className="mt-2 text-sm text-slate-600">There are no elections accepting ballots right now.</p>
          <Link href="/vote" className="mt-4 inline-flex text-sm font-semibold text-emerald-800 hover:underline">
            Return to voter access
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-9">
      <Link
        href="/vote"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-emerald-800"
      >
        <ArrowLeft className="size-3.5" />
        Voter access
      </Link>

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-800 uppercase">
                GRA election ballot
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
                <span className="size-1.5 rounded-full bg-emerald-600" />
                Voting open
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {election.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review each position, select one candidate, and submit your vote. You may vote once for every position.
            </p>
          </div>
          <p className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-600">
            <Clock3 className="size-3.5" />
            Closes {new Date(election.endsAt).toLocaleString("en-GH", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Africa/Accra",
            })} (Africa/Accra)
          </p>
        </div>
      </header>

      {identityVerified && hasVoterSession ? (
        <p role="status" className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-900">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          Your details are verified. Your voter ID is shown below, and your ballot is ready.
        </p>
      ) : null}

      {hasVoterSession && /^GRA-[A-Za-z0-9_-]{32}$/.test(verifiedVoterId) ? (
        <section aria-label="Your voter ID" className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-800">Your voter ID</p>
          <p className="mt-2 select-all break-all rounded-lg bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-900">
            {verifiedVoterId}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Keep this ID private. You can use it to recover ballot access if needed.
          </p>
        </section>
      ) : null}

      {!hasVoterSession ? (
        <section className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <label className="block text-xs font-semibold text-blue-950">
            Enter your voter ID to unlock ballot submission
            <input
              value={voterId}
              onChange={(event) => setVoterId(event.currentTarget.value)}
              autoComplete="off"
              maxLength={36}
              placeholder="e.g. GRA-abc123…"
              className="mt-2 h-11 w-full rounded-lg border border-blue-200 bg-white px-3 font-mono text-sm font-normal text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 sm:max-w-md"
            />
          </label>
          <p className="mt-2 text-[11px] text-blue-900">
            Need to verify your details or generate an ID? <Link href="/vote" className="font-semibold underline">Return to voter access</Link>.
          </p>
        </section>
      ) : (
        <p className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900">
          <ShieldCheck className="size-4 shrink-0" />
          Voter identity verified. Select a candidate for each position below.
        </p>
      )}

      <section aria-label="Ballot positions" className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Positions on this ballot</h2>
            <p className="mt-1 text-xs text-slate-500">
              {election.positions.length} {election.positions.length === 1 ? "position" : "positions"} · each vote is submitted separately
            </p>
          </div>
        </div>
        {election.positions.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {election.positions.map((position) => (
              <PositionBallotCard
                key={position.id}
                electionId={election.id}
                position={position}
                hasVoterSession={hasVoterSession}
                voterId={voterId}
                alreadyVoted={submittedPositionIds.includes(position.id)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            No approved candidates are available on this ballot yet.
          </p>
        )}
      </section>

      <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        Keep your voter ID private. Once a vote is submitted for a position, it cannot be changed.
      </p>
    </main>
  );
}
