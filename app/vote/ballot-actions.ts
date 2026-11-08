"use server";

import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createVoterCredentialDigest,
  createVoterNameLookupHash,
  createVoterPhoneLookupHash,
  decryptVoterField,
  normalizePhoneNumber,
} from "@/lib/voter-data-crypto";
import { prisma } from "@/lib/prisma";
import { getVoterCredentialCookieName } from "@/lib/voter-ballot-session";
import type { VoterActionState } from "@/lib/voter-ballot-types";

const INITIAL_STATE: VoterActionState = { error: null, message: null };
const MAX_ID_REQUESTS_PER_HOUR = 5;
const ID_REQUEST_COOLDOWN_MS = 60_000;
const ID_REQUEST_WINDOW_MS = 60 * 60 * 1000;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function arkeselRecipient(phone: string) {
  const digits = normalizePhoneNumber(phone).replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) {
    return `233${digits.slice(1)}`;
  }
  return digits;
}

async function sendVoterId(phone: string, electionTitle: string, voterId: string) {
  const apiKey = process.env.ARKESEL_API_KEY;
  const sender = process.env.ARKESEL_SENDER_ID;
  if (!apiKey || !sender) {
    throw new Error("Arkesel is not configured.");
  }

  const response = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender,
      message: `${electionTitle}: your GRA E-Voting ID is ${voterId}. Keep it private; use it once for each position.`,
      recipients: [arkeselRecipient(phone)],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Arkesel rejected the SMS request (${response.status}).`);
  }
}

export async function requestVoterId(
  _previousState: VoterActionState,
  formData: FormData,
): Promise<VoterActionState> {
  if (process.env.BALLOTING_ENABLED !== "true") {
    return { ...INITIAL_STATE, error: "Voter ID requests are not enabled yet." };
  }

  const electionId = readText(formData, "electionId");
  const name = readText(formData, "name").normalize("NFKC");
  const phone = readText(formData, "phone");
  const phoneDigits = phone.replace(/\D/g, "");

  if (!validId(electionId) || name.length < 2 || name.length > 150) {
    return { ...INITIAL_STATE, error: "Enter a valid name and select an election." };
  }
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    return { ...INITIAL_STATE, error: "Enter a valid phone number." };
  }
  if (!process.env.ARKESEL_API_KEY || !process.env.ARKESEL_SENDER_ID) {
    console.error("Voter ID request is unavailable because the SMS provider is not configured.");
    return { ...INITIAL_STATE, error: "SMS delivery is not configured. Contact the election administrator." };
  }

  const now = new Date();
  const voterId = `GRA-${randomBytes(24).toString("base64url")}`;
  const voterCredentialDigest = createVoterCredentialDigest(voterId);
  let issueResult:
    | { status: "issued"; phone: string; electionTitle: string; endsAt: Date }
    | { status: "unavailable" }
    | { status: "cooldown" }
    | { status: "rate_limited" };

  try {
    issueResult = await prisma.$transaction(async (transaction) => {
      const matchedRows = await transaction.$queryRaw<{
        id: string;
        eligibilityStatus: string;
        voterStatus: string;
        phoneCiphertext: string | null;
        startsAt: Date | null;
        endsAt: Date | null;
        electionStatus: string;
        electionTitle: string;
        voterCredentialIssuedAt: Date | null;
        voterCredentialWindowStartedAt: Date | null;
        voterCredentialRequestCount: number;
      }[]>`
        SELECT
          ev."id",
          ev."status" AS "eligibilityStatus",
          v."status" AS "voterStatus",
          v."phoneCiphertext",
          e."startsAt",
          e."endsAt",
          e."status" AS "electionStatus",
          e."title" AS "electionTitle",
          ev."voterCredentialIssuedAt",
          ev."voterCredentialWindowStartedAt",
          ev."voterCredentialRequestCount"
        FROM "ElectionVoter" ev
        JOIN "Voter" v ON v."id" = ev."voterId"
        JOIN "Election" e ON e."id" = ev."electionId"
        WHERE ev."electionId" = ${electionId}::uuid
          AND ev."status" = 'ELIGIBLE'::"EligibilityStatus"
          AND v."status" = 'ACTIVE'::"AccountStatus"
          AND v."identificationLookupHash" = ${createVoterNameLookupHash(name)}
          AND v."phoneLookupHash" = ${createVoterPhoneLookupHash(phone)}
        FOR UPDATE OF ev
      `;
      const matched = matchedRows[0];
      if (
        !matched ||
        !matched.phoneCiphertext ||
        !matched.startsAt ||
        !matched.endsAt ||
        matched.startsAt > now ||
        matched.endsAt < now ||
        !["SCHEDULED", "PUBLISHED", "OPEN"].includes(matched.electionStatus)
      ) {
        return { status: "unavailable" as const };
      }

      const windowStartedAt = matched.voterCredentialWindowStartedAt;
      const windowExpired =
        !windowStartedAt ||
        now.getTime() - windowStartedAt.getTime() >= ID_REQUEST_WINDOW_MS;
      const requestCount = windowExpired ? 0 : matched.voterCredentialRequestCount;
      if (
        !windowExpired &&
        matched.voterCredentialIssuedAt &&
        now.getTime() - matched.voterCredentialIssuedAt.getTime() < ID_REQUEST_COOLDOWN_MS
      ) {
        return { status: "cooldown" as const };
      }
      if (requestCount >= MAX_ID_REQUESTS_PER_HOUR) {
        return { status: "rate_limited" as const };
      }

      await transaction.electionVoter.update({
        where: { id: matched.id },
        data: {
          voterCredentialDigest,
          voterCredentialIssuedAt: now,
          voterCredentialWindowStartedAt: windowExpired ? now : windowStartedAt,
          voterCredentialRequestCount: requestCount + 1,
        },
      });

      return {
        status: "issued" as const,
        phone: decryptVoterField(matched.phoneCiphertext, "voter-phone"),
        electionTitle: matched.electionTitle,
        endsAt: matched.endsAt,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    const errorCode =
      error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "UNKNOWN";
    console.error("Voter ID request could not be prepared.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode,
    });
    return { ...INITIAL_STATE, error: "The voter ID request could not be processed. Please try again." };
  }

  if (issueResult.status === "unavailable") {
    return {
      ...INITIAL_STATE,
      message: "If the supplied details match the eligible voter roster and the election is open, an ID will be sent.",
    };
  }
  if (issueResult.status === "cooldown") {
    return { ...INITIAL_STATE, error: "Please wait one minute before requesting another voter ID." };
  }
  if (issueResult.status === "rate_limited") {
    return { ...INITIAL_STATE, error: "The voter ID request limit was reached. Try again in an hour." };
  }

  try {
    await sendVoterId(issueResult.phone, issueResult.electionTitle, voterId);
  } catch (error) {
    await prisma.electionVoter.updateMany({
      where: { voterCredentialDigest },
      data: { voterCredentialDigest: null },
    });
    console.error("Voter ID SMS delivery failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { ...INITIAL_STATE, error: "The voter ID could not be sent. Please wait one minute and try again." };
  }

  const cookieStore = await cookies();
  const maxAge = Math.min(
    60 * 60,
    Math.floor((issueResult.endsAt.getTime() - Date.now()) / 1000),
  );
  if (maxAge <= 0) {
    return { ...INITIAL_STATE, error: "Voting has closed. Your voter ID cannot be activated." };
  }
  cookieStore.set(getVoterCredentialCookieName(electionId), voterId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/vote/ballot",
    maxAge,
  });
  redirect(`/vote/ballot?electionId=${encodeURIComponent(electionId)}&idSent=1`);
}

export async function submitPositionVote(
  _previousState: VoterActionState,
  formData: FormData,
): Promise<VoterActionState> {
  if (process.env.BALLOTING_ENABLED !== "true") {
    return { ...INITIAL_STATE, error: "Ballot submission is not enabled yet." };
  }

  const electionId = readText(formData, "electionId");
  const positionId = readText(formData, "positionId");
  const candidateId = readText(formData, "candidateId");
  const providedVoterId = readText(formData, "voterId");
  if (
    !validId(electionId) ||
    !validId(positionId) ||
    !validId(candidateId)
  ) {
    return { ...INITIAL_STATE, error: "Select one candidate for a valid position." };
  }

  const cookieStore = await cookies();
  const voterId =
    cookieStore.get(getVoterCredentialCookieName(electionId))?.value ?? providedVoterId;
  if (!/^GRA-[A-Za-z0-9_-]{32}$/.test(voterId)) {
    return { ...INITIAL_STATE, error: "Enter your voter ID to continue voting." };
  }

  const now = new Date();
  const voterCredentialDigest = createVoterCredentialDigest(voterId);
  const anonymousCredentialDigest = createHash("sha256")
    .update(randomBytes(32))
    .digest("hex");
  let electionVoterId: string | null = null;

  try {
    await prisma.$transaction(async (transaction) => {
      const electionVoter = await transaction.electionVoter.findFirst({
        where: {
          electionId,
          status: "ELIGIBLE",
          voterCredentialDigest,
          voter: { status: "ACTIVE" },
          election: {
            status: { in: ["SCHEDULED", "PUBLISHED", "OPEN"] },
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
        },
        select: { id: true },
      });
      if (!electionVoter) {
        throw new Error("VOTER_ID_UNAVAILABLE");
      }
      electionVoterId = electionVoter.id;

      const position = await transaction.position.findFirst({
        where: { id: positionId, electionId },
        select: { id: true, minSelections: true, maxSelections: true },
      });
      const candidate = await transaction.candidate.findFirst({
        where: {
          id: candidateId,
          positionId,
          electionId,
          status: "APPROVED",
        },
        select: { id: true },
      });
      if (
        !position ||
        !candidate ||
        position.minSelections !== 1 ||
        position.maxSelections !== 1
      ) {
        throw new Error("BALLOT_OPTION_UNAVAILABLE");
      }

      const previousParticipation = await transaction.voteParticipation.findFirst({
        where: {
          electionVoterId: electionVoter.id,
          OR: [{ positionId: null }, { positionId }],
        },
        select: { id: true },
      });
      if (previousParticipation) {
        throw new Error("POSITION_ALREADY_VOTED");
      }

      await transaction.voteParticipation.create({
        data: {
          electionVoterId: electionVoter.id,
          positionId,
        },
        select: { id: true },
      });
      const ballot = await transaction.ballot.create({
        data: {
          electionId,
          anonymousCredentialDigest,
        },
        select: { id: true },
      });
      await transaction.ballotSelection.create({
        data: {
          ballotId: ballot.id,
          electionId,
          positionId,
          candidateId,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/vote/ballot");
    revalidatePath("/vote/results");
    return { ...INITIAL_STATE, message: "Your vote for this position was recorded." };
  } catch (error) {
    if (error instanceof Error && error.message === "POSITION_ALREADY_VOTED") {
      return { ...INITIAL_STATE, error: "A vote for that position has already been recorded." };
    }
    if (
      error instanceof Error &&
      ["VOTER_ID_UNAVAILABLE", "BALLOT_OPTION_UNAVAILABLE"].includes(error.message)
    ) {
      return { ...INITIAL_STATE, error: "This voter ID or ballot option is not available for voting." };
    }
    if (
      electionVoterId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2034"].includes(error.code)
    ) {
      const participation = await prisma.voteParticipation.findFirst({
        where: {
          electionVoterId,
          OR: [{ positionId: null }, { positionId }],
        },
        select: { id: true },
      });
      if (participation) {
        return { ...INITIAL_STATE, error: "A vote for that position has already been recorded." };
      }
    }
    const errorCode =
      error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "UNKNOWN";
    console.error("Position vote could not be recorded.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode,
    });
    return { ...INITIAL_STATE, error: "The vote could not be recorded. Please try again." };
  }
}
