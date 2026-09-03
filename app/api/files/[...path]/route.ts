import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedJson } from "@/lib/auth/server";
import { readStoredFile } from "@/lib/store";

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!(await getSessionUser())) return unauthorizedJson();
  const { path } = await ctx.params;
  const rel = path.map(decodeURIComponent).join("/");
  if (rel.includes("..")) {
    return NextResponse.json({ error: "Path tidak valid" }, { status: 400 });
  }
  const file = await readStoredFile(rel);
  if (!file) return NextResponse.json({ error: "Tidak ada" }, { status: 404 });
  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
