import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedJson } from "@/lib/auth/server";
import { listJobs } from "@/lib/store";

export async function GET() {
  if (!(await getSessionUser())) return unauthorizedJson();
  const jobs = await listJobs();
  return NextResponse.json({ jobs });
}
