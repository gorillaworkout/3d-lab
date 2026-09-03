import type { JobStatus, KasCategory, KasType } from "./types";

export const STATUS_LABEL: Record<JobStatus, string> = {
  queued: "Antrian",
  done: "Selesai",
  failed: "Gagal",
  printed: "Sudah dicetak",
  dibuang: "Dibuang",
};

export const KAS_TYPE_LABEL: Record<KasType, string> = {
  in: "Masuk",
  out: "Keluar",
};

export const KAS_CATEGORY_LABEL: Record<KasCategory, string> = {
  api_tripo: "API Tripo",
  filament: "Filament",
  listrik: "Listrik",
  packing: "Packing",
  penjualan: "Penjualan",
  lain: "Lainnya",
};
