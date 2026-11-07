"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  ChartNoAxesCombined,
  FilePlus2,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  X,
} from "lucide-react";
import BrandLogo from "@/components/brand-logo";

const navigation = [
  { section: "overview", label: "Overview", href: "/vote", icon: LayoutDashboard },
  { section: "nominate", label: "Nomination form", href: "/vote/nominate", icon: FilePlus2 },
  { section: "nominees", label: "Approved nominees", href: "/vote/nominees", icon: BadgeCheck },
  { section: "results", label: "Results", href: "/vote/results", icon: ChartNoAxesCombined },
] as const;

export default function VoterDashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const activePage = navigation.find((item) => item.href === pathname) ?? navigation[0];
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <main className="min-h-dvh bg-[#f7f8f6] text-slate-900 lg:pl-[272px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col overflow-hidden rounded-r-2xl border-y-2 border-r-2 border-emerald-700/50 bg-white shadow-lg shadow-emerald-950/[0.08] lg:flex lg:h-dvh lg:max-h-dvh">
        <Link
          href="/vote"
          className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6"
          aria-label="GRA E-Voting dashboard"
        >
          <span className="flex size-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            <BrandLogo className="size-full object-contain" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight text-slate-950">GRA E-Voting</span>
            <span className="mt-0.5 block text-[9px] font-semibold tracking-[0.14em] text-slate-500 uppercase">Voter dashboard</span>
          </span>
        </Link>

        <nav aria-label="Voter dashboard navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-6">
          <p className="px-3 text-[9px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
            Election portal
          </p>
          <div className="mt-2 space-y-1">
            {navigation.map(({ section, label, href, icon: Icon }) => {
              const active = activePage.section === section;
              return (
                <Link
                  key={section}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                    active
                      ? "bg-emerald-50 font-semibold text-emerald-950 ring-1 ring-inset ring-emerald-700/20"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon className={`size-4 ${active ? "text-emerald-800" : "text-slate-400 group-hover:text-slate-600"}`} strokeWidth={1.8} />
                  <span>{label}</span>
                  {active ? <span aria-hidden="true" className="ml-auto size-2 rounded-full bg-emerald-700 ring-2 ring-emerald-200" /> : null}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-auto shrink-0 border-t border-slate-100 p-4">
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5">
            <div className="flex items-center gap-2 text-amber-900">
              <LockKeyhole className="size-3.5" />
              <p className="text-[10px] font-semibold">Voting is not open</p>
            </div>
            <p className="mt-1.5 text-[10px] leading-4 text-amber-900/75">
              Secure voter verification and ballot privacy review are still required.
            </p>
          </div>
          <p className="mt-4 px-1 text-[9px] text-slate-400">GRA E-Voting · Voter services</p>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <div className="sticky top-0 z-40 box-border w-full rounded-none border-b-2 border-emerald-500 bg-white px-4 py-3 shadow-sm shadow-emerald-950/[0.08] lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/vote" className="flex min-w-0 items-center gap-2.5" aria-label="GRA E-Voting voter dashboard">
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                <BrandLogo className="size-full object-contain" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold tracking-tight text-slate-950">GRA E-Voting</span>
                <span className="block text-[10px] font-medium tracking-wide text-slate-500">Voter portal</span>
              </span>
            </Link>
            <button
              type="button"
              aria-expanded={mobileNavigationOpen}
              aria-controls="voter-mobile-navigation"
              aria-label={mobileNavigationOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMobileNavigationOpen((open) => !open)}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {mobileNavigationOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
          {mobileNavigationOpen ? (
            <nav id="voter-mobile-navigation" aria-label="Voter dashboard navigation" className="mt-3 border-t border-slate-100 pt-2">
              {navigation.map(({ section, label, href, icon: Icon }) => {
                const active = activePage.section === section;
                return (
                  <Link
                    key={section}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileNavigationOpen(false)}
                    className={`group flex min-h-11 min-w-0 items-center gap-3 border-l-2 px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-700 ${
                      active
                        ? "border-emerald-700 bg-emerald-50/70 font-semibold text-emerald-950"
                        : "border-transparent text-slate-600 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-950 focus-visible:border-emerald-500 focus-visible:bg-emerald-50 focus-visible:text-emerald-950"
                    }`}
                  >
                    <Icon className={`size-4 shrink-0 ${active ? "text-emerald-800" : "text-slate-400 group-hover:text-emerald-700 group-focus-visible:text-emerald-700"}`} />
                    <span className="min-w-0 truncate">{label}</span>
                    {active ? <span aria-hidden="true" className="ml-auto size-1.5 shrink-0 rounded-full bg-emerald-700" /> : null}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>

        {children}

        <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-5 sm:px-8">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">GRA-HOTSC</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Election services</p>
            </div>
            <p className="text-[10px] font-medium text-slate-500 sm:text-right">
              Ghana Revenue Authority · Voter services portal
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
