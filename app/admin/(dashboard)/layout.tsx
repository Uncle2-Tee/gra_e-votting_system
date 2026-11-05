import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import AdminDashboardShell from "@/components/admin-dashboard-shell";
import {
  getCurrentAdmin,
  isAdminDatabaseUnavailableError,
} from "@/lib/admin-security";

async function AuthenticatedDashboard({
  children,
}: {
  children: ReactNode;
}) {
  await connection();
  let admin: Awaited<ReturnType<typeof getCurrentAdmin>>;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f7f8f6] px-4 text-slate-900 sm:px-5">
        <section className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.14em] text-amber-700 uppercase">
            Administrator access unavailable
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            The database connection is unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The system could not verify your administrator session. Check the
            database connection and try again.
          </p>
        </section>
      </main>
    );
  }

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <AdminDashboardShell>
      {children}
    </AdminDashboardShell>
  );
}

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center px-4 text-center text-sm text-slate-500">Loading administrator access…</main>}>
      <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
    </Suspense>
  );
}
