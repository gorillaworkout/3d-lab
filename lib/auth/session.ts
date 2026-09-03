import type { SessionUser } from "@/lib/types";
import { sessionSecret } from "@/lib/env";

export const SESSION_COOKIE = "lab_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 5;

function bytesToB64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const raw = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(user: SessionUser): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error("SESSION_SECRET belum diset");
  const payload = {
    ...user,
    exp: Date.now() + TTL_MS,
  };
  const body = bytesToB64(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${bytesToB64(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  const secret = sessionSecret();
  if (!secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, b64ToBytes(sig), new TextEncoder().encode(body));
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64ToBytes(body))) as SessionUser & {
      exp?: number;
    };
    if (!payload.exp || payload.exp < Date.now()) return null;
    if (!payload.uid || !payload.email) return null;
    return { uid: payload.uid, email: payload.email, mode: payload.mode === "dev" ? "dev" : "firebase" };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: TTL_MS / 1000,
};
