import { Suspense } from "react";
import { AdminVotersPage } from "@/components/admin-dashboard-pages";
import { getAdminOverview } from "@/lib/admin-overview";

async function VoterData() {
  const overview = await getAdminOverview();
  return <AdminVotersPage overview={overview} />;
}

export default function AdminVotersRoute() {
  return (
    <Suspense fallback={null}>
      <VoterData />
    </Suspense>
  );
}
