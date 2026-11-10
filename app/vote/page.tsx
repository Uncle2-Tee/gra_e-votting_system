import { redirect } from "next/navigation";

export default async function VoteLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ electionId?: string }>;
}) {
  const { electionId } = await searchParams;
  if (electionId) {
    redirect(`/vote/access?electionId=${encodeURIComponent(electionId)}`);
  }
  redirect("/vote/overview");
}
