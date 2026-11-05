import "server-only";

import type { ElectionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ElectionSchedule = {
  status: ElectionStatus;
  startsAt: Date | null;
  endsAt: Date | null;
};

function getLocalDateTimeParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

export function parseElectionDateTime(value: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const desired = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
  };
  const desiredUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
  );
  const normalized = new Date(desiredUtc);
  if (
    normalized.getUTCFullYear() !== desired.year ||
    normalized.getUTCMonth() + 1 !== desired.month ||
    normalized.getUTCDate() !== desired.day ||
    desired.hour > 23 ||
    desired.minute > 59
  ) {
    return null;
  }

  try {
    let timestamp = desiredUtc;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const actual = getLocalDateTimeParts(new Date(timestamp), timeZone);
      const actualAsUtc = Date.UTC(
        actual.year,
        actual.month - 1,
        actual.day,
        actual.hour,
        actual.minute,
      );
      const difference = desiredUtc - actualAsUtc;
      if (difference === 0) {
        return new Date(timestamp);
      }
      timestamp += difference;
    }
  } catch {
    return null;
  }

  return null;
}

export function getEffectiveElectionStatus(
  election: ElectionSchedule,
  now: Date = new Date(),
): ElectionStatus {
  if (!["SCHEDULED", "PUBLISHED", "OPEN"].includes(election.status)) {
    return election.status;
  }
  if (election.endsAt && now >= election.endsAt) {
    return "CLOSED";
  }
  if (election.startsAt && now >= election.startsAt) {
    return "OPEN";
  }
  return election.status;
}

export function canAcceptPreElectionChanges(status: ElectionStatus) {
  return ["DRAFT", "SCHEDULED", "PUBLISHED"].includes(status);
}

export async function synchronizeElectionStatuses(now: Date = new Date()) {
  await prisma.$executeRaw`
    UPDATE "Election"
    SET "status" = CASE
      WHEN "endsAt" <= ${now} THEN 'CLOSED'::"ElectionStatus"
      WHEN "startsAt" <= ${now} THEN 'OPEN'::"ElectionStatus"
      ELSE "status"
    END
    WHERE "status" IN (
      'SCHEDULED'::"ElectionStatus",
      'PUBLISHED'::"ElectionStatus",
      'OPEN'::"ElectionStatus"
    )
      AND (
        ("endsAt" IS NOT NULL AND "endsAt" <= ${now})
        OR (
          "startsAt" IS NOT NULL
          AND "startsAt" <= ${now}
          AND ("endsAt" IS NULL OR "endsAt" > ${now})
        )
      )
  `;
}
