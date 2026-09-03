import { createCubeGlb } from "@/lib/mesh/glb";
import { hasTripoKey, isMockTripoEnabled } from "@/lib/env";

const TRIPO_BASE = "https://openapi.tripo3d.ai/v3";
const TRIPO_MODEL = "v3.1-20260211";

export const MISSING_TRIPO_KEY_MESSAGE = "Butuh TRIPO_API_KEY di environment server";

export type TripoTaskStatus = "queued" | "running" | "success" | "failed" | "cancelled";

export type TripoTask = {
  task_id: string;
  status: TripoTaskStatus;
  progress: number;
  model_url: string | null;
  credits_consumed: number;
  error: string | null;
  mock: boolean;
};

export type TripoBalance = {
  balance: number | null;
  frozen: number | null;
  available: boolean;
  mock: boolean;
  message?: string;
};

export type ImageToModelInput = {
  image: Buffer;
  filename: string;
  mime: string;
};

/**
 * Adapter so Meshy (or another engine) can replace Tripo later without UI changes.
 */
export interface TripoProvider {
  readonly name: "tripo" | "mock";
  imageToModel(input: ImageToModelInput): Promise<TripoTask>;
  getTask(taskId: string): Promise<TripoTask>;
  getBalance(): Promise<TripoBalance>;
  downloadModel(url: string): Promise<Buffer>;
}

const MOCK_DELAY_MS = 1200;

