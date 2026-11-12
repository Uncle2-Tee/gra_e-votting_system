import { Suspense } from "react";
import { AdminCandidatesPage } from "@/components/admin-dashboard-pages";
import PageLoading from "@/components/page-loading";
import { getPendingCandidateData } from "@/lib/candidate-data";

async function CandidateData() {
  const data = await getPendingCandidateData();
  return <AdminCandidatesPage data={data} />;
}

export default function AdminCandidatesRoute() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CandidateData />
    </Suspense>
  );
}
