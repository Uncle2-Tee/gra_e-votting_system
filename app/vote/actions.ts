"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import {
  createCandidateApplicationLookupHash,
  encryptVoterField,
  normalizePhoneNumber,
} from "@/lib/voter-data-crypto";
import { prisma } from "@/lib/prisma";
import type { CandidateApplicationState } from "@/lib/candidate-types";

const INITIAL_STATE: CandidateApplicationState = {
  error: null,
  success: false,
};
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 20_000_000;

class InvalidCandidatePhotoError extends Error {}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function processCandidatePhoto(value: FormDataEntryValue | null) {
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    throw new InvalidCandidatePhotoError();
  }
  if (value.size === 0) {
    return null;
  }
  if (value.size > MAX_PHOTO_SIZE) {
    throw new InvalidCandidatePhotoError();
  }
  if (
    value.type &&
    !["image/jpeg", "image/png", "image/webp"].includes(value.type)
  ) {
    throw new InvalidCandidatePhotoError();
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
      throw new InvalidCandidatePhotoError();
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
    if (error instanceof InvalidCandidatePhotoError) {
      throw error;
    }
    throw new InvalidCandidatePhotoError();
  }
}

export async function submitCandidateApplication(
  _previousState: CandidateApplicationState,
  formData: FormData,
): Promise<CandidateApplicationState> {
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
    return { ...INITIAL_STATE, error: "Select an available position." };
  }
  if (!consent) {
    return {
      ...INITIAL_STATE,
      error: "Confirm that the administrator may use your details to review this application.",
    };
  }

  try {
    const photoData = await processCandidatePhoto(photoEntry);
    const positionTemplate = await prisma.positionTemplate.findUnique({
      where: { id: positionId },
      select: { id: true, title: true },
    });
    if (!positionTemplate) {
      return { ...INITIAL_STATE, error: "That position is no longer available for candidate applications." };
    }

    const applicantLookupHash = createCandidateApplicationLookupHash(name, email, phone);
    const normalizedPhone = normalizePhoneNumber(phone);
    const nameCiphertext = encryptVoterField(name, "candidate-name");
    const applicantEmailCiphertext = encryptVoterField(email, "nomination-email");
    const applicantPhoneCiphertext = encryptVoterField(normalizedPhone, "nomination-phone");
    const auditId = randomUUID();
    const existing = await prisma.candidateApplication.findUnique({
      where: {
        positionTemplateId_applicantLookupHash: {
          positionTemplateId: positionTemplate.id,
          applicantLookupHash,
        },
      },
      select: { id: true, status: true },
    });
    if (existing && (existing.status === "PENDING" || existing.status === "APPROVED")) {
      return {
        ...INITIAL_STATE,
        error: "An application with these details is already pending or approved for this position.",
      };
    }

    const application = await prisma.candidateApplication.upsert({
      where: {
        positionTemplateId_applicantLookupHash: {
          positionTemplateId: positionTemplate.id,
          applicantLookupHash,
        },
      },
      create: {
        positionTemplateId: positionTemplate.id,
        nameCiphertext,
        applicantEmailCiphertext,
        applicantPhoneCiphertext,
        applicantLookupHash,
        photoData,
        photoMimeType: photoData ? "image/webp" : null,
        status: "PENDING",
      },
      update: {
        nameCiphertext,
        applicantEmailCiphertext,
        applicantPhoneCiphertext,
        photoData,
        photoMimeType: photoData ? "image/webp" : null,
        status: "PENDING",
        reviewedById: null,
        reviewedAt: null,
        reviewNote: null,
      },
      select: { id: true },
    });
    await prisma.auditLog.create({
      data: {
        id: auditId,
        action: "CANDIDATE_APPLICATION_SUBMITTED",
        entityType: "CANDIDATE_APPLICATION",
        entityId: application.id,
        outcome: "PENDING_REVIEW",
        metadata: {
          positionTemplateId: positionTemplate.id,
          positionTitle: positionTemplate.title,
          hasProfilePhoto: Boolean(photoData),
        },
      },
    });

    revalidatePath("/vote/access");
    revalidatePath("/vote/candidate-application");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/candidates");
    return { error: null, success: true };
  } catch (error) {
    if (error instanceof InvalidCandidatePhotoError) {
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
    console.error("Candidate application submission failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode,
    });
    return {
      ...INITIAL_STATE,
      error: "Your application could not be saved. Please try again later.",
    };
  }
}
