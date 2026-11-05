"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  ChartNoAxesCombined,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  UsersRound,
  Vote,
} from "lucide-react";
import { signOutAdmin } from "@/app/admin/actions";
import BrandLogo from "@/components/brand-logo";

const navigationGroups = [
  {
    label: "Overview",
    items: [{ id: "overview", label: "System overview", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Election operations",
    items: [
      { id: "elections", label: "Elections", href: "/admin/elections", icon: Vote },
      { id: "nominations", label: "Nomination review", href: "/admin/nominations", icon: BadgeCheck },
      { id: "voters", label: "Voter registry", href: "/admin/voters", icon: UsersRound },
      { id: "eligibility", label: "Eligibility & imports", href: "/admin/eligibility", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Governance",
    items: [{ id: "results", label: "Results & reports", href: "/admin#results", icon: ChartNoAxesCombined }],
  },
];

export default function AdminDashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const activePage = pathname === "/admin"
    ? hash === "#results" ? "results" : "overview"
    : pathname.split("/")[2] ?? "overview";

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col overflow-hidden rounded-r-2xl border-y border-r border-emerald-200/80 bg-white shadow-lg shadow-emerald-950/[0.04] lg:flex">
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
                      {active && <span aria-hidden="true" className="ml-auto size-2 rounded-full bg-emerald-700 ring-2 ring-emerald-200" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-100 p-4">
          <form action={signOutAdmin}>
            <button
              className="group flex h-10 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-600 shadow-sm shadow-slate-950/[0.02] transition-colors hover:border-rose-200 hover:bg-rose-50/70 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 active:bg-rose-50"
              type="submit"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-colors group-hover:bg-white group-hover:text-rose-700">
                <LogOut className="size-3.5" strokeWidth={1.9} />
              </span>
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-[272px]">
        <div className="border-b border-emerald-100 bg-transparent px-3 py-2 lg:hidden">
          <div className="flex items-center gap-2">
            <nav aria-label="Administrator mobile navigation" className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl border border-emerald-200/80 bg-white p-1 shadow-sm shadow-emerald-950/[0.03]">
            {navigationGroups.flatMap((group) => group.items).map(({ id, label, href }) => {
              const active = id === activePage;
              return (
                <Link
                  key={id}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] ${
                    active
                      ? "bg-emerald-50 font-semibold text-emerald-950 ring-1 ring-inset ring-emerald-700/20"
                      : "font-medium text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {label}
                  {active && <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-700" />}
                </Link>
              );
            })}
            </nav>
            <form action={signOutAdmin} className="shrink-0 border-l border-slate-200 pl-2">
              <button className="h-9 rounded-lg px-2.5 text-[10px] font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-800 active:bg-rose-100" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
