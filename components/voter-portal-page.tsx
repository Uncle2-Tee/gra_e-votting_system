import { Suspense } from "react";
import { connection } from "next/server";
import VotersPortal from "@/components/voters_portal";
import { getVoterPortalData, getVoterResultsData } from "@/lib/nomination-data";
import type { VoterResultsData } from "@/lib/nomination-types";

type PortalSection = "overview" | "nominees" | "nominate" | "results";

async function VoterPortalContent({ section }: { section: PortalSection }) {
  await connection();
  const [data, results] = await Promise.all([
    section === "results" ? Promise.resolve(null) : getVoterPortalData(),
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
        <div className="flex min-h-[calc(100dvh-66px)] items-center justify-center px-4 text-center text-sm text-slate-500">
          Loading election portal…
        </div>
      }
    >
      <VoterPortalContent section={section} />
    </Suspense>
  );
}
