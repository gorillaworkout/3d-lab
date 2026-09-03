/** PLA density from PRD v0 (g/cm³). */
export const PLA_DENSITY_G_PER_CM3 = 1.24;

export type QuoteInput = {
  volume_cm3: number;
  infill_pct: number;
  support_factor: number;
  filament_price_per_kg: number;
  machine_cost_per_hour: number;
  packing_cost: number;
  markup: number;
  min_sell_price?: number | null;
};

export type QuoteResult = {
  volume_cm3: number;
  gram_estimasi: number;
  estimasi_jam: number;
  hpp: number;
  harga_jual_usulan: number;
};

/** v0: rough hours from volume, not G-code. ~15 cm³/jam, minimum 15 menit. */
export function estimateHoursFromVolumeCm3(volumeCm3: number): number {
  if (!Number.isFinite(volumeCm3) || volumeCm3 <= 0) return 0;
  return Math.max(0.25, volumeCm3 / 15);
}

export function roundGrams(n: number): number {
  return Math.round(n * 100) / 100;
}

export function roundIdr(n: number): number {
  return Math.round(n);
}

export function computeQuote(input: QuoteInput): QuoteResult {
  const volume_cm3 = input.volume_cm3;
  const gram_estimasi = roundGrams(
    volume_cm3 *
      (input.infill_pct / 100) *
      PLA_DENSITY_G_PER_CM3 *
      input.support_factor,
  );
  const estimasi_jam = estimateHoursFromVolumeCm3(volume_cm3);
  const filament_price_per_g = input.filament_price_per_kg / 1000;
  const hpp = roundIdr(
    gram_estimasi * filament_price_per_g +
      estimasi_jam * input.machine_cost_per_hour +
      input.packing_cost,
  );
  const marked = hpp * input.markup;
  const floor =
    input.min_sell_price && input.min_sell_price > 0 ? input.min_sell_price : 0;
  const harga_jual_usulan = roundIdr(Math.max(marked, floor));
  return { volume_cm3, gram_estimasi, estimasi_jam, hpp, harga_jual_usulan };
}

export function tripoCostIdr(creditsConsumed: number, usdIdr: number): {
  usd_cost: number;
  amount_idr: number;
} {
  const usd_cost = Math.round(creditsConsumed * 0.01 * 100) / 100;
  return { usd_cost, amount_idr: roundIdr(creditsConsumed * 0.01 * usdIdr) };
}
