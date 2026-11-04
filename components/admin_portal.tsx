import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileClock,
  FileSpreadsheet,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Settings2,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UsersRound,
  Vote,
} from "lucide-react";

const navigationGroups = [
  {
    label: "Overview",
    items: [{ label: "System overview", href: "#overview", icon: LayoutDashboard }],
  },
  {
    label: "Election operations",
    items: [
      { label: "Elections", href: "#elections", icon: Vote },
      { label: "Positions & candidates", href: "#candidates", icon: BadgeCheck },
      { label: "Voter registry", href: "#voters", icon: UsersRound },
      { label: "Eligibility & imports", href: "#eligibility", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Governance",
    items: [
      { label: "Results & reports", href: "#results", icon: ChartNoAxesCombined },
      { label: "Administrators", href: "#administrators", icon: UserCog },
      { label: "Audit log", href: "#audit-log", icon: FileClock },
      { label: "System settings", href: "#settings", icon: Settings2 },
    ],
  },
];

const metrics = [
  { label: "Total elections", icon: Vote },
  { label: "Registered voters", icon: UsersRound },
  { label: "Eligible voter records", icon: Fingerprint },
  { label: "Overall participation", icon: ChartNoAxesCombined },
];

const modules = [
  {
    id: "elections",
    title: "Election management",
    description: "Create elections, set schedules, control status, and manage the election lifecycle.",
    icon: Vote,
    category: "ELECTION OPERATIONS",
  },
  {
    id: "voters",
    title: "Voter registry",
    description: "Review registered voters, update records through controlled processes, and manage account status.",
    icon: UsersRound,
    category: "VOTER MANAGEMENT",
  },
  {
    id: "eligibility",
    title: "Eligibility & data imports",
    description: "Import official voter lists, review validation outcomes, and assign election-specific eligibility.",
    icon: FileSpreadsheet,
    category: "VOTER MANAGEMENT",
  },
  {
    id: "candidates",
    title: "Positions & candidates",
    description: "Configure positions, selection rules, candidate details, and election-specific nominations.",
    icon: BadgeCheck,
    category: "ELECTION OPERATIONS",
  },
  {
    id: "results",
    title: "Results & reporting",
    description: "Review closed-election results, reconcile totals, certify outcomes, and prepare reports.",
    icon: ChartNoAxesCombined,
    category: "ELECTION GOVERNANCE",
  },
  {
    id: "administrators",
    title: "Administrator access",
    description: "Manage administrator accounts, system roles, and permission assignments.",
    icon: UserCog,
    category: "SYSTEM CONTROL",
  },
  {
    id: "audit-log",
    title: "Audit & activity log",
    description: "Review traceable administrative actions and security events across the platform.",
    icon: FileClock,
    category: "SYSTEM CONTROL",
  },
  {
    id: "settings",
    title: "System configuration",
    description: "Configure organization-wide settings, integrations, and operational policies.",
    icon: SlidersHorizontal,
    category: "SYSTEM CONTROL",
  },
];

const setupChecks = [
  { label: "PostgreSQL connection", detail: "No database provider configured", icon: Database },
  { label: "Administrator authentication", detail: "Sign-in and role enforcement not enabled", icon: KeyRound },
  { label: "Voter identity verification", detail: "Verification service not configured", icon: Fingerprint },
  { label: "Anonymous ballot protocol", detail: "Independent review and integration required", icon: Shield },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
        {description}
      </p>
    </div>
  );
}

function UnavailableValue() {
  return (
    <>
      <span aria-label="Unavailable until connected">—</span>
      <span className="mt-2 block text-[11px] font-normal tracking-normal text-slate-400">
        Awaiting database connection
      </span>
    </>
  );
}

export default function AdminPortal() {
  return (
    <div className="min-h-screen bg-[#f7f8f6] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[264px] flex-col border-r border-slate-200/80 bg-white lg:flex">
        <a
          href="#overview"
          className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6"
          aria-label="GRA E-Voting system overview"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-sm shadow-emerald-950/15">
            <Vote className="size-5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold tracking-tight text-slate-950">
              GRA E-Voting
            </span>
            <span className="mt-0.5 block text-[10px] font-medium tracking-[0.12em] text-slate-500">
              ADMINISTRATION
            </span>
          </span>
        </a>

        <nav aria-label="Administrator navigation" className="flex-1 overflow-y-auto px-3 py-5">
          {navigationGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="px-3 text-[9px] font-semibold tracking-[0.17em] text-slate-400 uppercase">
                {group.label}
              </p>
              <div className="mt-2 space-y-0.5">
                {group.items.map(({ label, href, icon: Icon }, index) => {
                  const active = group.label === "Overview" && index === 0;
                  return (
                    <a
                      key={label}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
                        active
                          ? "bg-emerald-50 text-emerald-900"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon
                        className={`size-4 ${active ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"}`}
                        strokeWidth={1.8}
                      />
                      <span>{label}</span>
                      {active && <span className="ml-auto size-1.5 rounded-full bg-emerald-700" />}
                    </a>
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
            <a href="#security" className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800">
              View readiness <ArrowRight className="size-3" />
            </a>
          </div>
          <div className="mt-3 flex items-center gap-2 px-1 text-[10px] text-slate-400">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Development environment
          </div>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-[66px] max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-white lg:hidden">
                <Vote className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  System administration
                </p>
                <p className="hidden text-[11px] text-slate-500 sm:block">
                  Central control for elections, voters, and platform governance
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-800 sm:inline-flex">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Setup required
              </span>
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
                <span className="text-[10px] font-medium text-slate-500">Administrator</span>
                <ChevronDown className="size-3 text-slate-400" />
              </div>
            </div>
          </div>
          <nav aria-label="Administrator mobile navigation" className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden">
            {navigationGroups.flatMap((group) => group.items).map(({ label, href }) => (
              <a key={label} href={href} className="shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-medium text-slate-500 hover:bg-slate-50">
                {label}
              </a>
            ))}
          </nav>
        </header>

        <main id="overview" className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8 sm:py-9">
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
            <div className="flex flex-wrap gap-2">
              <a href="#elections" className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-800 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-900">
                <Vote className="size-3.5" />
                Election management
              </a>
              <a href="#eligibility" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                <UsersRound className="size-3.5" />
                Voter management
              </a>
            </div>
          </div>

          <section aria-label="System configuration status" className="mt-6 flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200/80">
                <CircleAlert className="size-[17px]" />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-900">Administrative controls are not connected</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-600 sm:text-xs">
                  This dashboard is a management interface preview. Database, authentication, and server-side permissions must be configured before it can control the system.
                </p>
              </div>
            </div>
            <a href="#security" className="inline-flex shrink-0 items-center gap-1.5 pl-12 text-[11px] font-semibold text-amber-900 hover:text-amber-950 sm:pl-0">
              Review readiness <ArrowRight className="size-3.5" />
            </a>
          </section>

          <section aria-label="System metrics" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, icon: Icon }) => (
              <article key={label} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                    <Icon className="size-4" strokeWidth={1.8} />
                  </span>
                </div>
                <p className="mt-5 text-[26px] leading-none font-semibold tracking-tight text-slate-400">
                  <UnavailableValue />
                </p>
              </article>
            ))}
          </section>

          <section id="management" className="mt-8 scroll-mt-24">
            <SectionHeading
              eyebrow="System control"
              title="Management modules"
              description="Centralized administration across the full election lifecycle."
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {modules.map(({ id, title, description, icon: Icon, category }) => (
                <a
                  key={id}
                  id={id}
                  href="#setup"
                  className="group scroll-mt-28 rounded-xl border border-slate-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-800/20 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                      <Icon className="size-[17px]" strokeWidth={1.8} />
                    </span>
                    <ArrowRight className="mt-1 size-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-700" />
                  </div>
                  <p className="mt-4 text-[9px] font-semibold tracking-[0.14em] text-slate-400 uppercase">{category}</p>
                  <h3 className="mt-1 text-xs font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 min-h-10 text-[10px] leading-4 text-slate-500">{description}</p>
                  <p className="mt-3 border-t border-slate-100 pt-2.5 text-[10px] font-medium text-amber-700">
                    Unavailable until setup is complete
                  </p>
                </a>
              ))}
            </div>
          </section>

          <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
            <section className="rounded-xl border border-slate-200/80 bg-white">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                <SectionHeading
                  eyebrow="Operations"
                  title="Election activity"
                  description="Review election status and key schedule milestones."
                />
                <CalendarDays className="mt-1 size-4 text-slate-400" />
              </div>
              <div className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                  <ClipboardList className="size-[18px]" />
                </span>
                <h3 className="mt-3 text-xs font-semibold text-slate-800">No election records available</h3>
                <p className="mt-1 max-w-sm text-[10px] leading-4 text-slate-500">
                  Election schedules and statuses will load here after the database is connected.
                </p>
              </div>
              <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:px-6">
                <p className="text-[10px] text-slate-500">No live or scheduled election data is being displayed.</p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200/80 bg-white">
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <SectionHeading
                  eyebrow="Governance"
                  title="Recent administrative activity"
                  description="A traceable view of system changes and security events."
                />
              </div>
              <div className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                  <Activity className="size-[18px]" />
                </span>
                <h3 className="mt-3 text-xs font-semibold text-slate-800">Audit log is not connected</h3>
                <p className="mt-1 max-w-xs text-[10px] leading-4 text-slate-500">
                  No activity is fabricated. Events will appear after secure storage is configured.
                </p>
              </div>
            </section>
          </div>

          <section id="security" className="mt-7 scroll-mt-24 overflow-hidden rounded-xl border border-emerald-900/10 bg-[#123b32] text-white">
            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
              <div>
                <div className="flex items-center gap-2 text-emerald-200">
                  <ShieldCheck className="size-[17px]" />
                  <p className="text-[10px] font-semibold tracking-[0.15em] uppercase">Security &amp; readiness</p>
                </div>
                <h2 className="mt-2 text-base font-semibold tracking-tight">System-wide authority requires system-wide safeguards</h2>
                <p className="mt-2 max-w-xl text-[11px] leading-5 text-emerald-50/70">
                  Administrative actions must be authenticated, permission-checked on the server, and audited. Ballot selections remain confidential from administrators.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[9px] font-medium text-emerald-50/80">
                    <Check className="size-3 text-emerald-300" /> Identity &amp; ballot models separated
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200/15 bg-amber-100/5 px-2.5 py-1.5 text-[9px] font-medium text-amber-100/90">
                    <CircleAlert className="size-3" /> Not ready for live elections
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-semibold text-white/90">Required before activation</p>
                <ul className="mt-3 space-y-3">
                  {setupChecks.map(({ label, detail, icon: Icon }) => (
                    <li key={label} className="flex items-start gap-2.5">
                      <Icon className="mt-0.5 size-3.5 shrink-0 text-emerald-200/75" />
                      <span>
                        <span className="block text-[10px] font-medium text-white/90">{label}</span>
                        <span className="mt-0.5 block text-[9px] leading-4 text-emerald-50/55">{detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <footer id="setup" className="mt-6 scroll-mt-24 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                  <Database className="size-4" />
                </span>
                <div>
                  <h2 className="text-xs font-semibold text-slate-900">Development setup</h2>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    Choose a PostgreSQL provider, configure local credentials, and apply the reviewed Prisma migration.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-medium text-slate-500">
                <span className="inline-flex items-center gap-1"><ListChecks className="size-3.5" /> Schema ready</span>
                <span className="inline-flex items-center gap-1"><LockKeyhole className="size-3.5" /> Secrets stay local</span>
                <span className="inline-flex items-center gap-1"><ClipboardCheck className="size-3.5" /> Migration pending</span>
                <span className="inline-flex items-center gap-1"><ArrowDownToLine className="size-3.5" /> No production data</span>
              </div>
            </div>
          </footer>

          <p className="py-5 text-[10px] text-slate-400">
            GRA E-Voting Management System <span className="px-1">·</span> Admin dashboard preview <span className="px-1">·</span> No production controls are active
          </p>
        </main>
      </div>
    </div>
  );
}
