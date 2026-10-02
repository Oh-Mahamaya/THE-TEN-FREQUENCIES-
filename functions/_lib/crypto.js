// HMAC-SHA256 helpers using the Web Crypto API (built into the Workers
// runtime — no npm dependency needed).

export async function hmacSHA256Hex(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time-ish compare (good enough here — both strings are fixed-length hex)
export function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// Workers KV has no built-in expiring-link feature (unlike Bunny/R2 presigned
// URLs), so the Worker gates access itself with a signed, expiring token.
// Token = base64url(key) . expiryUnixSeconds . hmacHex
export async function buildDownloadToken(env, fileKey, ttlSeconds = 60 * 60 * 48) {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${fileKey}.${expiry}`;
  const sig = await hmacSHA256Hex(payload, env.DOWNLOAD_SIGNING_SECRET);
  const encodedKey = btoa(fileKey).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encodedKey}.${expiry}.${sig}`;
}

export async function verifyDownloadToken(env, token) {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false };
  const [encodedKey, expiryStr, sig] = parts;
  const expiry = parseInt(expiryStr, 10);
  if (!expiry || Date.now() / 1000 > expiry) return { valid: false, reason: "expired" };

  let fileKey;
  try {
    const padded = encodedKey.replace(/-/g, "+").replace(/_/g, "/");
    fileKey = atob(padded);
  } catch {
    return { valid: false, reason: "bad-key" };
  }

  const expected = await hmacSHA256Hex(`${fileKey}.${expiry}`, env.DOWNLOAD_SIGNING_SECRET);
  if (!timingSafeEqual(expected, sig)) return { valid: false, reason: "bad-signature" };

  return { valid: true, fileKey };
}
