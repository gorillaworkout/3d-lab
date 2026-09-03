import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedJson } from "@/lib/auth/server";
import { getSettings, saveSettings } from "@/lib/store";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/types";

export async function GET() {
  if (!(await getSessionUser())) return unauthorizedJson();
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(request: Request) {
  if (!(await getSessionUser())) return unauthorizedJson();
  const body = (await request.json()) as Partial<AppSettings>;
  const current = await getSettings();
  const next: AppSettings = {
    filament_price_per_kg: num(body.filament_price_per_kg, current.filament_price_per_kg),
    machine_cost_per_hour: num(body.machine_cost_per_hour, current.machine_cost_per_hour),
    packing_cost: num(body.packing_cost, current.packing_cost),
    markup: num(body.markup, current.markup),
    usd_idr: num(body.usd_idr, current.usd_idr),
    default_infill: num(body.default_infill, current.default_infill),
    default_support_factor: num(body.default_support_factor, current.default_support_factor),
    min_sell_price:
      body.min_sell_price == null || body.min_sell_price === 0
        ? null
        : num(body.min_sell_price, current.min_sell_price ?? 0),
  };
  if (next.markup <= 0) next.markup = DEFAULT_SETTINGS.markup;
  return NextResponse.json({ settings: await saveSettings(next) });
}

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
