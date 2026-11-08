"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  ChartNoAxesCombined,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  UsersRound,
  Vote,
  X,
} from "lucide-react";
import { signOutAdmin } from "@/app/admin/actions";
import BrandLogo from "@/components/brand-logo";
import NavigationLinkStatus from "@/components/navigation-link-status";

const navigationGroups = [
  {
    label: "Overview",
    items: [{ id: "overview", label: "System overview", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Election operations",
    items: [
      { id: "elections", label: "Voting setup", href: "/admin/elections", icon: Vote },
      { id: "nominations", label: "Nomination review", href: "/admin/nominations", icon: BadgeCheck },
      { id: "voters", label: "Voter registry", href: "/admin/voters", icon: UsersRound },
      { id: "eligibility", label: "Eligibility & imports", href: "/admin/eligibility", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Governance",
    items: [{ id: "results", label: "Results & reports", href: "/admin/results", icon: ChartNoAxesCombined }],
  },
];

function AdminSignOutButton({ compact = false }: { compact?: boolean }) {
  const { pending } = useFormStatus();

  if (compact) {
    return (
      <button
        aria-label={pending ? "Signing out" : "Sign out"}
        aria-busy={pending}
        className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        <LogOut className="size-4" />
      </button>
    );
  }

  return (
    <button
      aria-busy={pending}
      className="group flex h-10 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-600 shadow-sm shadow-slate-950/[0.02] transition-colors hover:border-rose-200 hover:bg-rose-50/70 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 active:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-colors group-hover:bg-white group-hover:text-rose-700">
        <LogOut className="size-3.5" strokeWidth={1.9} />
      </span>
      <span>{pending ? "Signing out…" : "Sign out"}</span>
    </button>
  );
}

export default function AdminDashboardShell({
  children,
  pendingNominationBadge,
}: {
  children: ReactNode;
  pendingNominationBadge: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const activePage = pathname.split("/")[2] ?? "overview";

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col overflow-hidden rounded-r-2xl border-y-2 border-r-2 border-emerald-700/50 bg-white shadow-lg shadow-emerald-950/[0.08] lg:flex">
        <Link
          href="/admin"
          className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6"
          aria-label="GRA E-Voting system overview"
        >
          <span className="flex size-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            <BrandLogo className="size-full object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold tracking-tight text-slate-950">
              GRA E-Voting
            </span>
            <span className="mt-0.5 block text-[10px] font-medium tracking-[0.12em] text-slate-500">
              ADMINISTRATION
            </span>
          </span>
        </Link>

        <nav aria-label="Administrator navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          {navigationGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="px-3 text-[9px] font-semibold tracking-[0.17em] text-slate-400 uppercase">
                {group.label}
              </p>
              <div className="mt-2 space-y-0.5">
                {group.items.map(({ id, label, href, icon: Icon }) => {
                  const active = id === activePage;
                  return (
                    <Link
                      key={id}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
                        active
                          ? "bg-emerald-50 font-semibold text-emerald-950 ring-1 ring-inset ring-emerald-700/20"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon
                        className={`size-4 ${active ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"}`}
                        strokeWidth={1.8}
                      />
                      <span>{label}</span>
                      <NavigationLinkStatus />
                      {id === "nominations" ? pendingNominationBadge : active ? (
                        <span aria-hidden="true" className="ml-auto size-2 rounded-full bg-emerald-700 ring-2 ring-emerald-200" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-100 p-4">
          <form action={signOutAdmin}>
            <AdminSignOutButton />
          </form>
        </div>
      </aside>

      <div className="lg:pl-[272px]">
        <div className="sticky top-0 z-40 box-border w-full rounded-none border-b-2 border-emerald-500 bg-white px-4 py-3 shadow-sm shadow-emerald-950/[0.08] lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <Link href="/admin" className="flex min-w-0 items-center gap-2.5" aria-label="GRA E-Voting administration">
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                <BrandLogo className="size-full object-contain" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold tracking-tight text-slate-950">GRA E-Voting</span>
                <span className="block text-[10px] font-medium tracking-wide text-slate-500">Administration</span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-1.5">
              <form action={signOutAdmin}>
                <AdminSignOutButton compact />
              </form>
              <button
                type="button"
                aria-expanded={mobileNavigationOpen}
                aria-controls="admin-mobile-navigation"
                aria-label={mobileNavigationOpen ? "Close navigation" : "Open navigation"}
                onClick={() => setMobileNavigationOpen((open) => !open)}
                className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {mobileNavigationOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
          {mobileNavigationOpen ? (
            <nav id="admin-mobile-navigation" aria-label="Administrator navigation" className="mt-3 border-t border-slate-100 pt-2">
              {navigationGroups.flatMap((group) => group.items).map(({ id, label, href, icon: Icon }) => {
                const active = id === activePage;
                return (
                  <Link
                    key={id}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileNavigationOpen(false)}
                    className={`group flex min-h-11 min-w-0 items-center gap-3 border-l-2 px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-700 ${
                      active
                        ? "border-emerald-700 bg-emerald-50/70 font-semibold text-emerald-950"
                        : "border-transparent text-slate-600 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-950 focus-visible:border-emerald-500 focus-visible:bg-emerald-50 focus-visible:text-emerald-950"
                    }`}
                  >
                    <Icon className={`size-4 shrink-0 ${active ? "text-emerald-800" : "text-slate-400 group-hover:text-emerald-700 group-focus-visible:text-emerald-700"}`} strokeWidth={1.8} />
                    <span className="min-w-0 truncate">{label}</span>
                    <NavigationLinkStatus />
                    {id === "nominations" ? pendingNominationBadge : active ? (
                      <span aria-hidden="true" className="ml-auto size-1.5 shrink-0 rounded-full bg-emerald-700" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
