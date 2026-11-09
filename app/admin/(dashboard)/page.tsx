import { Suspense } from "react";
import AdminPortal from "@/components/admin_portal";
import PageLoading from "@/components/page-loading";
import { getAdminOverview } from "@/lib/admin-overview";

async function AdminDashboard() {
  const overview = await getAdminOverview();
  return <AdminPortal overview={overview} />;
}

export default function AdminPortalAccess() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminDashboard />
    </Suspense>
  );
}
