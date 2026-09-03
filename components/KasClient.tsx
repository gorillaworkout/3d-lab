"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime, formatIdr } from "@/lib/format";
import { KAS_CATEGORY_LABEL, KAS_TYPE_LABEL } from "@/lib/labels";
import { KAS_CATEGORIES, type KasCategory, type KasEntry, type KasType } from "@/lib/types";

export function KasClient({
  entries,
  month,
}: {
  entries: KasEntry[];
  month: { inn: number; out: number; net: number };
}) {
  const router = useRouter();
  const [type, setType] = useState<KasType>("out");
  const [category, setCategory] = useState<KasCategory>("filament");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [jobId, setJobId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Buku kas</h1>
        <p className="muted text-sm">Pemasukan boleh kosong di awal. Biaya Tripo tercatat otomatis jika kredit &gt; 0.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card label="Masuk bulan ini" value={formatIdr(month.inn)} />
        <Card label="Keluar bulan ini" value={formatIdr(month.out)} />
        <Card label="Net" value={formatIdr(month.net)} />
      </div>

      <form
        className="panel grid gap-3 p-5 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          try {
            const res = await fetch("/api/kas", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type,
                category,
                amount_idr: Number(amount),
                notes,
                job_id: jobId || null,
              }),
            });
            const json = (await res.json()) as { error?: string };
            if (!res.ok) throw new Error(json.error || "Gagal simpan");
            setAmount("");
            setNotes("");
            setJobId("");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal simpan");
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="text-sm">
          Tipe
          <select className="field mt-1" value={type} onChange={(e) => setType(e.target.value as KasType)}>
            <option value="in">Masuk</option>
            <option value="out">Keluar</option>
          </select>
        </label>
        <label className="text-sm">
          Kategori
          <select
            className="field mt-1"
            value={category}
            onChange={(e) => setCategory(e.target.value as KasCategory)}
          >
            {KAS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {KAS_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Nominal (IDR)
          <input
            className="field mt-1"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label className="text-sm">
          Job ID (opsional)
          <input className="field mt-1" value={jobId} onChange={(e) => setJobId(e.target.value)} />
        </label>
        <label className="text-sm md:col-span-2">
          Catatan
          <input className="field mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="md:col-span-2">
          <button className="btn btn-accent" disabled={pending} type="submit">
            Catat kas
          </button>
          {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
        </div>
      </form>

      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="muted border-b border-[var(--border)]">
            <tr>
              <th className="px-3 py-2 font-medium">Tanggal</th>
              <th className="px-3 py-2 font-medium">Tipe</th>
              <th className="px-3 py-2 font-medium">Kategori</th>
              <th className="px-3 py-2 font-medium">Nominal</th>
              <th className="px-3 py-2 font-medium">Job</th>
              <th className="px-3 py-2 font-medium">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td className="muted px-3 py-6" colSpan={6}>
                  Belum ada transaksi. Pemasukan boleh kosong.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">{formatDateTime(e.date)}</td>
                  <td className="px-3 py-2">{KAS_TYPE_LABEL[e.type]}</td>
                  <td className="px-3 py-2">{KAS_CATEGORY_LABEL[e.category]}</td>
                  <td className="px-3 py-2">{formatIdr(e.amount_idr)}</td>
                  <td className="px-3 py-2">{e.job_id ?? "—"}</td>
                  <td className="px-3 py-2">{e.notes || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <div className="muted text-xs">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
