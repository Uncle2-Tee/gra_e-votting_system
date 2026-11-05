"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  createEnvAdminLookupHash,
  createAdminSession,
  encryptAdminEmail,
  encryptAdminName,
  getAdminLoginCredentials,
  hashAdminPassword,
  isAdminSecurityConfigured,
  normalizeAdminUsername,
  verifySecret,
} from "@/lib/admin-security";
import { prisma } from "@/lib/prisma";
import type { AdminLoginState } from "./types";

const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const INVALID_CREDENTIALS = "Username or password is incorrect.";

function isDatabaseFailure(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P1000", "P1001", "P2021", "P2022", "P2034"].includes(error.code))
  );
}

async function recordFailedLogin(emailLookupHash: string) {
  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    const attempt = await transaction.adminLoginAttempt.findUnique({
      where: { emailLookupHash },
    });

    if (!attempt || now.getTime() - attempt.windowStartedAt.getTime() >= FAILURE_WINDOW_MS) {
      await transaction.adminLoginAttempt.upsert({
        where: { emailLookupHash },
        create: {
          emailLookupHash,
          failedAttempts: 1,
          windowStartedAt: now,
        },
        update: {
          failedAttempts: 1,
          windowStartedAt: now,
          lockedUntil: null,
        },
      });
      return;
    }

    const failedAttempts = attempt.failedAttempts + 1;
    await transaction.adminLoginAttempt.update({
      where: { emailLookupHash },
      data: {
        failedAttempts,
        lockedUntil: failedAttempts >= MAX_FAILURES
          ? new Date(now.getTime() + LOCKOUT_MS)
          : null,
      },
    });
  }, { isolationLevel: "Serializable" });
}

async function getOrCreateEnvironmentAdmin(
  username: string,
  password: string,
) {
  const normalizedUsername = normalizeAdminUsername(username);
  const lookupEmail = `${normalizedUsername}@env-admin.invalid`;
  const emailLookupHash = createEnvAdminLookupHash(username);
  const existing = await prisma.user.findUnique({
    where: { emailLookupHash },
    select: { id: true },
  });

  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { role: "SUPER_ADMIN", status: "ACTIVE" },
      select: { id: true },
    });
    return user.id;
  }

  const passwordHash = await hashAdminPassword(password);
  try {
    const user = await prisma.user.create({
      data: {
        nameCiphertext: encryptAdminName(username),
        emailCiphertext: encryptAdminEmail(lookupEmail),
        emailLookupHash,
        passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    return user.id;
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }

    const concurrentUser = await prisma.user.findUnique({
      where: { emailLookupHash },
      select: { id: true },
    });
    if (!concurrentUser) {
      throw error;
    }
    return concurrentUser.id;
  }
}

export async function loginAdmin(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const credentials = getAdminLoginCredentials();
  if (!isAdminSecurityConfigured() || !credentials) {
    return { error: "Administrator sign-in is not configured on this server." };
  }

  const usernameValue = formData.get("username");
  const passwordValue = formData.get("password");
  if (
    typeof usernameValue !== "string" ||
    typeof passwordValue !== "string" ||
    usernameValue.length > 150 ||
    passwordValue.length > 512
  ) {
    return { error: INVALID_CREDENTIALS };
  }

  const usernameMatches = verifySecret(
    normalizeAdminUsername(usernameValue),
    normalizeAdminUsername(credentials.username),
  );
  const passwordMatches = verifySecret(passwordValue, credentials.password);
  const emailLookupHash = createEnvAdminLookupHash(credentials.username);
  try {
    const attempt = await prisma.adminLoginAttempt.findUnique({
      where: { emailLookupHash },
      select: { lockedUntil: true },
    });
    if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
      return { error: INVALID_CREDENTIALS };
    }

    if (!usernameMatches || !passwordMatches) {
      await recordFailedLogin(emailLookupHash);
      return { error: INVALID_CREDENTIALS };
    }

    await prisma.adminLoginAttempt.deleteMany({ where: { emailLookupHash } });
    const userId = await getOrCreateEnvironmentAdmin(
      credentials.username,
      credentials.password,
    );
    await createAdminSession(userId);
  } catch (error) {
    if (!isDatabaseFailure(error)) {
      throw error;
    }
    console.error("Administrator sign-in database request failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "UNAVAILABLE",
    });
    return { error: "Sign-in is temporarily unavailable. Check the database connection and try again." };
  }

  redirect("/admin");
}
