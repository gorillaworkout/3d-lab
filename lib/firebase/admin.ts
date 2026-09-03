import { firebaseAdminConfig, isFirebaseAdminConfigured } from "@/lib/env";

type AdminNs = typeof import("firebase-admin");

let adminMod: AdminNs | null = null;

export async function getFirebaseAdmin(): Promise<AdminNs | null> {
  if (!isFirebaseAdminConfigured()) return null;
  if (adminMod) return adminMod;
  const admin = await import("firebase-admin");
  if (!admin.apps.length) {
    const cfg = firebaseAdminConfig();
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: cfg.projectId,
        clientEmail: cfg.clientEmail,
        privateKey: cfg.privateKey,
      }),
      storageBucket: cfg.storageBucket || undefined,
    });
  }
  adminMod = admin;
  return admin;
}

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<{ uid: string; email: string } | null> {
  const admin = await getFirebaseAdmin();
  if (admin) {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return { uid: decoded.uid, email: (decoded.email ?? "").toLowerCase() };
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) return null;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  const json = (await res.json()) as {
    users?: Array<{ localId?: string; email?: string }>;
    error?: { message?: string };
  };
  const user = json.users?.[0];
  if (!res.ok || !user?.localId) return null;
  return { uid: user.localId, email: (user.email ?? "").toLowerCase() };
}
