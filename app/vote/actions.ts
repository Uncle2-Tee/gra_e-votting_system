"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { sendArkeselSms } from "@/lib/arkesel-sms";
import {
  createNominationLookupHash,
  encryptVoterField,
  normalizePhoneNumber,
} from "@/lib/voter-data-crypto";
import { prisma } from "@/lib/prisma";
import type { NominationApplicationState } from "@/lib/nomination-types";

const INITIAL_STATE: NominationApplicationState = {
  error: null,
  success: false,
};
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 20_000_000;

class InvalidNominationPhotoError extends Error {}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function processNominationPhoto(value: FormDataEntryValue | null) {
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    throw new InvalidNominationPhotoError();
  }
  if (value.size === 0) {
    return null;
  }
  if (value.size > MAX_PHOTO_SIZE) {
    throw new InvalidNominationPhotoError();
  }
  if (
    value.type &&
    !["image/jpeg", "image/png", "image/webp"].includes(value.type)
  ) {
    throw new InvalidNominationPhotoError();
  }

  const input = Buffer.from(await value.arrayBuffer());
  try {
    const metadata = await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();
    const supportedTypes: Record<string, string> = {
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    if (
      !metadata.format ||
      !supportedTypes[metadata.format] ||
      (value.type && value.type !== supportedTypes[metadata.format]) ||
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > MAX_IMAGE_PIXELS ||
      (metadata.pages ?? 1) > 1
    ) {
      throw new InvalidNominationPhotoError();
    }

    return await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    })
      .rotate()
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch (error) {
    if (error instanceof InvalidNominationPhotoError) {
      throw error;
    }
    throw new InvalidNominationPhotoError();
  }
}

