export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function hasTripoKey(): boolean {
  return Boolean(process.env.TRIPO_API_KEY?.trim());
}

export function isMockTripoEnabled(): boolean {
  return process.env.MOCK_TRIPO === "1";
}

export function isDevAuthBypassEnabled(): boolean {
  return process.env.DEV_AUTH_BYPASS === "1" && !isProduction();
}

import { isFirebaseClientConfigured } from "./env-public";

export { firebaseClientConfig, isFirebaseClientConfigured } from "./env-public";

export function firebaseAdminConfig() {
  return {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ?? "",
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() ?? "",
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
      "",
  };
}

export function isFirebaseAdminConfigured(): boolean {
  const c = firebaseAdminConfig();
  return Boolean(c.projectId && c.clientEmail && c.privateKey.includes("BEGIN"));
}

export function sessionSecret(): string {
  const explicit = process.env.SESSION_SECRET?.trim();
  if (explicit) return explicit;
  if (!isProduction()) return "dev-session-secret-not-for-production";
  const pid = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (pid) return `3d-lab-session/${pid}`;
  return "";
}

export function adminEmailAllowlist(): string | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return email || null;
}

export function publicRuntimeFlags() {
  return {
    firebaseConfigured: isFirebaseClientConfigured(),
    firebaseAdminConfigured: isFirebaseAdminConfigured(),
    tripoConfigured: hasTripoKey(),
    mockTripo: isMockTripoEnabled(),
    devAuthBypass: isDevAuthBypassEnabled(),
    production: isProduction(),
  };
}
