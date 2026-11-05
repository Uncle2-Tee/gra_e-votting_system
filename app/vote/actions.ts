"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
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
  const biography = readText(formData, "biography").normalize("NFKC");
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
  if (biography.length < 30 || biography.length > 1200) {
    return {
      ...INITIAL_STATE,
      error: "Your candidate statement must be between 30 and 1,200 characters.",
    };
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
      select: { id: true, electionId: true },
    });
    if (!position) {
      return { ...INITIAL_STATE, error: "That nomination form is no longer available." };
    }

    const applicantLookupHash = createNominationLookupHash(name, email, phone);
    const normalizedPhone = normalizePhoneNumber(phone);
    const result = await prisma.$transaction(async (transaction) => {
      const lockedElections = await transaction.$queryRaw<{ status: string }[]>(
        Prisma.sql`SELECT "status" FROM "Election" WHERE "id" = ${position.electionId} FOR SHARE`,
      );
      if (lockedElections[0]?.status !== "PUBLISHED") {
        return "closed" as const;
      }

      const existing = await transaction.candidate.findUnique({
        where: {
          positionId_applicantLookupHash: {
            positionId,
            applicantLookupHash,
          },
        },
        select: { id: true, status: true },
      });

      if (existing?.status === "PENDING" || existing?.status === "APPROVED") {
        return "duplicate" as const;
      }

      const candidateData = {
        nameCiphertext: encryptVoterField(name, "candidate-name"),
        applicantEmailCiphertext: encryptVoterField(email, "nomination-email"),
        applicantPhoneCiphertext: encryptVoterField(normalizedPhone, "nomination-phone"),
        applicantLookupHash,
        biography,
        photoData,
        photoMimeType: photoData ? "image/webp" : null,
        status: "PENDING" as const,
        reviewedById: null,
        reviewedAt: null,
        reviewNote: null,
      };

      const candidate = existing
        ? await transaction.candidate.update({
            where: { id: existing.id },
            data: candidateData,
            select: { id: true },
          })
        : await transaction.candidate.create({
            data: { ...candidateData, electionId: position.electionId, positionId },
            select: { id: true },
          });

      await transaction.auditLog.create({
        data: {
          action: "CANDIDATE_NOMINATION_SUBMITTED",
          entityType: "CANDIDATE",
          entityId: candidate.id,
          outcome: "PENDING_REVIEW",
          metadata: {
            electionId: position.electionId,
            positionId,
            hasProfilePhoto: Boolean(photoData),
          },
        },
      });

      return "submitted" as const;
    });

    if (result === "closed") {
      return {
        ...INITIAL_STATE,
        error: "That nomination form has closed. Refresh the page to see current forms.",
      };
    }
    if (result === "duplicate") {
      return {
        ...INITIAL_STATE,
        error: "An application with these details is already pending or approved for this form.",
      };
    }

    revalidatePath("/vote");
    revalidatePath("/admin/nominations");
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
