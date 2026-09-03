"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewJobForm({ needTripoKey }: { needTripoKey: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="panel space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) {
          setError("Unggah 1 foto JPG/PNG");
          return;
        }
        setPending(true);
        setError(null);
        try {
          const body = new FormData();
          body.append("image", file);
          const res = await fetch("/api/generate", { method: "POST", body });
          const json = (await res.json()) as { job?: { id: string }; error?: string };
          if (!res.ok || !json.job) {
            throw new Error(json.error || "Generate gagal");
          }
          router.push(`/jobs/${json.job.id}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Generate gagal");
        } finally {
          setPending(false);
        }
      }}
    >
      {needTripoKey ? (
        <div className="rounded-xl border border-[#6a2c24] bg-[#2a1210] px-4 py-3 text-sm text-[#ffc7c0]">
          Butuh TRIPO_API_KEY di environment server. Tanpa kunci, generate live ditolak.
          Set <code>MOCK_TRIPO=1</code> untuk mesh kubus palsu yang berlabel.
        </div>
      ) : null}

      <label className="block text-sm">
        Foto referensi (1 file, JPG/PNG)
        <input
          className="field mt-2"
          type="file"
          accept="image/jpeg,image/png"
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            setFile(next);
            setPreview(next ? URL.createObjectURL(next) : null);
          }}
        />
      </label>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Preview unggahan" className="max-h-56 rounded-lg border border-[var(--border)]" />
      ) : null}

      <button className="btn btn-accent" disabled={pending} type="submit">
        {pending ? "Mengirim ke Tripo…" : "Generate 3D (tanpa tekstur)"}
      </button>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <p className="muted text-xs">
        Image-to-3D H3 <code>v3.1-20260211</code>, <code>texture: false</code>. Sekitar 20
        kredit ≈ $0.20 jika API memotong kredit.
      </p>
    </form>
  );
}
