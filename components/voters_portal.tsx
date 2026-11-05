import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import NominationApplicationForm from "@/components/nomination-application-form";
import type { VoterPortalData } from "@/lib/nomination-types";

type PortalSection = "overview" | "nominees" | "nominate";

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
    <div className="mt-6 flex min-w-0 flex-wrap items-start gap-4">
      {data.nominees.map((nominee) => (
        <article
          key={nominee.id}
          className="h-fit min-w-0 w-fit max-w-full rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-950/[0.02] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-950/[0.04] sm:max-w-md"
        >
          <div className="flex min-w-0 items-start gap-3">
            {nominee.photoUrl ? (
              <Image
                src={nominee.photoUrl}
                alt={`${nominee.name} profile`}
                width={48}
                height={48}
                unoptimized
                className="size-12 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-900">
                {nominee.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part.charAt(0).toUpperCase())
                  .join("")}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-2 gap-y-1">
                <h2 className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-950">
                  {nominee.name}
                </h2>
              </div>
              <p className="mt-1 break-words text-xs font-medium text-emerald-800">
                {nominee.positionTitle}
              </p>
              <p className="break-words text-[10px] text-slate-500">
                {nominee.electionTitle}
              </p>
            </div>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-2.5">
            <p className="text-[10px] font-medium text-slate-500">
              Candidate statement
            </p>
            <p className="mt-1.5 break-words whitespace-pre-wrap text-xs leading-5 text-slate-600 [overflow-wrap:anywhere]">
              {nominee.biography || "Candidate statement not provided."}
            </p>
          </div>
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
  return (
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
  );
}
