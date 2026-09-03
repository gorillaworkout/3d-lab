export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requirePageUser } from "@/lib/page-guard";
import { formatDateTime, formatIdr, formatNumber } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/labels";
import { listJobs, monthKasSummary } from "@/lib/store";
import { getTripoProvider } from "@/lib/tripo/TripoProvider";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const [jobs, month, credits] = await Promise.all([
    listJobs(),
    monthKasSummary(),
    getTripoProvider().getBalance(),
  ]);
  const recent = jobs.slice(0, 8);

  return (
    <AppShell user={user} pathname="/">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Dasbor</h1>
          <p className="muted text-sm">Job terbaru, sisa kredit, kas bulan ini.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="panel p-4">
            <div className="muted text-xs">Sisa kredit Tripo</div>
            <div className="mt-1 text-2xl font-semibold">
              {credits.available ? formatNumber(credits.balance, 2) : "—"}
            </div>
            <div className="muted mt-1 text-xs">
              {credits.mock
                ? "Saldo MOCK"
                : credits.message || (credits.frozen ? `Beku ${formatNumber(credits.frozen, 2)}` : "Live API")}
            </div>
          </div>
          <div className="panel p-4">
            <div className="muted text-xs">Kas bulan ini (net)</div>
            <div className="mt-1 text-2xl font-semibold">{formatIdr(month.net)}</div>
            <div className="muted mt-1 text-xs">
              Masuk {formatIdr(month.inn)} · Keluar {formatIdr(month.out)}
            </div>
          </div>
          <div className="panel p-4">
            <div className="muted text-xs">Total job</div>
            <div className="mt-1 text-2xl font-semibold">{jobs.length}</div>
            <Link href="/jobs/new" className="mt-2 inline-block text-sm text-[var(--accent-2)]">
              + Job baru
            </Link>
          </div>
        </div>

        <div className="panel overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="muted border-b border-[var(--border)]">
              <tr>
                <th className="px-3 py-2 font-medium">Job</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Gram (perkiraan)</th>
                <th className="px-3 py-2 font-medium">Harga usulan</th>
                <th className="px-3 py-2 font-medium">Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td className="muted px-3 py-6" colSpan={5}>
                    Belum ada job. Unggah foto di Job baru.
                  </td>
                </tr>
              ) : (
                recent.map((job) => (
                  <tr key={job.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">
                      <Link href={`/jobs/${job.id}`} className="text-[var(--accent-2)]">
                        {job.id}
                      </Link>
                      {job.repair_needed ? (
                        <span className="ml-2 text-xs text-[var(--danger)]">perlu perbaikan</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{STATUS_LABEL[job.status]}</td>
                    <td className="px-3 py-2">
                      {job.gram_estimasi != null ? `${formatNumber(job.gram_estimasi)} g` : "—"}
                    </td>
                    <td className="px-3 py-2">{formatIdr(job.harga_jual_usulan)}</td>
                    <td className="px-3 py-2">{formatDateTime(job.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
