import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedJson } from "@/lib/auth/server";
import { getTripoProvider } from "@/lib/tripo/TripoProvider";

export async function GET() {
  if (!(await getSessionUser())) return unauthorizedJson();
  const balance = await getTripoProvider().getBalance();
  return NextResponse.json(balance);
}
