"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  ChartNoAxesCombined,
  FileSpreadsheet,
  LayoutDashboard,
  ShieldCheck,
  UserCog,
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
  adminName,
  children,
}: {
  adminName: string;
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
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[264px] flex-col border-r border-slate-200/80 bg-white lg:flex">
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

        <nav aria-label="Administrator navigation" className="flex-1 overflow-y-auto px-3 py-5">
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

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl border border-emerald-900/10 bg-emerald-50/60 p-3.5">
            <div className="flex items-center gap-2 text-slate-800">
              <ShieldCheck className="size-4 text-emerald-700" />
              <p className="text-[11px] font-semibold">Privacy is foundational</p>
            </div>
            <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
              Ballot secrecy needs independent protocol review before elections can run.
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-[66px] max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white lg:hidden">
                <BrandLogo className="size-full object-contain" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  System administration
                </p>
                <p className="hidden text-[11px] text-slate-500 sm:block">
                  Central system control
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled
                aria-label="Notifications unavailable during setup"
                className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 disabled:cursor-not-allowed"
              >
                <Bell className="size-4" />
              </button>
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 sm:flex">
                <span className="flex size-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                  <UserCog className="size-3.5" />
                </span>
                <span className="max-w-36 truncate text-[10px] font-medium text-slate-500">{adminName}</span>
              </div>
              <form action={signOutAdmin}>
                <button className="h-9 rounded-lg border border-slate-200 px-3 text-[10px] font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <nav aria-label="Administrator mobile navigation" className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden">
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
        </header>
        {children}
      </div>
    </div>
  );
}
