import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedJson } from "@/lib/auth/server";
import { createId } from "@/lib/ids";
import { listKas, monthKasSummary, saveKas } from "@/lib/store";
import { KAS_CATEGORIES, KAS_TYPES, type KasCategory, type KasType } from "@/lib/types";

export async function GET() {
  if (!(await getSessionUser())) return unauthorizedJson();
  const [entries, month] = await Promise.all([listKas(), monthKasSummary()]);
  return NextResponse.json({ entries, month });
}

export async function POST(request: Request) {
  if (!(await getSessionUser())) return unauthorizedJson();
  const body = (await request.json()) as {
    date?: string;
    type?: KasType;
    category?: KasCategory;
    amount_idr?: number;
    job_id?: string | null;
    notes?: string;
  };
  if (!body.type || !KAS_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "Tipe kas in/out" }, { status: 400 });
  }
  if (!body.category || !KAS_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
  }
  const amount = Number(body.amount_idr);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Nominal harus > 0" }, { status: 400 });
  }
  const entry = await saveKas({
    id: createId("kas"),
    date: body.date ? new Date(body.date).toISOString() : new Date().toISOString(),
    type: body.type,
    category: body.category,
    amount_idr: Math.round(amount),
    job_id: body.job_id || null,
    notes: body.notes?.trim() ?? "",
  });
  return NextResponse.json({ entry });
}
