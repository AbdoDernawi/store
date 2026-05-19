import type { AppRole, AuthSession, AuthUser } from "@/types/auth";

export const SESSION_COOKIE_NAME = "store_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: string;
  phone: string;
  full_name: string;
  role: AppRole;
  iat: number;
  exp: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getAuthSecret() {
  return process.env.AUTH_JWT_SECRET || process.env.QR_SECRET_KEY || "";
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeText(value: string) {
  return base64UrlEncode(encoder.encode(value));
}

function base64UrlDecodeText(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return decoder.decode(bytes);
}

async function createSignature(data: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));

  return base64UrlEncode(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

function payloadToSession(payload: SessionPayload): AuthSession {
  return {
    id: payload.sub,
    phone: payload.phone,
    fullName: payload.full_name,
    role: payload.role,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  };
}

export async function signSession(user: AuthUser) {
  const secret = getAuthSecret();

  if (!secret) {
    throw new Error("AUTH_JWT_SECRET is not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload: SessionPayload = {
    sub: user.id,
    phone: user.phone,
    full_name: user.fullName,
    role: user.role,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const unsigned = `${base64UrlEncodeText(JSON.stringify(header))}.${base64UrlEncodeText(
    JSON.stringify(payload),
  )}`;
  const signature = await createSignature(unsigned, secret);

  return `${unsigned}.${signature}`;
}

export async function verifySession(token?: string | null) {
  const secret = getAuthSecret();

  if (!token || !secret) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = await createSignature(unsigned, secret);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecodeText(encodedPayload)) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.sub || !payload.phone || !payload.role || payload.exp <= now) {
      return null;
    }

    return payloadToSession(payload);
  } catch {
    return null;
  }
}
