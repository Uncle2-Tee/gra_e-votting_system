import { LockKeyhole, ShieldAlert } from "lucide-react";
import Link from "next/link";
import AdminPortal from "@/components/admin_portal";

export default function AdminPortalAccess() {
  if (process.env.NODE_ENV === "development") {
    return <AdminPortal />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f6] px-5 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-7 text-center shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-9">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/80">
          <ShieldAlert className="size-5" />
        </span>
        <p className="mt-5 text-xs font-semibold tracking-[0.15em] text-slate-400 uppercase">
          Restricted area
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Admin access is not enabled
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The administration portal is separate from voter access. It will
          remain unavailable until secure administrator authentication and
          server-side authorization are implemented.
        </p>
        <div className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-left">
          <LockKeyhole className="mt-0.5 size-4 shrink-0 text-slate-500" />
          <p className="text-xs leading-5 text-slate-500">
            Hiding a dashboard link is not access control. This route does not
            display administrator data or controls.
          </p>
        </div>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Return to Voter Portal
        </Link>
      </section>
    </main>
  );
}
