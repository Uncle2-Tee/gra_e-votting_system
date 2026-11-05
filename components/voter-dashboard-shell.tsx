"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  FilePlus2,
  LayoutDashboard,
  LockKeyhole,
} from "lucide-react";
import BrandLogo from "@/components/brand-logo";

const navigation = [
  { section: "overview", label: "Overview", href: "/vote", icon: LayoutDashboard },
  { section: "nominate", label: "Nomination form", href: "/vote/nominate", icon: FilePlus2 },
  { section: "nominees", label: "Approved nominees", href: "/vote/nominees", icon: BadgeCheck },
] as const;

export default function VoterDashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const activePage = navigation.find((item) => item.href === pathname) ?? navigation[0];

  return (
    <main className="min-h-dvh bg-[#f7f8f6] text-slate-900 lg:pl-[272px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col overflow-hidden rounded-r-2xl border-y border-r border-emerald-200/80 bg-white shadow-lg shadow-emerald-950/[0.04] lg:flex lg:h-dvh lg:max-h-dvh">
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

      <div className="min-w-0">
        <nav aria-label="Voter dashboard mobile navigation" className="mx-3 my-2 flex gap-1 overflow-x-auto rounded-xl border border-emerald-200/80 bg-white p-1 shadow-sm shadow-emerald-950/[0.03] lg:hidden">
            {navigation.map(({ section, label, href, icon: Icon }) => {
              const active = activePage.section === section;
              return (
                <Link
                  key={section}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-medium transition ${
                    active
                      ? "bg-emerald-50 font-semibold text-emerald-950 ring-1 ring-inset ring-emerald-700/20"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                  {active ? <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-700" /> : null}
                </Link>
              );
            })}
        </nav>

        {children}
      </div>
    </main>
  );
}
