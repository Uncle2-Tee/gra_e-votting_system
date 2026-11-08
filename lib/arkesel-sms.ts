import "server-only";

import { normalizePhoneNumber } from "@/lib/voter-data-crypto";

function formatRecipient(phone: string) {
  const digits = normalizePhoneNumber(phone).replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) {
    return `233${digits.slice(1)}`;
  }
  if (digits.length < 7 || digits.length > 15) {
    throw new Error("Arkesel recipient phone number is invalid.");
  }
  return digits;
}

export async function sendArkeselSms(recipients: string[], message: string) {
  const apiKey = process.env.ARKESEL_API_KEY;
  const sender = process.env.ARKESEL_SENDER_ID;
  if (!apiKey || !sender) {
    throw new Error("Arkesel is not configured.");
  }
  if (recipients.length === 0 || !message.trim()) {
    throw new Error("Arkesel SMS requires recipients and a message.");
  }

  const response = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender,
      message,
      recipients: recipients.map(formatRecipient),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Arkesel rejected the SMS request (${response.status}).`);
  }
}
