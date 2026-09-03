"use client";

import { useState } from "react";
import type { AppSettings } from "@/lib/types";

export function SettingsForm({ initial }: { initial: AppSettings }) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  return (
    <form
      className="panel grid max-w-xl gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        try {
          const res = await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          const json = (await res.json()) as { settings?: AppSettings; error?: string };
          if (!res.ok || !json.settings) throw new Error(json.error || "Gagal simpan");
          setForm(json.settings);
          setSaved(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Gagal simpan");
        } finally {
          setPending(false);
        }
      }}
    >
      <Field
        label="Harga filament / kg (IDR)"
        value={form.filament_price_per_kg}
        onChange={(n) => set("filament_price_per_kg", n)}
      />
      <Field
        label="Biaya mesin / jam (IDR)"
        value={form.machine_cost_per_hour}
        onChange={(n) => set("machine_cost_per_hour", n)}
      />
      <Field label="Packing (IDR)" value={form.packing_cost} onChange={(n) => set("packing_cost", n)} />
      <Field label="Markup (× HPP)" value={form.markup} step="0.1" onChange={(n) => set("markup", n)} />
      <Field label="USD → IDR" value={form.usd_idr} onChange={(n) => set("usd_idr", n)} />
      <Field label="Default infill %" value={form.default_infill} onChange={(n) => set("default_infill", n)} />
      <Field
        label="Default support factor"
        value={form.default_support_factor}
        step="0.05"
        onChange={(n) => set("default_support_factor", n)}
      />
      <label className="text-sm">
        Lantai harga jual (opsional)
        <input
          className="field mt-1"
          type="number"
          min={0}
          value={form.min_sell_price ?? ""}
          onChange={(e) =>
            set("min_sell_price", e.target.value === "" ? null : Number(e.target.value))
          }
        />
      </label>
      <div>
        <button className="btn btn-accent" disabled={pending} type="submit">
          Simpan pengaturan
        </button>
        {saved ? <span className="ml-3 text-sm text-[var(--ok)]">Tersimpan</span> : null}
        {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: string;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        className="field mt-1"
        type="number"
        step={step ?? "1"}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        required
      />
    </label>
  );
}
