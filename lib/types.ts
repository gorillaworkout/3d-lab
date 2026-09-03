export const JOB_STATUSES = [
  "queued",
  "done",
  "failed",
  "printed",
  "dibuang",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export type Job = {
  id: string;
  created_at: string;
  image_url: string | null;
  mesh_glb_url: string | null;
  mesh_stl_url: string | null;
  tripo_task_id: string | null;
  credits_consumed: number;
  usd_cost: number;
  status: JobStatus;
  print_height_mm: number | null;
  infill_pct: number | null;
  support_factor: number | null;
  gram_estimasi: number | null;
  gram_aktual: number | null;
  hpp: number | null;
  harga_jual_usulan: number | null;
  notes: string;
  repair_needed: boolean;
  error_message: string | null;
  mock: boolean;
  material: "PLA";
};

export const KAS_TYPES = ["in", "out"] as const;
export type KasType = (typeof KAS_TYPES)[number];

export const KAS_CATEGORIES = [
  "api_tripo",
  "filament",
  "listrik",
  "packing",
  "penjualan",
  "lain",
] as const;
export type KasCategory = (typeof KAS_CATEGORIES)[number];

export type KasEntry = {
  id: string;
  date: string;
  type: KasType;
  category: KasCategory;
  amount_idr: number;
  job_id: string | null;
  notes: string;
};

export type AppSettings = {
  filament_price_per_kg: number;
  machine_cost_per_hour: number;
  packing_cost: number;
  markup: number;
  usd_idr: number;
  default_infill: number;
  default_support_factor: number;
  min_sell_price: number | null;
};

export const DEFAULT_SETTINGS: AppSettings = {
  filament_price_per_kg: 150_000,
  machine_cost_per_hour: 10_000,
  packing_cost: 5_000,
  markup: 3,
  usd_idr: 16_200,
  default_infill: 20,
  default_support_factor: 1.2,
  min_sell_price: null,
};

export type SessionUser = {
  uid: string;
  email: string;
  mode: "firebase" | "dev";
};
