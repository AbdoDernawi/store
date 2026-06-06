import { createHash, randomBytes, timingSafeEqual } from "crypto";

const HASH_PREFIX = "sha256";

export function hashWalletCode(code: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = digestWalletCode(code, salt);

  return `${HASH_PREFIX}:${salt}:${hash}`;
}

export function verifyWalletCode(code: string, storedHash: string | null | undefined) {
  const [prefix, salt, hash] = String(storedHash || "").split(":");

  if (prefix !== HASH_PREFIX || !salt || !hash) {
    return false;
  }

  const candidate = digestWalletCode(code, salt);
  const expectedBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = Buffer.from(candidate, "hex");

  return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
}

function digestWalletCode(code: string, salt: string) {
  return createHash("sha256")
    .update(`${salt}:${String(code || "").trim()}`)
    .digest("hex");
}
