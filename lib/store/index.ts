import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_SETTINGS, type AppSettings, type Job, type KasEntry } from "@/lib/types";
import { isFirebaseAdminConfigured } from "@/lib/env";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const FILES_DIR = path.join(DATA_DIR, "files");

export type StoredFile = {
  buffer: Buffer;
  contentType: string;
};

type DbShape = {
  jobs: Job[];
  kas: KasEntry[];
  settings: AppSettings;
};

async function emptyDb(): Promise<DbShape> {
  return { jobs: [], kas: [], settings: { ...DEFAULT_SETTINGS } };
}

async function readDb(): Promise<DbShape> {
  try {
    const raw = await readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    return {
      jobs: parsed.jobs ?? [],
      kas: parsed.kas ?? [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return emptyDb();
  }
}

async function writeDb(db: DbShape): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

function publicFileUrl(relPath: string): string {
  return `/api/files/${relPath.split("/").map(encodeURIComponent).join("/")}`;
}

export async function listJobs(): Promise<Job[]> {
  if (isFirebaseAdminConfigured()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      const snap = await admin.firestore().collection("jobs").orderBy("created_at", "desc").get();
      return snap.docs.map((d) => d.data() as Job);
    }
  }
  const db = await readDb();
  return [...db.jobs].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getJob(id: string): Promise<Job | null> {
  if (isFirebaseAdminConfigured()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      const doc = await admin.firestore().collection("jobs").doc(id).get();
      return doc.exists ? (doc.data() as Job) : null;
    }
  }
  const db = await readDb();
  return db.jobs.find((j) => j.id === id) ?? null;
}

export async function saveJob(job: Job): Promise<Job> {
  if (isFirebaseAdminConfigured()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      await admin.firestore().collection("jobs").doc(job.id).set(job);
      return job;
    }
  }
  const db = await readDb();
  const idx = db.jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) db.jobs[idx] = job;
  else db.jobs.push(job);
  await writeDb(db);
  return job;
}

export async function listKas(): Promise<KasEntry[]> {
  if (isFirebaseAdminConfigured()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      const snap = await admin.firestore().collection("kas").orderBy("date", "desc").get();
      return snap.docs.map((d) => d.data() as KasEntry);
    }
  }
  const db = await readDb();
  return [...db.kas].sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveKas(entry: KasEntry): Promise<KasEntry> {
  if (isFirebaseAdminConfigured()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      await admin.firestore().collection("kas").doc(entry.id).set(entry);
      return entry;
    }
  }
  const db = await readDb();
  db.kas.push(entry);
  await writeDb(db);
  return entry;
}

export async function getSettings(): Promise<AppSettings> {
  if (isFirebaseAdminConfigured()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      const doc = await admin.firestore().collection("settings").doc("app").get();
      if (doc.exists) return { ...DEFAULT_SETTINGS, ...(doc.data() as AppSettings) };
    }
  }
  const db = await readDb();
  return db.settings;
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const next = { ...DEFAULT_SETTINGS, ...settings };
  if (isFirebaseAdminConfigured()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      await admin.firestore().collection("settings").doc("app").set(next);
      return next;
    }
  }
  const db = await readDb();
  db.settings = next;
  await writeDb(db);
  return next;
}

export async function saveFile(
  relPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  if (isFirebaseAdminConfigured()) {
    const admin = await getFirebaseAdmin();
    if (admin) {
      const bucket = admin.storage().bucket();
      const file = bucket.file(relPath);
      await file.save(buffer, { contentType, resumable: false });
      try {
        await file.makePublic();
        return file.publicUrl();
      } catch {
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
        });
        return url;
      }
    }
  }
  const abs = path.join(FILES_DIR, relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buffer);
  await writeFile(`${abs}.meta.json`, JSON.stringify({ contentType }));
  return publicFileUrl(relPath);
}

export async function readStoredFile(relPath: string): Promise<StoredFile | null> {
  try {
    const abs = path.join(FILES_DIR, relPath);
    const buffer = await readFile(abs);
    let contentType = "application/octet-stream";
    try {
      const meta = JSON.parse(await readFile(`${abs}.meta.json`, "utf8")) as { contentType?: string };
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      if (relPath.endsWith(".png")) contentType = "image/png";
      else if (relPath.endsWith(".jpg") || relPath.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (relPath.endsWith(".glb")) contentType = "model/gltf-binary";
      else if (relPath.endsWith(".stl")) contentType = "model/stl";
    }
    return { buffer, contentType };
  } catch {
    return null;
  }
}

export async function monthKasSummary(now = new Date()): Promise<{
  inn: number;
  out: number;
  net: number;
}> {
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const entries = await listKas();
  let inn = 0;
  let out = 0;
  for (const e of entries) {
    if (!e.date.startsWith(prefix)) continue;
    if (e.type === "in") inn += e.amount_idr;
    else out += e.amount_idr;
  }
  return { inn, out, net: inn - out };
}
