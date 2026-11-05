import {
  Building2,
  ChartNoAxesCombined,
  Fingerprint,
  UsersRound,
  Vote,
} from "lucide-react";
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
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Building2 className="size-3.5" />
                GRA E-Voting Management System
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[30px]">
                System overview
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                Manage the complete election lifecycle and organization-wide system operations from one control center.
              </p>
            </div>
          </div>

          <section aria-label="System metrics" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, icon: Icon, value }) => (
              <article key={label} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                    <Icon className="size-4" strokeWidth={1.8} />
                  </span>
                </div>
                <p className={`mt-5 text-[26px] leading-none font-semibold tracking-tight ${
                  overview.stats ? "text-slate-950" : "text-red-700"
                }`}>
                  {overview.stats
                    ? value === "turnoutPercentage"
                      ? `${overview.stats.turnoutPercentage}%`
                      : overview.stats[value]
                    : "Unavailable"}
                  <span className="mt-2 block text-[11px] font-normal tracking-normal text-slate-400">
                    {value === "turnoutPercentage"
                      ? `${overview.stats?.participants ?? "—"} participants across eligible election assignments`
                      : "Current database total"}
                  </span>
                </p>
              </article>
            ))}
          </section>

    </main>
  );
}
