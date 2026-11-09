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
    <Suspense fallback={null}>
      <ElectionData />
    </Suspense>
  );
}
