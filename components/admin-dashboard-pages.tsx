import Link from "next/link";
import {
  CalendarDays,
  Check,
  ClipboardList,
  FileSpreadsheet,
  Fingerprint,
  UsersRound,
  Vote,
} from "lucide-react";
import AdminElectionCreate from "@/components/admin-election-create";
import AdminElectionDeleteButton from "@/components/admin-election-delete-button";
import AdminElectionPositionManager from "@/components/admin-election-position-manager";
import AdminElectionScheduleEditor from "@/components/admin-election-schedule-editor";
import AdminCandidateReview from "@/components/admin-candidate-review";
import type { AdminElectionSchedules, AdminOverview } from "@/lib/admin-overview";
import type { PendingCandidateData } from "@/lib/candidate-types";

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
    <div className="mb-6">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
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

function formatElectionDate(value: string | null, timezone: string) {
  if (!value) {
    return "Not scheduled";
  }

  return `${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value))} ${timezone}`;
}

function statusStyle(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-emerald-50 text-emerald-800";
    case "SCHEDULED":
      return "bg-blue-50 text-blue-700";
    case "CLOSED":
    case "RESULTS_PUBLISHED":
      return "bg-slate-100 text-slate-700";
    case "SUSPENDED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-amber-50 text-amber-800";
  }
}

export function AdminElectionsPage({
  schedules,
}: {
  schedules: AdminElectionSchedules;
}) {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-9">
      <PageHeading
        eyebrow="Election operations"
        title="Voting setup"
      />
      <AdminElectionCreate />
      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
              <Vote className="size-[17px]" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-900">Voting schedule</p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {schedules.elections.length} {schedules.elections.length === 1 ? "voting cycle" : "voting cycles"}
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600">
            <CalendarDays className="size-3.5" />
            Schedule overview
          </span>
        </div>
        {schedules.elections.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {schedules.elections.map((election) => (
              <li key={election.id} className="flex min-w-0 flex-col gap-2 px-4 py-4 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{election.title}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Opens {formatElectionDate(election.startsAt, election.timezone)}
                    {election.endsAt ? ` · Closes ${formatElectionDate(election.endsAt, election.timezone)}` : ""}
                  </p>
                  <AdminElectionPositionManager election={election} />
                  <AdminElectionScheduleEditor election={election} />
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle(election.status)}`}>
                    {election.status.replaceAll("_", " ")}
                  </span>
                  {["SCHEDULED", "CLOSED", "RESULTS_PUBLISHED", "ARCHIVED"].includes(election.status) ? (
                    <AdminElectionDeleteButton
                      electionId={election.id}
                      title={election.title}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
              <ClipboardList className="size-[18px]" />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-slate-800">
              {schedules.databaseStatus === "connected"
                ? "No elections have been created"
                : "Election data is unavailable"}
            </h2>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
              {schedules.databaseStatus === "connected"
                ? "Elections will appear here once they have been created."
                : "Election schedules and statuses could not be loaded from the database."}
            </p>
          </div>
        )}
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:px-6">
          <p className="text-[10px] text-slate-500">
            Each voting cycle has one opening and closing time shared by all its positions. Schedules are listed with the most recently updated first.
          </p>
        </div>
      </section>
    </main>
  );
}

export function AdminCandidatesPage({
  data,
}: {
  data: PendingCandidateData;
}) {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-9">
      <PageHeading
        eyebrow="Election operations"
        title="Candidate review"
      />
      <AdminCandidateReview
        applications={data.applications}
        approvedApplications={data.approvedApplications}
        error={data.error}
      />
    </main>
  );
}

export function AdminVotersPage({ overview }: { overview: AdminOverview }) {
  const metrics = [
    {
      label: "Registered voters",
      value: overview.stats?.registeredVoters,
      icon: UsersRound,
      description: "Voter accounts recorded in the system",
    },
    {
      label: "Eligible voter records",
      value: overview.stats?.eligibleVoters,
      icon: Fingerprint,
      description: "Election-specific eligible assignments",
    },
  ];

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-9">
      <PageHeading
        eyebrow="Voter management"
        title="Voter registry"
        description="Review voter registration totals and manage the shared voter registry."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map(({ label, value, icon: Icon, description }) => (
            <article key={label} className="rounded-xl border border-slate-200/80 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
              <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                <Icon className="size-[17px]" strokeWidth={1.8} />
              </span>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                {value ?? 0}
              </p>
              <h2 className="mt-1 text-xs font-semibold text-slate-800">{label}</h2>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">{description}</p>
            </article>
          ))}
        </div>
        <article className="flex flex-col items-start justify-between gap-5 rounded-xl border border-emerald-900/10 bg-emerald-50/50 p-5 sm:flex-row sm:items-center lg:flex-col lg:items-start">
          <div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-white text-emerald-800 ring-1 ring-emerald-900/10">
              <FileSpreadsheet className="size-[17px]" strokeWidth={1.8} />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-slate-900">Manage voter eligibility</h2>
            <p className="mt-1 max-w-md text-xs leading-5 text-slate-600">
              Import voter names and unique phone numbers to register eligible voters for current and future elections.
            </p>
          </div>
          <Link
            href="/admin/eligibility"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-800 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-900"
          >
            <Check className="size-3.5" />
            Manage eligibility
          </Link>
        </article>
      </div>
    </main>
  );
}
