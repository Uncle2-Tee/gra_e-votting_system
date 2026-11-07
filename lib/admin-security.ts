import "server-only";

import { Prisma } from "@prisma/client";
import {
  createCipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { decryptVoterField, encryptVoterField } from "@/lib/voter-data-crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "gra_admin_session";
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export type AdminLoginCredentials = {
  username: string;
  password: string;
};

export class AdminDatabaseUnavailableError extends Error {
  constructor() {
    super("Administrator session verification is temporarily unavailable.");
    this.name = "AdminDatabaseUnavailableError";
  }
}

export function isAdminDatabaseUnavailableError(error: unknown): error is AdminDatabaseUnavailableError {
  return error instanceof AdminDatabaseUnavailableError;
}

function isDatabaseConnectionFailure(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P1000", "P1001", "P1002", "P1008", "P1017", "P2024"].includes(error.code))
  );
}

function logAdminSessionDatabaseFailure(error: unknown) {
  const errorCode =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : "UNAVAILABLE";
  console.error("Could not verify the administrator session because the database is unavailable.", {
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorCode,
  });
}

function hasSecretValue(value: string | undefined): value is string {
  return Boolean(
    value &&
    Buffer.byteLength(value, "utf8") >= 32 &&
    !value.startsWith("REPLACE_WITH"),
  );
}

export function normalizeAdminUsername(username: string) {
  return username.trim().normalize("NFKC").toLocaleLowerCase("en");
}

export function getAdminLoginCredentials(): AdminLoginCredentials | null {
  const username = process.env.ADMIN_USERNAME?.trim().normalize("NFKC");
  const password = process.env.ADMIN_PASSWORD;
  if (
    !username ||
    username.length > 150 ||
    !password ||
    password.length > 512 ||
    username.startsWith("REPLACE_WITH") ||
    password.startsWith("REPLACE_WITH")
  ) {
    return null;
  }
  return { username, password };
}

function derivePassword(password: string, salt: Buffer, length: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!hasSecretValue(secret)) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes.");
  }
  return secret;
}

function getApplicationSecret() {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!hasSecretValue(secret)) {
    throw new Error("APP_ENCRYPTION_KEY must contain at least 32 bytes.");
  }
  return secret;
}

export function isAdminSecurityConfigured() {
  const sessionSecret = process.env.SESSION_SECRET;
  const encryptionSecret = process.env.APP_ENCRYPTION_KEY;
  return (
    hasSecretValue(sessionSecret) &&
    hasSecretValue(encryptionSecret) &&
    getAdminLoginCredentials() !== null
  );
}

function deriveKey(secret: string, purpose: string) {
  return Buffer.from(
    hkdfSync("sha256", secret, "gra-e-voting", `gra-e-voting:${purpose}`, 32),
  );
}

export function normalizeAdminEmail(email: string) {
  return email.trim().normalize("NFKC").toLocaleLowerCase("en");
}

export function createAdminEmailLookupHash(email: string) {
  return createHmac("sha256", deriveKey(getApplicationSecret(), "admin-email-lookup"))
    .update(normalizeAdminEmail(email), "utf8")
    .digest("hex");
}

export function createEnvAdminLookupHash(username: string) {
  return createAdminEmailLookupHash(
    `${normalizeAdminUsername(username)}@env-admin.invalid`,
  );
}

export function encryptAdminField(value: string, purpose: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    deriveKey(getApplicationSecret(), `admin-field:${purpose}`),
    iv,
  );
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export async function hashAdminPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await derivePassword(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyAdminPassword(password: string, encoded: string) {
  const [algorithm, saltValue, hashValue] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const expected = Buffer.from(hashValue, "base64url");
  if (salt.length !== 16 || expected.length !== 64) {
    return false;
  }

  const actual = await derivePassword(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

export function verifySecret(candidate: string, expected: string) {
  const candidateHash = createHmac("sha256", getSessionSecret()).update(candidate).digest();
  const expectedHash = createHmac("sha256", getSessionSecret()).update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

function hashSessionToken(token: string) {
  return createHmac("sha256", getSessionSecret()).update(token).digest("hex");
}

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await prisma.adminSession.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    expires: expiresAt,
  });
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const credentials = getAdminLoginCredentials();
  if (!isAdminSecurityConfigured() || !credentials) {
    return null;
  }

  try {
    const session = await prisma.adminSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      select: {
        id: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            role: true,
            status: true,
            nameCiphertext: true,
            emailLookupHash: true,
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== "ACTIVE" ||
      session.user.role !== "SUPER_ADMIN" ||
      session.user.emailLookupHash !== createEnvAdminLookupHash(credentials.username)
    ) {
      if (session && !session.revokedAt) {
        await prisma.adminSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
      }
      return null;
    }

    return {
      id: session.user.id,
      role: session.user.role,
      name: decryptVoterField(session.user.nameCiphertext, "admin-name"),
    };
  } catch (error) {
    if (!isDatabaseConnectionFailure(error)) {
      throw error;
    }
    logAdminSessionDatabaseFailure(error);
    throw new AdminDatabaseUnavailableError();
  }
}

export async function revokeCurrentAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.adminSession.updateMany({
      where: {
        tokenHash: hashSessionToken(token),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export function encryptAdminName(name: string) {
  return encryptVoterField(name, "admin-name");
}

export function encryptAdminEmail(email: string) {
  return encryptAdminField(email, "email");
}
