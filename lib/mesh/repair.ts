import { meshBounds, parseGlbMesh, scaleMesh, type TriangleMesh } from "./glb";

export type RepairResult =
  | {
      ok: true;
      volume_cm3: number;
      height_mm: number;
      scale: number;
    }
  | {
      ok: false;
      reason: string;
    };

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function isWatertight(mesh: TriangleMesh): boolean {
  const edges = new Map<string, number>();
  const n = Math.floor(mesh.indices.length / 3);
  for (let t = 0; t < n; t++) {
    const a = mesh.indices[t * 3];
    const b = mesh.indices[t * 3 + 1];
    const c = mesh.indices[t * 3 + 2];
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const k = edgeKey(u, v);
      edges.set(k, (edges.get(k) ?? 0) + 1);
    }
  }
  for (const count of edges.values()) {
    if (count !== 2) return false;
  }
  return n > 0;
}

function flipTri(indices: Uint32Array, t: number) {
  const a = indices[t * 3 + 1];
  indices[t * 3 + 1] = indices[t * 3 + 2];
  indices[t * 3 + 2] = a;
}

/** Make adjacent triangles share opposite edge direction. */
export function orientConsistently(mesh: TriangleMesh): TriangleMesh {
  const n = Math.floor(mesh.indices.length / 3);
  const indices = new Uint32Array(mesh.indices);
  const edgeToTris = new Map<string, number[]>();
  for (let t = 0; t < n; t++) {
    const a = indices[t * 3];
    const b = indices[t * 3 + 1];
    const c = indices[t * 3 + 2];
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const k = edgeKey(u, v);
      const list = edgeToTris.get(k) ?? [];
      list.push(t);
      edgeToTris.set(k, list);
    }
  }
  const seen = new Uint8Array(n);
  const queue = [0];
  seen[0] = 1;
  while (queue.length) {
    const t = queue.shift()!;
    const verts = [indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]];
    for (let i = 0; i < 3; i++) {
      const u = verts[i];
      const v = verts[(i + 1) % 3];
      const neighbors = edgeToTris.get(edgeKey(u, v)) ?? [];
      for (const other of neighbors) {
        if (other === t || seen[other]) continue;
        const oa = indices[other * 3];
        const ob = indices[other * 3 + 1];
        const oc = indices[other * 3 + 2];
        const sameDir =
          (oa === u && ob === v) || (ob === u && oc === v) || (oc === u && oa === v);
        if (sameDir) flipTri(indices, other);
        seen[other] = 1;
        queue.push(other);
      }
    }
  }
  return { positions: mesh.positions, indices };
}

/** Signed volume in cubic mesh-units via divergence theorem. */
export function signedVolume(mesh: TriangleMesh): number {
  const oriented = orientConsistently(mesh);
  let vol = 0;
  const n = Math.floor(oriented.indices.length / 3);
  for (let t = 0; t < n; t++) {
    const i0 = oriented.indices[t * 3] * 3;
    const i1 = oriented.indices[t * 3 + 1] * 3;
    const i2 = oriented.indices[t * 3 + 2] * 3;
    const ax = oriented.positions[i0];
    const ay = oriented.positions[i0 + 1];
    const az = oriented.positions[i0 + 2];
    const bx = oriented.positions[i1];
    const by = oriented.positions[i1 + 1];
    const bz = oriented.positions[i1 + 2];
    const cx = oriented.positions[i2];
    const cy = oriented.positions[i2 + 1];
    const cz = oriented.positions[i2 + 2];
    vol += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return vol / 6;
}

function mergeVertices(mesh: TriangleMesh, tolerance: number): TriangleMesh {
  const map = new Map<string, number>();
  const positions: number[] = [];
  const remap: number[] = [];
  const quant = tolerance > 0 ? 1 / tolerance : 1e6;
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const key = [
      Math.round(mesh.positions[i] * quant),
      Math.round(mesh.positions[i + 1] * quant),
      Math.round(mesh.positions[i + 2] * quant),
    ].join(",");
    let idx = map.get(key);
    if (idx == null) {
      idx = positions.length / 3;
      map.set(key, idx);
      positions.push(mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]);
    }
    remap.push(idx);
  }
  const indices = new Uint32Array(mesh.indices.length);
  for (let i = 0; i < mesh.indices.length; i++) indices[i] = remap[mesh.indices[i]];
  return { positions: new Float32Array(positions), indices };
}

export async function repairAndVolume(
  glb: Buffer,
  targetHeightMm: number,
): Promise<RepairResult> {
  if (!Number.isFinite(targetHeightMm) || targetHeightMm <= 0) {
    return { ok: false, reason: "Tinggi target tidak valid" };
  }

  let mesh: TriangleMesh;
  try {
    mesh = parseGlbMesh(glb);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Gagal baca GLB" };
  }

  const merged = mergeVertices(mesh, 1e-5);
  const bounds = meshBounds(merged);
  const height = Math.max(bounds.size[0], bounds.size[1], bounds.size[2]);
  if (!Number.isFinite(height) || height <= 0) {
    return { ok: false, reason: "Mesh tidak punya dimensi" };
  }
  const scale = targetHeightMm / height;
  const scaled = scaleMesh(merged, scale);

  const watertight = isWatertight(scaled);
  const volumeUnits = watertight ? Math.abs(signedVolume(scaled)) : 0;
  if (!watertight || volumeUnits <= 0) {
    return {
      ok: false,
      reason: "Mesh tidak watertight — perlu perbaikan sebelum volume/HPP dihitung",
    };
  }

  // Mesh units after scale-to-height are millimeters → cm³ = mm³ / 1000
  const volume_cm3 = volumeUnits / 1000;
  if (!Number.isFinite(volume_cm3) || volume_cm3 <= 0) {
    return { ok: false, reason: "Volume hasil perbaikan tidak valid" };
  }

  return { ok: true, volume_cm3, height_mm: targetHeightMm, scale };
}
