export default function PageLoading({ centered = false }: { centered?: boolean }) {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={
        centered
          ? "flex min-h-dvh items-center justify-center bg-[#f6f9fc] px-4 py-8"
          : "mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 sm:py-9"
      }
    >
      <span className="sr-only">Loading page content</span>
      <div
        aria-hidden="true"
        className={`w-full motion-safe:animate-pulse ${centered ? "max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" : ""}`}
      >
        {centered ? (
          <div className="mx-auto mb-5 size-14 rounded-full bg-slate-100" />
        ) : null}
        <div className="h-7 w-48 rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 max-w-xl rounded bg-slate-100" />
        <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-28 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"
            >
              <div className="h-3 w-2/3 rounded bg-slate-100" />
              <div className="mt-5 h-7 w-1/3 rounded bg-slate-200" />
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="h-40 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm" />
          <div className="h-40 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm" />
        </div>
      </div>
    </main>
  );
}
