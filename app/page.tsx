import { ArrowRight, ShieldCheck, UsersRound, Vote } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const portalFeatures = [
  { icon: ShieldCheck, label: "Voter access" },
  { icon: UsersRound, label: "Candidate information" },
  { icon: Vote, label: "Election results" },
];

export default function HomePage() {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-[#061b32] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-48 top-20 size-[34rem] rounded-full bg-[#0075b8]/20 blur-3xl" />
        <div className="absolute -right-52 -top-56 size-[42rem] rounded-full border border-white/5" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <Image
          src="/gra-hotsc-splash.png"
          alt=""
          width={768}
          height={768}
          loading="eager"
          className="absolute left-1/2 top-1/2 size-[min(68vw,17rem)] -translate-x-1/2 -translate-y-1/2 rounded-full object-contain opacity-[0.07] mix-blend-screen md:hidden"
        />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-7xl flex-col px-5 sm:px-8 lg:px-12">
        <header className="relative flex items-center border-b border-white/10 py-5">
          <Link href="/" aria-label="Ghana Revenue Authority home" className="group inline-flex items-center gap-3">
            <Image
              src="/gra-hotsc-splash.png"
              alt=""
              width={768}
              height={768}
              priority
              className="size-11 shrink-0 rounded-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            />
            <span className="absolute left-[52%] top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-sm font-semibold tracking-wide md:static md:ml-0 md:translate-x-0 md:translate-y-0">
              Ghana Revenue Authority
            </span>
          </Link>
        </header>

        <div className="relative isolate grid flex-1 items-start gap-8 pt-3 pb-6 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:pt-4 md:pb-14 lg:gap-16">
          <section aria-labelledby="welcome-heading" className="relative z-10 max-w-2xl">
            <h1
              id="welcome-heading"
              className="text-5xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-7xl"
            >
              Your vote.
              <span className="mt-1 block text-yellow-300">Your voice.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-blue-100/75 sm:text-base">
              Welcome to the GRA election portal. Find the information you need,
              take part in the voting process, and stay up to date from one
              simple place.
            </p>

            <div className="mt-6 md:mt-8">
              <Link
                href="/vote/overview"
                className="group inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-yellow-300 px-5 text-sm font-semibold text-[#082c49] shadow-lg shadow-yellow-950/20 transition hover:-translate-y-0.5 hover:bg-yellow-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-200 sm:w-auto"
              >
                Enter voter portal
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <ul className="mt-8 grid grid-cols-3 gap-2 text-xs text-blue-100/70 sm:mt-10 md:mt-20 md:flex md:flex-wrap md:gap-x-6 md:gap-y-3">
              {portalFeatures.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-2 py-3 text-center text-[10px] leading-4 text-blue-100/75 md:min-h-0 md:flex-row md:gap-2 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0 md:text-left md:text-xs"
                >
                  <Icon aria-hidden="true" className="size-4 text-sky-300" />
                  {label}
                </li>
              ))}
            </ul>
          </section>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          >
            <div className="absolute right-0 top-1/2 hidden size-[min(70vh,30rem)] -translate-y-1/2 md:block lg:size-[min(76vh,34rem)] xl:size-[min(78vh,36rem)]">
              <Image
                src="/gra-hotsc-splash.png"
                alt=""
                width={768}
                height={768}
                loading="eager"
                className="absolute inset-0 size-full object-contain opacity-[0.16] mix-blend-screen"
              />
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
