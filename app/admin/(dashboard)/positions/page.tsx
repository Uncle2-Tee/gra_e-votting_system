import { Suspense } from "react";
import AdminPositionManager from "@/components/admin-position-manager";
import PageLoading from "@/components/page-loading";
import { getAdminElectionSchedules } from "@/lib/admin-overview";

export const instant = false;

async function PositionData() {
  const schedules = await getAdminElectionSchedules();
  return (
    <AdminPositionManager
      positions={
        schedules.databaseStatus === "connected"
          ? schedules.positionTemplates
          : []
      }
      databaseStatus={schedules.databaseStatus}
    />
  );
}

export default function AdminPositionsRoute() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PositionData />
    </Suspense>
  );
}
