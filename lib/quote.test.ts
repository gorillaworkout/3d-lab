import { describe, expect, it } from "vitest";
import {
  PLA_DENSITY_G_PER_CM3,
  computeQuote,
  estimateHoursFromVolumeCm3,
  tripoCostIdr,
} from "./quote";

describe("quote formula (PRD v0)", () => {
  it("uses PLA 1.24 g/cm³, infill, support, then HPP and markup floor", () => {
    const volume_cm3 = 8;
    const infill_pct = 20;
    const support_factor = 1.2;
    const expectedGrams =
      Math.round(volume_cm3 * (infill_pct / 100) * PLA_DENSITY_G_PER_CM3 * support_factor * 100) /
      100;
    expect(expectedGrams).toBe(2.38);

    const quote = computeQuote({
      volume_cm3,
      infill_pct,
      support_factor,
      filament_price_per_kg: 150_000,
      machine_cost_per_hour: 10_000,
      packing_cost: 5_000,
      markup: 3,
      min_sell_price: 20_000,
    });

    expect(quote.gram_estimasi).toBe(2.38);
    expect(quote.estimasi_jam).toBe(estimateHoursFromVolumeCm3(8));
    expect(quote.estimasi_jam).toBeCloseTo(8 / 15, 8);

    const filament = 2.38 * 150;
    const machine = quote.estimasi_jam * 10_000;
    const hpp = Math.round(filament + machine + 5_000);
    expect(quote.hpp).toBe(hpp);
    expect(quote.harga_jual_usulan).toBe(Math.round(Math.max(hpp * 3, 20_000)));
  });

  it("does not apply a zero/empty sell-price floor", () => {
    const quote = computeQuote({
      volume_cm3: 1,
      infill_pct: 100,
      support_factor: 1,
      filament_price_per_kg: 1000,
      machine_cost_per_hour: 0,
      packing_cost: 0,
      markup: 3,
      min_sell_price: null,
    });
    expect(quote.gram_estimasi).toBe(1.24);
    expect(quote.hpp).toBe(Math.round(1.24 * 1));
    expect(quote.harga_jual_usulan).toBe(Math.round(quote.hpp * 3));
  });

  it("converts Tripo credits at $0.01 each times usd_idr", () => {
    const { usd_cost, amount_idr } = tripoCostIdr(20, 16_200);
    expect(usd_cost).toBe(0.2);
    expect(amount_idr).toBe(3240);
  });
});
