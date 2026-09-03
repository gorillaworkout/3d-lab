import { createId } from "@/lib/ids";
import { meshToBinaryStl } from "@/lib/mesh/stl";
import { parseGlbMesh } from "@/lib/mesh/glb";
import { getTripoProvider, MissingTripoKeyError, type TripoTask } from "@/lib/tripo/TripoProvider";
import { getJob, getSettings, listKas, saveFile, saveJob, saveKas } from "@/lib/store";
import { tripoCostIdr } from "@/lib/quote";
import type { Job } from "@/lib/types";

export function newJobDraft(): Job {
  const now = new Date().toISOString();
  return {
    id: createId("job"),
    created_at: now,
    image_url: null,
    mesh_glb_url: null,
    mesh_stl_url: null,
    tripo_task_id: null,
    credits_consumed: 0,
    usd_cost: 0,
    status: "queued",
    print_height_mm: null,
    infill_pct: null,
    support_factor: null,
    gram_estimasi: null,
    gram_aktual: null,
    hpp: null,
    harga_jual_usulan: null,
    notes: "",
    repair_needed: false,
    error_message: null,
    mock: false,
    material: "PLA",
  };
}

export async function startGeneration(job: Job, image: Buffer, filename: string, mime: string) {
  const provider = getTripoProvider();
  try {
    const task = await provider.imageToModel({ image, filename, mime });
    job.tripo_task_id = task.task_id;
    job.status = "queued";
    job.mock = task.mock;
    job.error_message = null;
    await saveJob(job);
    return job;
  } catch (error) {
    if (error instanceof MissingTripoKeyError) {
      job.status = "failed";
      job.error_message = error.message;
      job.credits_consumed = 0;
      job.usd_cost = 0;
      await saveJob(job);
      return job;
    }
    job.status = "failed";
    job.error_message = error instanceof Error ? error.message : "Generate gagal";
    await saveJob(job);
    return job;
  }
}

export async function syncGeneration(job: Job): Promise<Job> {
  if (job.status !== "queued" || !job.tripo_task_id) return job;
  const provider = getTripoProvider();
  let task: TripoTask;
  try {
    task = await provider.getTask(job.tripo_task_id);
  } catch (error) {
    if (error instanceof MissingTripoKeyError) {
      job.status = "failed";
      job.error_message = error.message;
      await saveJob(job);
      return job;
    }
    throw error;
  }

  if (task.status === "queued" || task.status === "running") {
    return job;
  }

  if (task.status === "failed" || task.status === "cancelled") {
    job.status = "failed";
    job.credits_consumed = task.credits_consumed;
    job.error_message = task.error || "Generate gagal";
    if (task.credits_consumed > 0) {
      await recordTripoExpense(job, task.credits_consumed);
    }
    await saveJob(job);
    return job;
  }

  if (task.status !== "success") return job;

  try {
    const glb = await provider.downloadModel(task.model_url || "");
    parseGlbMesh(glb);
    const stl = meshToBinaryStl(parseGlbMesh(glb));
    job.mesh_glb_url = await saveFile(`jobs/${job.id}/model.glb`, glb, "model/gltf-binary");
    job.mesh_stl_url = await saveFile(`jobs/${job.id}/model.stl`, stl, "model/stl");
    job.credits_consumed = task.credits_consumed;
    job.mock = task.mock;
    job.status = "done";
    job.error_message = task.mock ? "MESH MOCK — bukan hasil Tripo. Label cube 20mm." : null;
    if (task.credits_consumed > 0) {
      await recordTripoExpense(job, task.credits_consumed);
    }
    await saveJob(job);
    return job;
  } catch (error) {
    job.status = "failed";
    job.credits_consumed = task.credits_consumed;
    job.error_message = error instanceof Error ? error.message : "Gagal simpan mesh";
    if (task.credits_consumed > 0) {
      await recordTripoExpense(job, task.credits_consumed);
    }
    await saveJob(job);
    return job;
  }
}

async function recordTripoExpense(job: Job, credits: number) {
  if (credits <= 0) return;
  const existing = (await listKas()).some(
    (e) => e.job_id === job.id && e.category === "api_tripo",
  );
  if (existing) return;
  const latest = await getJob(job.id);
  if (latest && latest.usd_cost > 0) return;
  const settings = await getSettings();
  const { usd_cost, amount_idr } = tripoCostIdr(credits, settings.usd_idr);
  job.usd_cost = usd_cost;
  await saveKas({
    id: createId("kas"),
    date: new Date().toISOString(),
    type: "out",
    category: "api_tripo",
    amount_idr,
    job_id: job.id,
    notes: job.mock
      ? `MOCK Tripo generate (${credits} kredit)`
      : `Tripo generate (${credits} kredit)`,
  });
}

export async function refreshJob(id: string): Promise<Job | null> {
  const job = await getJob(id);
  if (!job) return null;
  return syncGeneration(job);
}
