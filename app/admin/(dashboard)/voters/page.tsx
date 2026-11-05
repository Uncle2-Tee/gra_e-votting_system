import { Suspense } from "react";
import { AdminVotersPage } from "@/components/admin-dashboard-pages";
import { getAdminOverview } from "@/lib/admin-overview";

async function VoterData() {
  const overview = await getAdminOverview();
  return <AdminVotersPage overview={overview} />;
}

export default function AdminVotersRoute() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[1600px] px-4 py-6 text-sm text-slate-500 sm:px-8 sm:py-9">Loading voter registry…</main>}>
      <VoterData />
    </Suspense>
  );
}
