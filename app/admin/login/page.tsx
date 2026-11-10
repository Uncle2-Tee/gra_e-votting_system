import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LockKeyhole } from "lucide-react";
import BrandLogo from "@/components/brand-logo";
import AdminLoginForm from "@/components/admin-login-form";
import PageLoading from "@/components/page-loading";
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
    <main className="flex min-h-dvh items-center justify-center bg-[#f6f9fc] px-4 py-5 text-slate-900 sm:px-5 sm:py-8">
      <section className="w-full max-w-md rounded-2xl border border-emerald-400 bg-white p-5 shadow-xl shadow-emerald-950/[0.08] sm:p-6">
        <div className="flex flex-col items-center text-center">
          <BrandLogo priority className="size-14 object-contain" />
          <div className="min-w-0">
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              Administrator
            </h1>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              Enter your credentials to continue.
            </p>
          </div>
        </div>
        {databaseUnavailable && (
          <div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Administrator sign-in is temporarily unavailable because the
            database connection could not be reached. Try again when the
            database is available.
          </div>
        )}
        {!securityConfigured && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <p className="text-xs leading-5 text-amber-900">
              Configure SESSION_SECRET, APP_ENCRYPTION_KEY, ADMIN_USERNAME, and
              ADMIN_PASSWORD in the server environment to enable sign-in.
            </p>
          </div>
        )}
        <div className="mt-5">
          <AdminLoginForm disabled={!securityConfigured || databaseUnavailable} />
        </div>
      </section>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<PageLoading centered />}>
      <AdminLoginContent />
    </Suspense>
  );
}
