import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedJson } from "@/lib/auth/server";
import { getJob, readStoredFile, saveJob, getSettings } from "@/lib/store";
import { repairAndVolume } from "@/lib/mesh/repair";
import { computeQuote } from "@/lib/quote";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  if (!(await getSessionUser())) return unauthorizedJson();
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "Job tidak ada" }, { status: 404 });
  if (!job.mesh_glb_url) {
    return NextResponse.json({ error: "Mesh belum siap" }, { status: 400 });
  }

  const body = (await request.json()) as {
    print_height_mm?: number;
    infill_pct?: number;
    support_factor?: number;
    gram_aktual?: number | null;
    notes?: string;
  };

  const settings = await getSettings();
  const print_height_mm = Number(body.print_height_mm);
  const infill_pct = Number(body.infill_pct ?? settings.default_infill);
  const support_factor = Number(body.support_factor ?? settings.default_support_factor);

  const rel = `jobs/${job.id}/model.glb`;
  let glb = (await readStoredFile(rel))?.buffer ?? null;
  if (!glb && job.mesh_glb_url && !job.mesh_glb_url.startsWith("/")) {
    const remote = await fetch(job.mesh_glb_url);
    if (remote.ok) glb = Buffer.from(await remote.arrayBuffer());
  }
  if (!glb) {
    return NextResponse.json(
      { error: "File GLB tidak ada. Generate ulang atau cek Storage." },
      { status: 400 },
    );
  }

  const repaired = await repairAndVolume(glb, print_height_mm);
  job.print_height_mm = print_height_mm;
  job.infill_pct = infill_pct;
  job.support_factor = support_factor;
  if (typeof body.notes === "string") job.notes = body.notes;
  if (typeof body.gram_aktual === "number" && Number.isFinite(body.gram_aktual)) {
    job.gram_aktual = body.gram_aktual;
  }

  if (!repaired.ok) {
    job.repair_needed = true;
    job.gram_estimasi = null;
    job.hpp = null;
    job.harga_jual_usulan = null;
    job.error_message = repaired.reason;
    await saveJob(job);
    return NextResponse.json({
      job,
      perkiraan: null,
      error: repaired.reason,
    });
  }

  const quote = computeQuote({
    volume_cm3: repaired.volume_cm3,
    infill_pct,
    support_factor,
    filament_price_per_kg: settings.filament_price_per_kg,
    machine_cost_per_hour: settings.machine_cost_per_hour,
    packing_cost: settings.packing_cost,
    markup: settings.markup,
    min_sell_price: settings.min_sell_price,
  });

  job.repair_needed = false;
  job.gram_estimasi = quote.gram_estimasi;
  job.hpp = quote.hpp;
  job.harga_jual_usulan = quote.harga_jual_usulan;
  if (job.status === "failed") job.status = "done";
  await saveJob(job);

  return NextResponse.json({
    job,
    perkiraan: {
      ...quote,
      label: "perkiraan",
    },
  });
}
