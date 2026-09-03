/** Isolates 3d-lab data when sharing a Firebase project with JastipdiGW. */
export const FIREBASE_APP_PREFIX = "3dlab";

export const FIRESTORE_COLLECTIONS = {
  jobs: `${FIREBASE_APP_PREFIX}_jobs`,
  kas: `${FIREBASE_APP_PREFIX}_kas`,
  settings: `${FIREBASE_APP_PREFIX}_settings`,
} as const;

/** Storage object path. Local `.data/` file store keeps the raw relPath. */
export function firebaseStorageObjectPath(relPath: string): string {
  const normalized = relPath.replace(/^\/+/, "");
  const prefix = `${FIREBASE_APP_PREFIX}/`;
  if (normalized === FIREBASE_APP_PREFIX || normalized.startsWith(prefix)) {
    return normalized;
  }
  return `${prefix}${normalized}`;
}
