import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  FileCheck2,
  Fingerprint,
  Settings2,
  UsersRound,
  Vote,
} from "lucide-react";
import Link from "next/link";
import type { AdminOverview } from "@/lib/admin-overview";

const metrics = [
  { label: "Total elections", icon: Vote, value: "totalElections" },
  { label: "Registered voters", icon: UsersRound, value: "registeredVoters" },
  { label: "Eligible voter records", icon: Fingerprint, value: "eligibleVoters" },
  { label: "Overall participation", icon: ChartNoAxesCombined, value: "turnoutPercentage" },
] as const;

export default function AdminPortal({ overview }: { overview: AdminOverview }) {
  return (
    <main id="overview" className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-9">
      <section className="relative overflow-hidden rounded-2xl border border-emerald-800/20 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 px-5 py-6 text-white shadow-sm sm:px-8 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-24 size-72 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-12 size-48 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-100">
              <Building2 className="size-3.5" />
              GRA E-Voting Management System
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-[32px]">
              System overview
            </h1>
            <p className="mt-2 text-sm leading-6 text-emerald-50/80">
              A central view of election activity, voter records, and participation across the system.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white lg:self-auto">
            <span className={`size-2 rounded-full ${overview.databaseStatus === "connected" ? "bg-emerald-300" : "bg-amber-300"}`} />
            {overview.databaseStatus === "connected" ? "System data connected" : "System data unavailable"}
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2 border-t border-white/15 pt-5">
          <Link
            href="/admin/elections"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-50"
          >
            <CalendarDays className="size-4" />
            Voting setup
            <ArrowUpRight className="size-3.5" />
          </Link>
          <Link
            href="/admin/nominations"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3.5 text-xs font-semibold text-white transition hover:bg-white/15"
          >
            <FileCheck2 className="size-4" />
            Nomination review
            <ArrowUpRight className="size-3.5" />
          </Link>
          <Link
            href="/admin/eligibility"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3.5 text-xs font-semibold text-white transition hover:bg-white/15"
          >
            <Settings2 className="size-4" />
            Eligibility &amp; imports
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </section>

      <section aria-label="System metrics" className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(({ label, icon: Icon, value }) => (
          <article key={label} className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 break-words text-[11px] leading-4 font-medium text-slate-500 sm:text-xs">{label}</p>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 sm:size-8">
                <Icon className="size-4" strokeWidth={1.8} />
              </span>
            </div>
            <p className="mt-4 break-words text-[26px] leading-none font-semibold tracking-tight text-slate-950 sm:mt-5">
              {overview.stats
                ? value === "turnoutPercentage"
                  ? `${overview.stats.turnoutPercentage}%`
                  : overview.stats[value]
                : value === "turnoutPercentage"
                  ? "—"
                  : "—"}
              <span className="mt-2 block break-words text-[10px] leading-4 font-normal tracking-normal text-slate-400 sm:text-[11px]">
                {value === "turnoutPercentage"
                  ? `${overview.stats?.participants ?? 0} participants across eligible election assignments`
                  : overview.databaseStatus === "connected"
                    ? "Current database total"
                    : "Unavailable while disconnected"}
              </span>
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
