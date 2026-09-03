import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedJson } from "@/lib/auth/server";
import { getJob, saveJob } from "@/lib/store";
import { refreshJob } from "@/lib/jobs/pipeline";
import { JOB_STATUSES, type JobStatus } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!(await getSessionUser())) return unauthorizedJson();
  const { id } = await ctx.params;
  const job = await refreshJob(id);
  if (!job) return NextResponse.json({ error: "Job tidak ada" }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await getSessionUser())) return unauthorizedJson();
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "Job tidak ada" }, { status: 404 });
  const body = (await request.json()) as {
    status?: JobStatus;
    notes?: string;
    gram_aktual?: number | null;
  };
  if (body.status) {
    if (!JOB_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }
    job.status = body.status;
  }
  if (typeof body.notes === "string") job.notes = body.notes;
  if (body.gram_aktual === null) job.gram_aktual = null;
  if (typeof body.gram_aktual === "number" && Number.isFinite(body.gram_aktual)) {
    job.gram_aktual = body.gram_aktual;
  }
  await saveJob(job);
  return NextResponse.json({ job });
}
