import { Suspense } from "react";
import VotersPortal, { VoterPortalLoading } from "@/components/voters_portal";
import PageLoading from "@/components/page-loading";
import { getVoterPortalData, getVoterResultsData } from "@/lib/candidate-data";
import type { VoterResultsData } from "@/lib/candidate-types";

type PortalSection = "overview" | "candidates" | "candidate-application" | "results";

async function VoterPortalContent({ section }: { section: PortalSection }) {
  const [data, results] = await Promise.all([
    section === "results" ? Promise.resolve(null) : getVoterPortalData(section),
    section === "results" ? getVoterResultsData() : Promise.resolve<VoterResultsData | null>(null),
  ]);
  return <VotersPortal data={data} results={results} section={section} />;
}

export default function VoterPortalPage({
  section,
}: {
  section: PortalSection;
}) {
  return (
    <Suspense
      fallback={
        section === "overview" || section === "candidates" ? (
          <VoterPortalLoading section={section} />
        ) : (
          <PageLoading />
        )
      }
    >
      <VoterPortalContent section={section} />
    </Suspense>
  );
}