export async function submitNominationApplication(
  _previousState: NominationApplicationState,
  formData: FormData,
): Promise<NominationApplicationState> {
  const name = readText(formData, "name").normalize("NFKC");
  const email = readText(formData, "email").normalize("NFKC").toLocaleLowerCase("en");
  const phone = readText(formData, "phone");
  const positionId = readText(formData, "positionId");
  const consent = formData.get("consent") === "on";
  const photoEntry = formData.get("photo");

  if (photoEntry !== null && !(photoEntry instanceof File)) {
    return { ...INITIAL_STATE, error: "Upload a valid profile photo." };
  }

  if (name.length < 2 || name.length > 120) {
    return { ...INITIAL_STATE, error: "Enter a name between 2 and 120 characters." };
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { ...INITIAL_STATE, error: "Enter a valid email address." };
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    return { ...INITIAL_STATE, error: "Enter a phone number with 7 to 15 digits." };
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(positionId)) {
    return { ...INITIAL_STATE, error: "Select an available nomination form." };
  }
  if (!consent) {
    return {
      ...INITIAL_STATE,
      error: "Confirm that the administrator may use your details to review this application.",
    };
  }

  try {
    const photoData = await processNominationPhoto(photoEntry);
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: {
        id: true,
        electionId: true,
        title: true,
        election: { select: { title: true } },
      },
    });
    if (!position) {
      return { ...INITIAL_STATE, error: "That nomination form is no longer available." };
    }

    const applicantLookupHash = createNominationLookupHash(name, email, phone);
    const normalizedPhone = normalizePhoneNumber(phone);
    const nameCiphertext = encryptVoterField(name, "candidate-name");
    const applicantEmailCiphertext = encryptVoterField(email, "nomination-email");
    const applicantPhoneCiphertext = encryptVoterField(normalizedPhone, "nomination-phone");
    const candidateId = randomUUID();
    const auditId = randomUUID();
    const resultRows = await prisma.$queryRaw<{ result: "unavailable" | "duplicate" | "submitted" }[]>(
      Prisma.sql`
        WITH eligible_election AS MATERIALIZED (
          SELECT "id"
          FROM "Election"
          WHERE "id" = ${position.electionId}::uuid
            AND "status" != 'ARCHIVED'::"ElectionStatus"
          FOR SHARE
        ),
        saved_candidate AS (
          INSERT INTO "Candidate" (
            "id",
            "electionId",
            "positionId",
            "nameCiphertext",
            "applicantEmailCiphertext",
            "applicantPhoneCiphertext",
            "applicantLookupHash",
            "biography",
            "photoData",
            "photoMimeType",
            "status",
            "reviewedById",
            "reviewedAt",
            "reviewNote",
            "updatedAt"
          )
          SELECT
            ${candidateId}::uuid,
            ${position.electionId}::uuid,
            ${positionId}::uuid,
            ${nameCiphertext},
            ${applicantEmailCiphertext},
            ${applicantPhoneCiphertext},
            ${applicantLookupHash},
            NULL,
            ${photoData},
            ${photoData ? "image/webp" : null},
            'PENDING'::"CandidateStatus",
            NULL,
            NULL,
            NULL,
            CURRENT_TIMESTAMP
          FROM eligible_election
          ON CONFLICT ("positionId", "applicantLookupHash")
          DO UPDATE SET
            "nameCiphertext" = EXCLUDED."nameCiphertext",
            "applicantEmailCiphertext" = EXCLUDED."applicantEmailCiphertext",
            "applicantPhoneCiphertext" = EXCLUDED."applicantPhoneCiphertext",
            "biography" = EXCLUDED."biography",
            "photoData" = EXCLUDED."photoData",
            "photoMimeType" = EXCLUDED."photoMimeType",
            "status" = 'PENDING',
            "reviewedById" = NULL,
            "reviewedAt" = NULL,
            "reviewNote" = NULL,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "Candidate"."status" IN ('REJECTED', 'INACTIVE')
          RETURNING "id"
        ),
        audit_entry AS (
          INSERT INTO "AuditLog" (
            "id",
            "action",
            "entityType",
            "entityId",
            "outcome",
            "metadata"
          )
          SELECT
            ${auditId}::uuid,
            'CANDIDATE_NOMINATION_SUBMITTED',
            'CANDIDATE',
            "id",
            'PENDING_REVIEW',
            ${JSON.stringify({
              electionId: position.electionId,
              positionId,
              hasProfilePhoto: Boolean(photoData),
            })}::jsonb
          FROM saved_candidate
          RETURNING "id"
        )
        SELECT CASE
          WHEN NOT EXISTS (SELECT 1 FROM eligible_election) THEN 'unavailable'
          WHEN EXISTS (SELECT 1 FROM saved_candidate) THEN 'submitted'
          ELSE 'duplicate'
        END AS "result",
        (SELECT COUNT(*) FROM audit_entry) AS "auditCount"
      `,
    );
    const result = resultRows[0]?.result;

    if (result === "unavailable") {
      return {
        ...INITIAL_STATE,
        error: "That nomination position is no longer available. Refresh the page and try again.",
      };
    }
    if (result === "duplicate") {
      return {
        ...INITIAL_STATE,
        error: "An application with these details is already pending or approved for this form.",
      };
    }
    if (result !== "submitted") {
      throw new Error("The nomination submission query returned no result.");
    }

    revalidatePath("/vote");
    revalidatePath("/vote/nominate");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/nominations");
    const adminPhone = process.env.ADMIN_NOTIFICATION_PHONE;
    if (!adminPhone) {
      console.error("Pending nomination SMS notification was not sent: ADMIN_NOTIFICATION_PHONE is not configured.");
    } else {
      try {
        await sendArkeselSms(
          [adminPhone],
          `New nomination pending approval for ${position.title} (${position.election.title}). Review it in the admin portal.`,
        );
      } catch (error) {
        const errorCode =
          error instanceof Error && /\((\d{3})\)$/.test(error.message)
            ? error.message.match(/\((\d{3})\)$/)?.[1] ?? "UNKNOWN"
            : "UNKNOWN";
        console.error("Pending nomination SMS notification failed.", {
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorCode,
        });
      }
    }
    return { error: null, success: true };
  } catch (error) {
    if (error instanceof InvalidNominationPhotoError) {
      return {
        ...INITIAL_STATE,
        error: "Choose a valid JPEG, PNG, or WebP photo under 2 MB.",
      };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ...INITIAL_STATE,
        error: "An application with these details is already pending or approved for this form.",
      };
    }

    const errorCode =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : "UNKNOWN";
    console.error("Candidate nomination submission failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode,
    });
    return {
      ...INITIAL_STATE,
      error: "Your application could not be saved. Please try again later.",
    };
  }
}