function mockCreatedAt(taskId: string): number {
  const raw = taskId.startsWith("mock_") ? taskId.slice(5) : "";
  const parsed = Number.parseInt(raw, 36);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class MissingTripoKeyError extends Error {
  constructor() {
    super(MISSING_TRIPO_KEY_MESSAGE);
    this.name = "MissingTripoKeyError";
  }
}

class MissingKeyProvider implements TripoProvider {
  readonly name = "tripo" as const;

  async imageToModel(): Promise<TripoTask> {
    throw new MissingTripoKeyError();
  }

  async getTask(): Promise<TripoTask> {
    throw new MissingTripoKeyError();
  }

  async getBalance(): Promise<TripoBalance> {
    return {
      balance: null,
      frozen: null,
      available: false,
      mock: false,
      message: MISSING_TRIPO_KEY_MESSAGE,
    };
  }

  async downloadModel(): Promise<Buffer> {
    throw new MissingTripoKeyError();
  }
}

class MockTripoProvider implements TripoProvider {
  readonly name = "mock" as const;

  async imageToModel(): Promise<TripoTask> {
    const task_id = `mock_${Date.now().toString(36)}`;
    return {
      task_id,
      status: "queued",
      progress: 0,
      model_url: null,
      credits_consumed: 0,
      error: null,
      mock: true,
    };
  }

  async getTask(taskId: string): Promise<TripoTask> {
    const elapsed = Date.now() - mockCreatedAt(taskId);
    if (elapsed < MOCK_DELAY_MS) {
      return {
        task_id: taskId,
        status: "running",
        progress: Math.min(90, Math.max(5, Math.round((elapsed / MOCK_DELAY_MS) * 100))),
        model_url: null,
        credits_consumed: 0,
        error: null,
        mock: true,
      };
    }
    return {
      task_id: taskId,
      status: "success",
      progress: 100,
      model_url: `mock://cube/${taskId}.glb`,
      credits_consumed: 20,
      error: null,
      mock: true,
    };
  }

  async getBalance(): Promise<TripoBalance> {
    return { balance: 980, frozen: 0, available: true, mock: true, message: "Saldo MOCK" };
  }

  async downloadModel(): Promise<Buffer> {
    return createCubeGlb(20);
  }
}

class LiveTripoProvider implements TripoProvider {
  readonly name = "tripo" as const;

  private get key(): string {
    const key = process.env.TRIPO_API_KEY?.trim();
    if (!key) throw new MissingTripoKeyError();
    return key;
  }

  private headers(json = false): HeadersInit {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.key}` };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
  }

  async imageToModel(input: ImageToModelInput): Promise<TripoTask> {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(input.image)], { type: input.mime }),
      input.filename,
    );
    const uploadRes = await fetch(`${TRIPO_BASE}/files`, {
      method: "POST",
      headers: this.headers(),
      body: form,
    });
    const uploadJson = (await uploadRes.json()) as {
      code?: number;
      data?: { file_token?: string };
      message?: string;
    };
    const token = uploadJson.data?.file_token;
    if (!uploadRes.ok || !token) {
      throw new Error(uploadJson.message || "Gagal unggah gambar ke Tripo");
    }

    const genRes = await fetch(`${TRIPO_BASE}/generation/image-to-model`, {
      method: "POST",
      headers: this.headers(true),
      body: JSON.stringify({
        input: token,
        model: TRIPO_MODEL,
        texture: false,
        pbr: false,
      }),
    });
    const genJson = (await genRes.json()) as {
      code?: number;
      data?: { task_id?: string };
      message?: string;
    };
    const task_id = genJson.data?.task_id;
    if (!genRes.ok || !task_id) {
      throw new Error(genJson.message || "Gagal membuat task image-to-model");
    }
    return {
      task_id,
      status: "queued",
      progress: 0,
      model_url: null,
      credits_consumed: 0,
      error: null,
      mock: false,
    };
  }

  async getTask(taskId: string): Promise<TripoTask> {
    const res = await fetch(`${TRIPO_BASE}/tasks/${taskId}`, { headers: this.headers() });
    const json = (await res.json()) as {
      code?: number;
      message?: string;
      data?: {
        task_id?: string;
        status?: string;
        progress?: number;
        credits_consumed?: number;
        output?: { model_url?: string };
      };
    };
    if (!res.ok || !json.data) {
      return {
        task_id: taskId,
        status: "failed",
        progress: 0,
        model_url: null,
        credits_consumed: 0,
        error: json.message || "Gagal membaca task Tripo",
        mock: false,
      };
    }
    const raw = (json.data.status ?? "queued").toLowerCase();
    const status: TripoTaskStatus =
      raw === "success"
        ? "success"
        : raw === "failed" || raw === "error"
          ? "failed"
          : raw === "cancelled"
            ? "cancelled"
            : raw === "running" || raw === "processing"
              ? "running"
              : "queued";
    return {
      task_id: json.data.task_id ?? taskId,
      status,
      progress: json.data.progress ?? 0,
      model_url: json.data.output?.model_url ?? null,
      credits_consumed: Number(json.data.credits_consumed ?? 0),
      error: status === "failed" ? json.message || "Generate gagal" : null,
      mock: false,
    };
  }

  async getBalance(): Promise<TripoBalance> {
    try {
      const res = await fetch(`${TRIPO_BASE}/account/balance`, { headers: this.headers() });
      const json = (await res.json()) as {
        data?: { balance?: number; frozen?: number };
        message?: string;
      };
      if (!res.ok || !json.data) {
        return {
          balance: null,
          frozen: null,
          available: false,
          mock: false,
          message: json.message || "Saldo Tripo tidak tersedia",
        };
      }
      return {
        balance: Number(json.data.balance ?? 0),
        frozen: Number(json.data.frozen ?? 0),
        available: true,
        mock: false,
      };
    } catch (error) {
      return {
        balance: null,
        frozen: null,
        available: false,
        mock: false,
        message: error instanceof Error ? error.message : "Gagal baca saldo",
      };
    }
  }

  async downloadModel(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Gagal unduh GLB dari Tripo");
    return Buffer.from(await res.arrayBuffer());
  }
}

let cached: TripoProvider | null = null;

export function getTripoProvider(): TripoProvider {
  if (cached) return cached;
  if (hasTripoKey()) cached = new LiveTripoProvider();
  else if (isMockTripoEnabled()) cached = new MockTripoProvider();
  else cached = new MissingKeyProvider();
  return cached;
}

export function resetTripoProviderCache(): void {
  cached = null;
}
