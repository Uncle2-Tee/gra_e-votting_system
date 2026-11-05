import { Suspense } from "react";
import { connection } from "next/server";
import VotersPortal from "@/components/voters_portal";
import { getVoterPortalData } from "@/lib/nomination-data";

type PortalSection = "overview" | "nominees" | "nominate";

async function VoterPortalContent({ section }: { section: PortalSection }) {
  await connection();
  const data = await getVoterPortalData();
  return <VotersPortal data={data} section={section} />;
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
