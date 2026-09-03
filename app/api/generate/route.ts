import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedJson } from "@/lib/auth/server";
import { saveFile, saveJob } from "@/lib/store";
import { newJobDraft, startGeneration } from "@/lib/jobs/pipeline";
import { MISSING_TRIPO_KEY_MESSAGE } from "@/lib/tripo/TripoProvider";

const ALLOWED = new Set(["image/jpeg", "image/png"]);

export async function POST(request: Request) {
  if (!(await getSessionUser())) return unauthorizedJson();
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Unggah 1 foto JPG/PNG" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Hanya JPG atau PNG" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "File terlalu besar (maks 12MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : "jpg";
  const job = newJobDraft();
  job.image_url = await saveFile(`jobs/${job.id}/photo.${ext}`, buffer, file.type);
  await saveJob(job);
  const updated = await startGeneration(job, buffer, file.name || `photo.${ext}`, file.type);

  if (updated.error_message === MISSING_TRIPO_KEY_MESSAGE) {
    return NextResponse.json(
      { job: updated, error: MISSING_TRIPO_KEY_MESSAGE },
      { status: 400 },
    );
  }

  return NextResponse.json({ job: updated });
}
