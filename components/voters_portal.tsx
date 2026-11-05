import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  Fingerprint,
  LayoutDashboard,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import BrandLogo from "@/components/brand-logo";
import NominationApplicationForm from "@/components/nomination-application-form";
import type { VoterPortalData } from "@/lib/nomination-types";

type PortalSection = "overview" | "nominees" | "nominate";

const navigation = [
  { section: "overview", label: "Overview", href: "/vote", icon: LayoutDashboard },
  { section: "nominees", label: "Approved nominees", href: "/vote/nominees", icon: BadgeCheck },
  { section: "nominate", label: "Nomination form", href: "/vote/nominate", icon: FilePlus2 },
] as const;

function PageHeading({
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
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[30px]">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function NomineeCards({ data }: { data: VoterPortalData }) {
  if (data.nominees.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
          <UsersRound className="size-5" />
        </span>
        <h2 className="mt-3 text-sm font-semibold text-slate-800">
          No approved nominees to display yet
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500">
          When an administrator approves a nomination, the nominee profile will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {data.nominees.map((nominee) => (
        <article
          key={nominee.id}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/[0.04]"
        >
          <div className="flex items-start justify-between gap-4">
            {nominee.photoUrl ? (
              <Image
                src={nominee.photoUrl}
                alt={`${nominee.name} profile`}
                width={44}
                height={44}
                unoptimized
                className="size-11 rounded-xl object-cover"
              />
            ) : (
              <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-900">
                {nominee.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part.charAt(0).toUpperCase())
                  .join("")}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-800">
              <CheckCircle2 className="size-3" />
              Approved
            </span>
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-950">
            {nominee.name}
          </h2>
          <p className="mt-1 text-xs font-medium text-emerald-800">
            {nominee.positionTitle}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{nominee.electionTitle}</p>
          <p className="mt-4 text-xs leading-5 text-slate-600">
            {nominee.biography || "Candidate statement not provided."}
          </p>
        </article>
      ))}
    </div>
  );
}

function Overview({ data }: { data: VoterPortalData }) {
  return (
    <>
      <section className="relative overflow-hidden rounded-2xl bg-[#123b32] px-5 py-7 text-white sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-14 -top-32 size-[340px] rounded-full border border-white/[0.08]" />
        <div className="pointer-events-none absolute -bottom-40 right-40 size-[260px] rounded-full bg-emerald-300/[0.08] blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-emerald-100 uppercase">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            Your voice shapes the future
          </span>
          <h1 className="mt-5 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            Welcome to your{" "}
            <span className="text-emerald-200">election dashboard.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/75">
            Review approved candidates or submit a nomination for an available
            position. Administrators review every application before publication.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-50"
              href="/vote/nominate"
            >
              Start a nomination
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-4 text-xs font-semibold text-white transition hover:bg-white/10"
              href="/vote/nominees"
            >
              Browse approved nominees
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Election portal summary" className="mt-5 grid gap-3 sm:grid-cols-3">
        <article className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
            <ClipboardCheck className="size-[18px]" />
          </span>
          <div>
            <p className="text-xl font-semibold tracking-tight text-slate-950">{data.positions.length}</p>
            <p className="text-[11px] text-slate-500">Nomination forms available</p>
          </div>
        </article>
        <article className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
            <BadgeCheck className="size-[18px]" />
          </span>
          <div>
            <p className="text-xl font-semibold tracking-tight text-slate-950">{data.nominees.length}</p>
            <p className="text-[11px] text-slate-500">Approved nominee profiles</p>
          </div>
        </article>
        <article className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
          <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-800">
            <Fingerprint className="size-[18px]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-950">Admin reviewed</p>
            <p className="text-[11px] text-slate-500">Required before ballot listing</p>
          </div>
        </article>
      </section>

      <section className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 transition duration-200 hover:border-emerald-200 hover:shadow-md sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-700 uppercase">
                Nominee spotlight
              </p>
              <h2 className="mt-1.5 text-base font-semibold text-slate-950">
                Meet your approved nominees
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {data.nominees.length > 0
                  ? `${data.nominees.length} approved profile${data.nominees.length === 1 ? "" : "s"} available to review.`
                  : "Approved profiles will appear here after administrator review."}
              </p>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
              <UsersRound className="size-4" />
            </span>
          </div>
          {data.nominees.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {data.nominees.slice(0, 3).map((nominee) => (
                <li key={nominee.id} className="flex items-center gap-3 py-3">
                  {nominee.photoUrl ? (
                    <Image
                      src={nominee.photoUrl}
                      alt=""
                      width={36}
                      height={36}
                      unoptimized
                      className="size-9 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex size-9 items-center justify-center rounded-lg bg-slate-50 text-xs font-semibold text-slate-700">
                      {nominee.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{nominee.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{nominee.positionTitle} · {nominee.electionTitle}</p>
                  </div>
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-700" />
                </li>
              ))}
            </ul>
          ) : null}
          <Link
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
            href="/vote/nominees"
          >
            View all nominees <ArrowRight className="size-3.5" />
          </Link>
        </article>

        <aside className="rounded-2xl border border-emerald-900/10 bg-emerald-50/70 p-5 transition duration-200 hover:shadow-md sm:p-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-emerald-800 ring-1 ring-emerald-900/10">
            <ShieldCheck className="size-5" />
          </span>
          <h2 className="mt-4 text-sm font-semibold text-slate-900">A reviewed, transparent process</h2>
          <p className="mt-1.5 text-xs leading-5 text-slate-600">
            Nominees are displayed only after administrator approval. Applicants
            should expect their identity and eligibility to be verified.
          </p>
          <Link
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-900/15 bg-white px-3 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50"
            href="/vote/nominate"
          >
            Open nomination form <ArrowRight className="size-3.5" />
          </Link>
        </aside>
      </section>
    </>
  );
}

export default function VotersPortal({
  data,
  section,
}: {
  data: VoterPortalData;
  section: PortalSection;
}) {
  const activePage = navigation.find((item) => item.section === section);

  return (
    <main className="min-h-dvh bg-[#f7f8f6] text-slate-900 lg:flex">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-slate-200/80 bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:max-h-dvh">
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
            {navigation.map(({ section: itemSection, label, href, icon: Icon }) => {
              const active = section === itemSection;
              return (
                <Link
                  key={itemSection}
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

        <div className="border-t border-slate-100 p-4">
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

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
          <div className="flex h-[66px] items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white lg:hidden">
                <BrandLogo className="size-full object-contain" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {activePage?.label}
                </p>
                <p className="hidden text-[11px] text-slate-500 sm:block">
                  GRA E-Voting voter services
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-semibold text-amber-800">
              <LockKeyhole className="size-3" />
              Voting not open
            </span>
          </div>
          <nav aria-label="Voter dashboard mobile navigation" className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden">
            {navigation.map(({ section: itemSection, label, href, icon: Icon }) => {
              const active = section === itemSection;
              return (
                <Link
                  key={itemSection}
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
        </header>

        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8 sm:py-9">
          {data.databaseStatus === "unavailable" ? (
            <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-800 ring-1 ring-amber-200">
                <LockKeyhole className="size-4" />
              </span>
              <div>
                <h2 className="text-xs font-semibold text-amber-950">Election information is temporarily unavailable</h2>
                <p className="mt-1 text-xs leading-5 text-amber-900/80">
                  Nomination forms and approved profiles could not be loaded. No
                  application has been accepted and voting is not available.
                </p>
              </div>
            </div>
          ) : null}

          {section === "overview" ? (
            <>
              <div className="mb-6">
                <PageHeading
                  eyebrow="Voter services"
                  title="Election overview"
                  description="Explore candidates and nomination opportunities from your voter dashboard."
                />
              </div>
              <Overview data={data} />
            </>
          ) : null}

          {section === "nominees" ? (
            <>
              <PageHeading
                eyebrow="Candidate directory"
                title="Approved nominees"
                description="Review profiles approved by election administrators. Only approved nominees are eligible for ballot consideration."
              />
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
                <CheckCircle2 className="size-4 shrink-0" />
                Administrator approval is required before a nominee can be listed.
              </div>
              <NomineeCards data={data} />
            </>
          ) : null}

          {section === "nominate" ? (
            <>
              <PageHeading
                eyebrow="Candidate applications"
                title="Nomination form"
                description="Choose an available position, submit your candidate statement, and wait for an administrator to review your application."
              />
              <div className="mt-6">
                <NominationApplicationForm
                  positions={data.positions}
                  unavailable={data.databaseStatus === "unavailable"}
                />
              </div>
            </>
          ) : null}

          <footer className="mt-10 flex justify-end border-t border-slate-200/80 pt-5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
              <ShieldCheck className="size-3.5" />
              Privacy is a requirement
            </span>
          </footer>
        </div>
      </div>
    </main>
  );
}
