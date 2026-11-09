import { Suspense } from "react";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import VoterBallotPage from "@/components/voter-ballot-page";
import {
  createVoterCredentialDigest,
  decryptVoterField,
} from "@/lib/voter-data-crypto";
import { prisma } from "@/lib/prisma";
import { getVoterCredentialCookieName } from "@/lib/voter-ballot-session";

async function BallotPageContent({
  searchParams,
}: {
  searchParams: Promise<{ electionId?: string; verified?: string }>;
}) {
  await connection();
  const query = await searchParams;
  const enabled = process.env.BALLOTING_ENABLED === "true";
  const now = new Date();
  const allElections = enabled ? await prisma.election.findMany({
    where: {
      status: { in: ["SCHEDULED", "PUBLISHED", "OPEN"] },
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: [{ startsAt: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      endsAt: true,
      positions: {
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          title: true,
          candidates: {
            where: { status: "APPROVED" },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              nameCiphertext: true,
              photoData: true,
              photoMimeType: true,
            },
          },
        },
      },
    },
  }) : [];
  const cookieStore = await cookies();
  const credentialByDigest = new Map<string, string>();
  const voterIdByElection = new Map<string, string>();
  for (const election of allElections) {
    const voterId = cookieStore.get(getVoterCredentialCookieName(election.id))?.value;
    if (voterId && (/^[A-Z]{6}$/.test(voterId) || /^GRA-[A-Za-z0-9_-]{32}$/.test(voterId))) {
      credentialByDigest.set(createVoterCredentialDigest(voterId), election.id);
      voterIdByElection.set(election.id, voterId);
    }
  }
  const validSessions = credentialByDigest.size > 0
    ? await prisma.electionVoter.findMany({
        where: {
          voterCredentialDigest: { in: [...credentialByDigest.keys()] },
          status: "ELIGIBLE",
          voter: { status: "ACTIVE" },
          election: {
            status: { in: ["SCHEDULED", "PUBLISHED", "OPEN"] },
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
        },
        select: { id: true, electionId: true, voterCredentialDigest: true },
      })
    : [];
  const authenticatedElectionIds = new Set(
    validSessions
      .filter(
        (session) =>
          session.voterCredentialDigest &&
          credentialByDigest.get(session.voterCredentialDigest) === session.electionId,
      )
      .map((session) => session.electionId),
  );
  const selectedElection =
    allElections.find(
      (election) =>
        election.id === query.electionId && authenticatedElectionIds.has(election.id),
    ) ??
    allElections.find((election) => authenticatedElectionIds.has(election.id)) ??
    allElections.find((election) => election.id === query.electionId) ??
    allElections[0];
  const elections = selectedElection ? [selectedElection] : [];
  const selectedSession = selectedElection
    ? validSessions.find(
        (session) =>
          session.electionId === selectedElection.id &&
          session.voterCredentialDigest &&
          credentialByDigest.get(session.voterCredentialDigest) === session.electionId,
      )
    : undefined;
  if (selectedElection && !selectedSession) {
      redirect(`/vote?electionId=${encodeURIComponent(selectedElection.id)}`);
  }
  const submittedPositionIds = selectedSession
    ? (await prisma.voteParticipation.findMany({
        where: {
          electionVoterId: selectedSession.id,
          positionId: { not: null },
        },
        select: { positionId: true },
      })).flatMap((participation) =>
        participation.positionId ? [participation.positionId] : [],
      )
    : [];

  return (
    <VoterBallotPage
      enabled={enabled}
      initialElectionId={selectedElection?.id ?? ""}
      identityVerified={query.verified === "1"}
      voterId={
        selectedElection && selectedSession
          ? voterIdByElection.get(selectedElection.id) ?? ""
          : ""
      }
      hasVoterSession={
        selectedElection ? authenticatedElectionIds.has(selectedElection.id) : false
      }
      submittedPositionIds={submittedPositionIds}
      elections={elections.map((election) => ({
        id: election.id,
        title: election.title,
        endsAt: election.endsAt?.toISOString() ?? "",
        positions: election.positions
          .map((position) => ({
            id: position.id,
            title: position.title,
            candidates: position.candidates.map((candidate) => ({
              id: candidate.id,
              name: decryptVoterField(candidate.nameCiphertext, "candidate-name"),
              photoUrl:
                candidate.photoData && candidate.photoMimeType === "image/webp"
                  ? `/admin/candidates/${candidate.id}/photo`
                  : null,
            })),
          })),
      })).filter((election) => election.positions.length > 0)}
    />
  );
}

export default function BallotPage({
  searchParams,
}: {
  searchParams: Promise<{ electionId?: string; verified?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <BallotPageContent searchParams={searchParams} />
    </Suspense>
  );
}
