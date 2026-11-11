import {
  ArrowRight,
  Award,
  BadgeCheck,
  ChartNoAxesCombined,
  CheckCircle2,
  ClipboardCheck,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import NominationApplicationForm from "@/components/nomination-application-form";
import ResultsAutoRefresh from "@/components/results-auto-refresh";
import type { VoterPortalData, VoterResultsData } from "@/lib/nomination-types";

type PortalSection = "overview" | "nominees" | "nominate" | "results";

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[30px]">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function NomineeCards({ data }: { data: VoterPortalData }) {
  if (data.nominees.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
          <UsersRound className="size-5" />
        </span>
        <h2 className="mt-3 text-sm font-semibold text-slate-800">
          No approved nominees to display yet
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500">
          When an administrator approves a nomination, the nominee profile will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.nominees.map((nominee) => (
        <article
          key={nominee.id}
          className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-950/[0.03] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/[0.06]"
        >
          <div className="h-1 bg-gradient-to-r from-emerald-700 via-teal-500 to-emerald-200" />
          <div className="p-5">
            <div className="flex min-w-0 items-center gap-4">
              {nominee.photoUrl ? (
                <Image
                  src={nominee.photoUrl}
                  alt={`${nominee.name} profile`}
                  width={72}
                  height={72}
                  unoptimized
                  className="size-[72px] shrink-0 rounded-2xl object-cover ring-4 ring-emerald-50"
                />
              ) : (
                <span className="flex size-[72px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 text-lg font-bold text-emerald-900 ring-4 ring-emerald-50">
                  {nominee.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part.charAt(0).toUpperCase())
                    .join("")}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold tracking-wide text-emerald-800 uppercase">
                  <BadgeCheck className="size-3" />
                  Approved nominee
                </span>
                <h2 className="mt-2 break-words text-base font-semibold leading-5 tracking-tight text-slate-950">
                  {nominee.name}
                </h2>
                <p className="mt-1 break-words text-xs font-medium text-emerald-800">
                  {nominee.positionTitle}
                </p>
              </div>
            </div>
            {nominee.biography ? (
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                <p className="text-[9px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                  Candidate statement
                </p>
                <p className="mt-2 break-words whitespace-pre-wrap text-xs leading-5 text-slate-600 [overflow-wrap:anywhere]">
                  {nominee.biography}
                </p>
              </div>
            ) : (
              <div className="mt-5 border-t border-slate-100 pt-3">
                <p className="text-[10px] leading-4 text-slate-400">
                  Approved profile
                </p>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function ElectionWinnersPanel({ data }: { data: VoterResultsData }) {
  if (data.databaseStatus === "unavailable") {
    return null;
  }

  const highlights = data.elections
    .filter((election) => election.status === "FINAL")
    .flatMap((election) =>
      election.positions.flatMap((position) => {
        const highestVotes = Math.max(
          0,
          ...position.candidates.map((candidate) => candidate.votes),
        );
        const leaders =
          highestVotes > 0
            ? position.candidates.filter(
                (candidate) => candidate.votes === highestVotes,
              )
            : [];

        if (leaders.length === 0) {
          return [];
        }

        return [{ election, position, leaders }];
      }),
    );

  if (highlights.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="results-highlights-heading"
      className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-5 text-white shadow-lg shadow-emerald-950/10"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-100 ring-1 ring-white/10">
          <Award className="size-5" />
        </span>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-200 uppercase">
            Results at a glance
          </p>
          <h2 id="results-highlights-heading" className="mt-1 text-lg font-semibold tracking-tight">
            Election winners
          </h2>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {highlights.map(({ election, position, leaders }) => {
          const isTie = leaders.length > 1;
          const label = isTie ? "Tied winners" : "Winner";

          return (
            <article
              key={`${election.id}:${position.id}`}
              className="min-w-0 rounded-xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[10px] font-medium text-emerald-100/75">
                  {election.title}
                </p>
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[9px] font-semibold text-emerald-50">
                  {label}
                </span>
              </div>
              <h3 className="mt-2 text-xs font-medium text-white/75">
                {position.title}
              </h3>
              <ul className="mt-3 space-y-3">
                {leaders.map((candidate) => (
                  <li key={candidate.id} className="flex min-w-0 items-center gap-3">
                    {candidate.photoUrl ? (
                      <Image
                        src={candidate.photoUrl}
                        alt={`${candidate.name} profile`}
                        width={48}
                        height={48}
                        unoptimized
                        className="size-12 shrink-0 rounded-full object-cover ring-2 ring-white/20"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900 ring-2 ring-white/20"
                      >
                        {candidate.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part.charAt(0).toUpperCase())
                          .join("")}
                      </span>
                    )}
                    <p className="min-w-0 break-words text-base font-semibold leading-6 text-white">
                      {candidate.name}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ElectionResultsPanel({
  data,
  showHeading = true,
  showHighlights = true,
}: {
  data: VoterResultsData;
  showHeading?: boolean;
  showHighlights?: boolean;
}) {
  const liveResults = data.elections.some((election) => election.status === "OPEN");
  return (
    <>
      <ResultsAutoRefresh live={liveResults} />
      {showHeading ? (
        <PageHeading
          eyebrow="Election results"
          title="Results & reports"
        />
      ) : null}
      {data.databaseStatus === "unavailable" ? (
        <div role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Election results are temporarily unavailable. Please try again later.
        </div>
      ) : data.elections.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <ChartNoAxesCombined className="size-5" />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-slate-800">
            No election results are available yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500">
            Results will appear here when an election opens and update as votes are counted. Final winners remain visible after voting closes.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {showHighlights ? <ElectionWinnersPanel data={data} /> : null}
          {data.elections.map((election) => (
            <article key={election.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-700 uppercase">
                    {election.status === "OPEN" ? "Live election results" : "Final election results"}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                    {election.title}
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {election.resultsAvailableAt ? (
                      <>
                        {election.status === "OPEN" ? "Voting opened" : "Results available"}{" "}
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: election.timezone,
                        }).format(new Date(election.resultsAvailableAt))}{" "}
                        {election.timezone}
                      </>
                    ) : "Results available"}
                  </p>
                </div>
                <div className="w-fit rounded-xl bg-slate-50 px-3 py-2 sm:text-right">
                  <p className="text-lg font-semibold text-slate-900">{election.ballotsCast}</p>
                  <p className="text-[10px] text-slate-500">Ballots cast</p>
                </div>
              </div>

              {election.positions.length > 0 ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {election.positions.map((position) => {
                    const rankedCandidates = [...position.candidates].sort(
                      (left, right) =>
                        right.votes - left.votes || left.name.localeCompare(right.name),
                    );
                    const highestVotes = Math.max(
                      0,
                      ...rankedCandidates.map((candidate) => candidate.votes),
                    );
                    const tiedLeaders =
                      highestVotes > 0 &&
                      rankedCandidates.filter((candidate) => candidate.votes === highestVotes).length > 1;
                    const leaders = rankedCandidates.filter(
                      (candidate) => highestVotes > 0 && candidate.votes === highestVotes,
                    );
                    const totalPositionVotes = rankedCandidates.reduce(
                      (total, candidate) => total + candidate.votes,
                      0,
                    );

                    return (
                      <section key={position.id} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">{position.title}</h3>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              {rankedCandidates.length} {rankedCandidates.length === 1 ? "candidate" : "candidates"} · 0.5 percentage points per vote
                            </p>
                          </div>
                          <p className="shrink-0 text-[10px] font-medium tabular-nums text-slate-500">
                            {totalPositionVotes} {totalPositionVotes === 1 ? "vote" : "votes"}
                          </p>
                        </div>
                        {election.status === "FINAL" ? (
                          <div
                            className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 ${
                              leaders.length === 1
                                ? "bg-emerald-50 text-emerald-950"
                                : "bg-amber-50 text-amber-950"
                            }`}
                          >
                            <Award className="mt-0.5 size-4 shrink-0" />
                            <p className="text-[11px] leading-5">
                              {leaders.length === 1 ? (
                                <>
                                  <span className="font-semibold">Winner declared:</span>{" "}
                                  {leaders[0].name} — {leaders[0].votes}{" "}
                                  {leaders[0].votes === 1 ? "vote" : "votes"} (
                                  {leaders[0].percentage}%).
                                </>
                              ) : leaders.length > 1 ? (
                                <>
                                  <span className="font-semibold">Tie:</span>{" "}
                                  {leaders.map((candidate) => candidate.name).join(", ")} each received{" "}
                                  {highestVotes} {highestVotes === 1 ? "vote" : "votes"} (
                                  {leaders[0].percentage}%). No sole winner is declared.
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold">No winner declared:</span>{" "}
                                  no votes were recorded for this position.
                                </>
                              )}
                            </p>
                          </div>
                        ) : leaders.length > 0 ? (
                          <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-900">
                            <span className="font-semibold">
                              {tiedLeaders ? "Current tie:" : "Currently leading:"}
                            </span>{" "}
                            {leaders.map((candidate) => candidate.name).join(", ")} —{" "}
                            {highestVotes} {highestVotes === 1 ? "vote" : "votes"} (
                            {leaders[0].percentage}%).
                          </p>
                        ) : null}
                        {rankedCandidates.length > 0 ? (
                          <ul className="mt-3 space-y-3">
                            {rankedCandidates.map((candidate, index) => (
                              <li key={candidate.id} className="min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-semibold tabular-nums text-slate-500 ring-1 ring-slate-200">
                                      {index + 1}
                                    </span>
                                    {candidate.photoUrl ? (
                                      <Image
                                        src={candidate.photoUrl}
                                        alt={`${candidate.name} profile`}
                                        width={48}
                                        height={48}
                                        unoptimized
                                        className="size-12 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                                      />
                                    ) : (
                                      <span
                                        aria-hidden="true"
                                        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900 ring-2 ring-white"
                                      >
                                        {candidate.name
                                          .split(/\s+/)
                                          .slice(0, 2)
                                          .map((part) => part.charAt(0).toUpperCase())
                                          .join("")}
                                      </span>
                                    )}
                                    <div className="min-w-0">
                                      <p className="break-words text-xs font-medium text-slate-700">
                                        {candidate.name}
                                      </p>
                                      {highestVotes > 0 && candidate.votes === highestVotes ? (
                                        <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-800">
                                          {election.status === "OPEN"
                                            ? tiedLeaders ? "Currently tied" : "Currently leading"
                                            : tiedLeaders ? "Tied" : "Winner"}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-sm font-bold tabular-nums text-slate-900">
                                      {candidate.votes}
                                    </p>
                                    <p className="text-[10px] tabular-nums text-slate-500">
                                      {candidate.votes === 1 ? "vote" : "votes"} · {candidate.percentage}%
                                    </p>
                                  </div>
                                </div>
                                <div
                                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200"
                                  role="meter"
                                  aria-label={`${candidate.name} vote progress`}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={candidate.percentage}
                                >
                                  <div
                                    className="h-full rounded-full bg-emerald-600 transition-[width]"
                                    style={{ width: `${candidate.percentage}%` }}
                                  />
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-xs text-slate-500">
                            No approved candidates were included for this position.
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-xs text-slate-500">
                  No positions were recorded for this election.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function Overview({ data }: { data: VoterPortalData }) {
  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-brand-navy/20 bg-gradient-to-br from-brand-navy via-emerald-900 to-brand-blue px-5 py-7 text-white shadow-lg shadow-brand-navy/10 sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-14 -top-32 size-[340px] rounded-full border border-white/[0.08]" />
        <div className="pointer-events-none absolute -bottom-40 right-40 size-[260px] rounded-full bg-brand-blue/[0.18] blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-sky-100 uppercase">
            <span className="size-1.5 rounded-full bg-brand-blue" />
            Your voice shapes the future
          </span>
          <h1 className="mt-5 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            Welcome to your{" "}
            <span className="text-sky-200">election dashboard.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-sky-50/80">
            Review approved candidates or submit a nomination for an available
            position. Administrators review every application before publication.
          </p>
          <div className="mt-6 flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start sm:gap-3">
            <Link
              className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-center text-[11px] font-semibold text-brand-navy transition hover:bg-sky-50 sm:gap-2 sm:px-4 sm:text-xs"
              href="/vote/nominate"
            >
              <span className="sm:hidden">Start nomination</span>
              <span className="hidden sm:inline">Start a nomination</span>
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              className="inline-flex h-10 min-w-0 items-center justify-center rounded-lg border border-white/25 bg-white/[0.06] px-3 text-center text-[11px] font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.12] sm:px-4 sm:text-xs"
              href="/vote/nominees"
            >
              <span className="sm:hidden">Browse nominees</span>
              <span className="hidden sm:inline">Browse approved nominees</span>
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Election portal summary" className="mt-5 grid grid-cols-2 gap-3">
        <article className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
            <ClipboardCheck className="size-[18px]" />
          </span>
          <div>
            <p className="text-xl font-semibold tracking-tight text-slate-950">{data.positions.length}</p>
            <p className="text-[11px] text-slate-500">Nomination forms available</p>
          </div>
        </article>
        <article className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
            <BadgeCheck className="size-[18px]" />
          </span>
          <div>
            <p className="text-xl font-semibold tracking-tight text-slate-950">{data.approvedNomineesCount}</p>
            <p className="text-[11px] text-slate-500">Approved nominee profiles</p>
          </div>
        </article>
      </section>

      <section className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 transition duration-200 hover:border-emerald-200 hover:shadow-md sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-700 uppercase">
                Nominee spotlight
              </p>
              <h2 className="mt-1.5 text-base font-semibold text-slate-950">
                Meet your approved nominees
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {data.approvedNomineesCount > 0
                  ? `${data.approvedNomineesCount} approved profile${data.approvedNomineesCount === 1 ? "" : "s"} available to review.`
                  : "Approved profiles will appear here after administrator review."}
              </p>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
              <UsersRound className="size-4" />
            </span>
          </div>
          {data.nominees.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {data.nominees.slice(0, 3).map((nominee) => (
                <li key={nominee.id} className="flex items-center gap-3 py-3">
                  {nominee.photoUrl ? (
                    <Image
                      src={nominee.photoUrl}
                      alt=""
                      width={36}
                      height={36}
                      unoptimized
                      className="size-9 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex size-9 items-center justify-center rounded-lg bg-slate-50 text-xs font-semibold text-slate-700">
                      {nominee.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{nominee.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{nominee.positionTitle}</p>
                  </div>
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-700" />
                </li>
              ))}
            </ul>
          ) : null}
          <Link
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
            href="/vote/nominees"
          >
            View all nominees <ArrowRight className="size-3.5" />
          </Link>
        </article>

        <aside className="hidden h-fit self-start rounded-2xl border border-emerald-900/10 bg-emerald-50/70 p-5 transition duration-200 hover:shadow-md sm:block sm:p-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-emerald-800 ring-1 ring-emerald-900/10">
            <ShieldCheck className="size-5" />
          </span>
          <h2 className="mt-4 text-sm font-semibold text-slate-900">A reviewed, transparent process</h2>
          <p className="mt-1.5 text-xs leading-5 text-slate-600">
            Nominees are displayed only after administrator approval. Applicants
            should expect their identity and eligibility to be verified.
          </p>
          <Link
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-900/15 bg-white px-3 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50"
            href="/vote/nominate"
          >
            Open nomination form <ArrowRight className="size-3.5" />
          </Link>
        </aside>
      </section>
    </>
  );
}

export default function VotersPortal({
  data,
  results,
  section,
}: {
  data: VoterPortalData | null;
  results: VoterResultsData | null;
  section: PortalSection;
}) {
  return (
    <div
      className={`mx-auto max-w-[1500px] px-4 py-6 sm:px-8 sm:py-9 ${
        section === "nominees" || section === "results" ? "w-full" : ""
      }`}
    >
      {data?.databaseStatus === "unavailable" ? (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-800 ring-1 ring-amber-200">
            <LockKeyhole className="size-4" />
          </span>
          <div>
            <h2 className="text-xs font-semibold text-amber-950">Election information is temporarily unavailable</h2>
            <p className="mt-1 text-xs leading-5 text-amber-900/80">
              Nomination forms and approved profiles could not be loaded. No
              application has been accepted and voting is not available.
            </p>
          </div>
        </div>
      ) : null}

      {section === "overview" && data ? (
        <>
          <div className="mb-6">
            <PageHeading
              eyebrow="Voter services"
              title="Election overview"
            />
          </div>
          <Overview data={data} />
        </>
      ) : null}

      {section === "nominees" && data ? (
        <>
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <PageHeading
              eyebrow="Candidate directory"
              title="Approved nominees"
            />
            <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-2 text-xs font-medium text-emerald-900 shadow-sm">
              <BadgeCheck className="size-4 text-emerald-700" />
              {data.nominees.length} approved {data.nominees.length === 1 ? "profile" : "profiles"}
            </div>
          </div>
          <NomineeCards data={data} />
        </>
      ) : null}

      {section === "nominate" && data ? (
        <>
          <PageHeading
            eyebrow="Candidate applications"
            title="Nomination form"
          />
          <div className="mt-6">
            <NominationApplicationForm
              positions={data.positions}
              unavailable={data.databaseStatus === "unavailable"}
            />
          </div>
        </>
      ) : null}

      {section === "results" && results ? (
        <ElectionResultsPanel data={results} />
      ) : null}

    </div>
  );
}
