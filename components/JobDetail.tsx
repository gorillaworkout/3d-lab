"use client";

import { useEffect, useState } from "react";
import { MeshPreview } from "@/components/MeshPreview";
import { formatIdr, formatNumber } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/labels";
import type { AppSettings, Job } from "@/lib/types";

export function JobDetail({ initial, settings }: { initial: Job; settings: AppSettings }) {
  const [job, setJob] = useState(initial);
  const [height, setHeight] = useState(job.print_height_mm ?? 50);
  const [infill, setInfill] = useState(job.infill_pct ?? settings.default_infill);
  const [support, setSupport] = useState(job.support_factor ?? settings.default_support_factor);
  const [aktual, setAktual] = useState(job.gram_aktual ?? "");
  const [notes, setNotes] = useState(job.notes);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (job.status !== "queued") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/jobs/${job.id}`, { cache: "no-store" });
      const json = (await res.json()) as { job?: Job };
      if (json.job) setJob(json.job);
    }, 2000);
    return () => clearInterval(t);
  }, [job.id, job.status]);

  async function quote(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          print_height_mm: Number(height),
          infill_pct: Number(infill),
          support_factor: Number(support),
          gram_aktual: aktual === "" ? null : Number(aktual),
          notes,
        }),
      });
      const json = (await res.json()) as { job?: Job; error?: string };
      if (json.job) setJob(json.job);
      if (!res.ok || json.error) setError(json.error || "Quote gagal");
    } finally {
      setPending(false);
    }
  }

  async function patch(body: Partial<Job>) {
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { job?: Job };
    if (json.job) setJob(json.job);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="muted text-xs uppercase tracking-wider">Job</div>
          <h1 className="text-2xl font-semibold">{job.id}</h1>
          <div className="muted mt-1 text-sm">
            Status: {STATUS_LABEL[job.status]}
            {job.mock ? " · MOCK" : ""}
            {job.repair_needed ? " · Perlu perbaikan" : ""}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn" type="button" onClick={() => patch({ status: "printed" })}>
            Tandai sudah dicetak
          </button>
          <button className="btn btn-danger" type="button" onClick={() => patch({ status: "dibuang" })}>
            Buang
          </button>
        </div>
      </div>

      {job.status === "queued" ? (
        <div className="panel px-4 py-3 text-sm">Generate masih berjalan. Halaman ini mem-poll task Tripo…</div>
      ) : null}
      {job.error_message ? (
        <div className="rounded-xl border border-[var(--border)] bg-[#1b1610] px-4 py-3 text-sm">
          {job.error_message}
        </div>
      ) : null}
      {job.repair_needed ? (
        <div className="rounded-xl border border-[#6a2c24] bg-[#2a1210] px-4 py-3 text-sm text-[#ffc7c0]">
          Perlu perbaikan — gram/HPP tidak diisi dengan angka palsu.
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          {job.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.image_url}
              alt="Foto sumber"
              className="panel max-h-64 w-full object-contain p-2"
            />
          ) : null}
          {job.mesh_glb_url ? <MeshPreview url={job.mesh_glb_url} mock={job.mock} /> : null}
          <div className="flex gap-2">
            {job.mesh_glb_url ? (
              <a className="btn" href={job.mesh_glb_url} download>
                Unduh GLB
              </a>
            ) : null}
            {job.mesh_stl_url ? (
              <a className="btn" href={job.mesh_stl_url} download>
                Unduh STL
              </a>
            ) : null}
          </div>
        </div>

        <form className="panel space-y-3 p-5" onSubmit={quote}>
          <div className="text-sm font-semibold">Parameter cetak · PLA</div>
          <label className="block text-sm">
            Tinggi target (mm)
            <input
              className="field mt-1"
              type="number"
              min={1}
              step="0.1"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              required
            />
          </label>
          <label className="block text-sm">
            Infill %
            <input
              className="field mt-1"
              type="number"
              min={1}
              max={100}
              value={infill}
              onChange={(e) => setInfill(Number(e.target.value))}
              required
            />
          </label>
          <label className="block text-sm">
            Support factor
            <input
              className="field mt-1"
              type="number"
              min={1}
              step="0.05"
              value={support}
              onChange={(e) => setSupport(Number(e.target.value))}
              required
            />
          </label>
          <label className="block text-sm">
            Gram aktual (opsional, setelah ditimbang)
            <input
              className="field mt-1"
              type="number"
              min={0}
              step="0.01"
              value={aktual}
              onChange={(e) => setAktual(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            Catatan
            <textarea className="field mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button className="btn btn-accent" disabled={pending || !job.mesh_glb_url} type="submit">
            Hitung perkiraan
          </button>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3 text-sm">
            <Stat label="Gram estimasi (perkiraan)" value={`${formatNumber(job.gram_estimasi)} g`} />
            <Stat label="HPP (perkiraan)" value={formatIdr(job.hpp)} />
            <Stat label="Harga jual usulan (perkiraan)" value={formatIdr(job.harga_jual_usulan)} />
            <Stat label="Kredit terpakai" value={formatNumber(job.credits_consumed, 2)} />
            <Stat label="USD cost" value={job.usd_cost ? `$${formatNumber(job.usd_cost)}` : "—"} />
            <Stat label="Gram aktual" value={job.gram_aktual != null ? `${formatNumber(job.gram_aktual)} g` : "—"} />
          </div>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted text-xs">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
