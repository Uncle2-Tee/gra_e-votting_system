import { Suspense } from "react";
import { AdminNominationsPage } from "@/components/admin-dashboard-pages";
import { getPendingNominationData } from "@/lib/nomination-data";

async function NominationData() {
  const data = await getPendingNominationData();
  return <AdminNominationsPage data={data} />;
}

export default function AdminNominationsRoute() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[1600px] px-4 py-6 text-sm text-slate-500 sm:px-8 sm:py-9">Loading nomination applications…</main>}>
      <NominationData />
    </Suspense>
  );
}
