export default function DashboardLoading() {
  return (
    <main
      role="status"
      aria-label="Loading page"
      className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 sm:py-9"
    >
      <span className="sr-only">Loading page content…</span>
      <div className="h-3 w-28 animate-pulse rounded bg-emerald-100" />
      <div className="mt-3 h-8 w-64 max-w-full animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </main>
  );
}
