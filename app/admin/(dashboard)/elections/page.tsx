import { Suspense } from "react";
import { AdminElectionsPage } from "@/components/admin-dashboard-pages";
import { getAdminElectionSchedules } from "@/lib/admin-overview";

export const instant = false;

async function ElectionData() {
  const schedules = await getAdminElectionSchedules();
  return <AdminElectionsPage schedules={schedules} />;
}

export default function AdminElectionsRoute() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[1600px] px-4 py-6 text-sm text-slate-500 sm:px-8 sm:py-9">Loading elections…</main>}>
      <ElectionData />
    </Suspense>
  );
}
