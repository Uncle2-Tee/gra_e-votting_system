import {
  CalendarDays,
  CircleCheck,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
  Vote,
} from "lucide-react";
import Link from "next/link";

const voterJourney = [
  {
    icon: Fingerprint,
    title: "Verify your identity",
    description:
      "Use the identity verification method registered for you by your organization.",
  },
  {
    icon: CalendarDays,
    title: "View eligible elections",
    description:
      "Only elections where you have been assigned eligibility will be available.",
  },
  {
    icon: Vote,
    title: "Review and submit your ballot",
    description:
      "Review the ballot before submission. Your selections are not shown afterward.",
  },
];

export default function VotersPortal() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <span className="text-xs font-medium text-slate-500">
            Voter Portal
          </span>
          <Link href="/" className="flex items-center gap-2.5" aria-label="GRA E-Voting home">
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-800 text-white">
              <Vote className="size-[18px]" />
            </span>
            <span className="hidden text-xs font-semibold text-slate-800 sm:inline">
              GRA E-Voting
            </span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-sm shadow-emerald-950/15">
            <UsersRound className="size-5" strokeWidth={1.8} />
          </span>
          <p className="mt-5 text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">
            Voter Portal
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Your vote. Your voice.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            A clear and private place to access elections assigned to you by
            your organization.
          </p>
        </div>

        <section
          aria-label="Voter portal readiness"
          className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 sm:flex-row sm:items-start sm:p-5"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200/80">
            <LockKeyhole className="size-[17px]" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Voter sign-in is not enabled yet
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">
              Identity verification and the election database are still being
              set up. No voter IDs, OTPs, or ballots are being processed on
              this page.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-4xl">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.15em] text-slate-400 uppercase">
              How it will work
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
              A simple, verified voting journey
            </h2>
          </div>
          <ol className="mt-5 grid gap-3 md:grid-cols-3">
            {voterJourney.map(({ icon: Icon, title, description }, index) => (
              <li
                key={title}
                className="rounded-xl border border-slate-200/80 bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="text-[11px] font-semibold tracking-wide text-slate-300">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">
                  {title}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto mt-6 flex max-w-4xl flex-col items-start justify-between gap-4 rounded-xl border border-emerald-900/10 bg-[#123b32] p-5 text-white sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-200" />
            <div>
              <h2 className="text-sm font-semibold">Your ballot is private</h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-emerald-50/75">
                The system is designed not to connect your identity with your
                selections. A reviewed anonymous-voting protocol is required
                before voting can be enabled.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-medium text-emerald-50/90">
            <CircleCheck className="size-3.5" />
            Privacy is a requirement
          </span>
        </section>

      </div>
    </main>
  );
}
