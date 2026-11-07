import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

function getEncryptionSecret() {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (
    !secret ||
    Buffer.byteLength(secret, "utf8") < 32 ||
    secret.startsWith("REPLACE_WITH")
  ) {
    throw new Error("APP_ENCRYPTION_KEY must contain at least 32 bytes.");
  }
  return secret;
}

function deriveKey(purpose: string) {
  return Buffer.from(
    hkdfSync(
      "sha256",
      getEncryptionSecret(),
      "gra-e-voting",
      `gra-e-voting:${purpose}`,
      32,
    ),
  );
}

export function normalizeVoterName(name: string) {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function normalizePhoneNumber(phone: string) {
  return phone.trim().replace(/[\s().-]/g, "");
}

export function encryptVoterField(value: string, purpose: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(`field:${purpose}`), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptVoterField(value: string, purpose: string) {
  const [version, ivValue, tagValue, ciphertextValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Encrypted data has an unsupported format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(`field:${purpose}`),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function createVoterIdentityLookupHash(name: string, phone: string) {
  const identity = JSON.stringify([
    normalizeVoterName(name),
    normalizePhoneNumber(phone),
  ]);
  return createHmac("sha256", deriveKey("identity-lookup"))
    .update(identity, "utf8")
    .digest("hex");
}

export function createVoterNameLookupHash(name: string) {
  return createHmac("sha256", deriveKey("identity-lookup"))
    .update(JSON.stringify([normalizeVoterName(name)]), "utf8")
    .digest("hex");
}

export function createNominationLookupHash(
  name: string,
  email: string,
  phone: string,
) {
  const identity = JSON.stringify([
    normalizeVoterName(name),
    email.trim().normalize("NFKC").toLocaleLowerCase("en"),
    normalizePhoneNumber(phone),
  ]);
  return createHmac("sha256", deriveKey("nomination-lookup"))
    .update(identity, "utf8")
    .digest("hex");
}