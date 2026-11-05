import { Suspense } from "react";
import AdminPortal from "@/components/admin_portal";
import { getAdminOverview } from "@/lib/admin-overview";

async function AdminDashboard() {
  const overview = await getAdminOverview();
  return <AdminPortal overview={overview} />;
}

export default function AdminPortalAccess() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[1600px] px-4 py-6 text-sm text-slate-500 sm:px-8 sm:py-9">Loading administrator overview…</main>}>
      <AdminDashboard />
    </Suspense>
  );
}
