import { Suspense } from "react";
import {
  Activity,
  Archive,
  ChartNoAxesCombined,
  ClipboardList,
  Vote,
} from "lucide-react";
import {
  ElectionResultsPanel,
  ElectionWinnersPanel,
} from "@/components/voters_portal";
import PageLoading from "@/components/page-loading";
import { getVoterResultsData } from "@/lib/candidate-data";

async function AdminResults() {
  const results = await getVoterResultsData();
  const liveElections = results.elections.filter((election) => election.status === "OPEN");
  const finalElections = results.elections.filter((election) => election.status === "FINAL");
  const positionVotes = results.elections.reduce(
    (total, election) => total + election.ballotsCast,
    0,
  );
  const metrics = [
    {
      label: "Election cycles",
      value: results.databaseStatus === "connected" ? results.elections.length : "—",
      detail: "Live and completed",
      icon: ClipboardList,
      iconStyle: "bg-slate-50 text-slate-600",
    },
    {
      label: "Voting in progress",
      value: results.databaseStatus === "connected" ? liveElections.length : "—",
      detail: "Currently accepting votes",
      icon: Activity,
      iconStyle: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Finalized elections",
      value: results.databaseStatus === "connected" ? finalElections.length : "—",
      detail: "Results ready for review",
      icon: Archive,
      iconStyle: "bg-blue-50 text-blue-700",
    },
    {
      label: "Position votes",
      value: results.databaseStatus === "connected" ? positionVotes : "—",
      detail: "Recorded across all cycles",
      icon: Vote,
      iconStyle: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-9">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
            Governance
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[30px]">
            Results &amp; reports
          </h1>
        </div>
        {liveElections.length > 0 ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800">
            <span className="size-2 animate-pulse rounded-full bg-emerald-600" />
            Live updates every 10 seconds
          </span>
        ) : null}
      </header>

      <div className="mt-6">
        <ElectionWinnersPanel data={results} />
      </div>

      <section aria-label="Results summary" className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, iconStyle }) => (
          <article
            key={label}
            className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}>
                <Icon className="size-4" strokeWidth={1.8} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">{detail}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="election-results-heading" className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <ChartNoAxesCombined className="size-4 text-emerald-700" />
          <h2 id="election-results-heading" className="text-sm font-semibold text-slate-900">
            Election breakdown
          </h2>
        </div>
        <ElectionResultsPanel
          data={results}
          showHeading={false}
          showHighlights={false}
        />
      </section>
    </main>
  );
}

export default function AdminResultsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminResults />
    </Suspense>
  );
}
