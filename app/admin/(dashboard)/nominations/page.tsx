import { Suspense } from "react";
import { AdminNominationsPage } from "@/components/admin-dashboard-pages";
import PageLoading from "@/components/page-loading";
import { getPendingNominationData } from "@/lib/nomination-data";

async function NominationData() {
  const data = await getPendingNominationData();
  return <AdminNominationsPage data={data} />;
}

export default function AdminNominationsRoute() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NominationData />
    </Suspense>
  );
}
