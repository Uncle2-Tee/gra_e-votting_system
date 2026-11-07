import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LockKeyhole } from "lucide-react";
import BrandLogo from "@/components/brand-logo";
import AdminLoginForm from "@/components/admin-login-form";
import {
  getCurrentAdmin,
  isAdminDatabaseUnavailableError,
  isAdminSecurityConfigured,
} from "@/lib/admin-security";

async function AdminLoginContent() {
  await connection();
  let databaseUnavailable = false;
  let currentAdmin: Awaited<ReturnType<typeof getCurrentAdmin>> = null;
  try {
    currentAdmin = await getCurrentAdmin();
  } catch (error) {
    if (!isAdminDatabaseUnavailableError(error)) {
      throw error;
    }
    databaseUnavailable = true;
  }
  if (currentAdmin) {
    redirect("/admin");
  }

  const securityConfigured = isAdminSecurityConfigured();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f7f8f6] px-4 py-8 text-slate-900 sm:px-5 sm:py-12">
      <section className="w-full max-w-md rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-9">
        <BrandLogo variant="lockup" priority className="mx-auto size-32 object-contain sm:size-36" />
        <p className="mt-5 text-center text-xs font-semibold tracking-[0.15em] text-emerald-700 uppercase">
          GRA E-Voting
        </p>
        <h1 className="mt-2 text-center text-xl font-semibold tracking-tight text-slate-950">
          Administrator sign in
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-500">
          Sign in with an authorized administrator account to continue.
        </p>
        {databaseUnavailable && (
          <div role="alert" className="mt-5 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Administrator sign-in is temporarily unavailable because the
            database connection could not be reached. Try again when the
            database is available.
          </div>
        )}
        {!securityConfigured && (
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-amber-50 p-3">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <p className="text-xs leading-5 text-amber-900">
              Configure SESSION_SECRET, APP_ENCRYPTION_KEY, ADMIN_USERNAME, and
              ADMIN_PASSWORD in the server environment to enable sign-in.
            </p>
          </div>
        )}
        <AdminLoginForm disabled={!securityConfigured || databaseUnavailable} />
      </section>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center px-4 text-center text-sm text-slate-500">Loading administrator sign-in…</main>}>
      <AdminLoginContent />
    </Suspense>
  );
}
