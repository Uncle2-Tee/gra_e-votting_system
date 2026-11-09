import { Suspense } from "react";
import { AdminVotersPage } from "@/components/admin-dashboard-pages";
import PageLoading from "@/components/page-loading";
import { getAdminOverview } from "@/lib/admin-overview";

async function VoterData() {
  const overview = await getAdminOverview();
  return <AdminVotersPage overview={overview} />;
}

export default function AdminVotersRoute() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VoterData />
    </Suspense>
  );
}
