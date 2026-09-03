export type TriangleMesh = {
  positions: Float32Array;
  indices: Uint32Array;
};

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

export function parseGlbMesh(buffer: Buffer): TriangleMesh {
  if (buffer.length < 12) throw new Error("GLB terlalu pendek");
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (readU32(view, 0) !== GLB_MAGIC) throw new Error("Bukan file GLB");
  const version = readU32(view, 4);
  if (version !== 2) throw new Error(`GLB versi ${version} tidak didukung`);

  let offset = 12;
  let json: Record<string, unknown> | null = null;
  let bin: Buffer = Buffer.alloc(0);

  while (offset + 8 <= buffer.length) {
    const chunkLen = readU32(view, offset);
    const chunkType = readU32(view, offset + 4);
    const start = offset + 8;
    const end = start + chunkLen;
    if (end > buffer.length) break;
    if (chunkType === CHUNK_JSON) {
      json = JSON.parse(buffer.subarray(start, end).toString("utf8")) as Record<string, unknown>;
    } else if (chunkType === CHUNK_BIN) {
      bin = buffer.subarray(start, end);
    }
    offset = end;
  }

  if (!json) throw new Error("GLB tanpa JSON chunk");
  const meshes = (json.meshes as Array<{ primitives: Array<Record<string, unknown>> }>) ?? [];
  const accessors = (json.accessors as Array<Record<string, unknown>>) ?? [];
  const bufferViews = (json.bufferViews as Array<Record<string, unknown>>) ?? [];

  const positions: number[] = [];
  const indices: number[] = [];

  for (const mesh of meshes) {
    for (const prim of mesh.primitives ?? []) {
      const attrs = prim.attributes as Record<string, number> | undefined;
      if (!attrs || attrs.POSITION == null) continue;
      const pos = readAccessor(bin, accessors, bufferViews, attrs.POSITION);
      const base = positions.length / 3;
      for (let i = 0; i < pos.count; i++) {
        positions.push(pos.array[i * 3], pos.array[i * 3 + 1], pos.array[i * 3 + 2]);
      }
      if (prim.indices != null) {
        const idx = readAccessor(bin, accessors, bufferViews, prim.indices as number);
        for (let i = 0; i < idx.count; i++) indices.push(base + idx.array[i]);
      } else {
        for (let i = 0; i < pos.count; i++) indices.push(base + i);
      }
    }
  }

  if (indices.length < 3) throw new Error("GLB tidak berisi segitiga");
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}

function readAccessor(
  bin: Buffer,
  accessors: Array<Record<string, unknown>>,
  bufferViews: Array<Record<string, unknown>>,
  index: number,
): { array: number[]; count: number } {
  const acc = accessors[index];
  if (!acc) throw new Error("Accessor GLB tidak ada");
  const count = acc.count as number;
  const type = acc.type as string;
  const componentType = acc.componentType as number;
  const bvIndex = acc.bufferView as number | undefined;
  const accOffset = (acc.byteOffset as number | undefined) ?? 0;
  const comps = type === "VEC3" ? 3 : type === "VEC2" ? 2 : 1;
  const view = bvIndex == null ? null : bufferViews[bvIndex];
  const viewOffset = view ? ((view.byteOffset as number | undefined) ?? 0) : 0;
  const start = viewOffset + accOffset;
  const size = componentSize(componentType);
  const stride = (view?.byteStride as number | undefined) ?? size * comps;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const o = start + i * stride;
    for (let c = 0; c < comps; c++) {
      out.push(readComponent(bin, o + c * size, componentType));
    }
  }
  return { array: out, count };
}

function componentSize(componentType: number): number {
  if (componentType === 5126) return 4;
  if (componentType === 5125) return 4;
  if (componentType === 5123) return 2;
  if (componentType === 5121) return 1;
  if (componentType === 5122) return 2;
  if (componentType === 5120) return 1;
  throw new Error(`componentType ${componentType} tidak didukung`);
}

function readComponent(bin: Buffer, offset: number, componentType: number): number {
  if (componentType === 5126) return bin.readFloatLE(offset);
  if (componentType === 5125) return bin.readUInt32LE(offset);
  if (componentType === 5123) return bin.readUInt16LE(offset);
  if (componentType === 5121) return bin.readUInt8(offset);
  if (componentType === 5122) return bin.readInt16LE(offset);
  if (componentType === 5120) return bin.readInt8(offset);
  throw new Error(`componentType ${componentType} tidak didukung`);
}

export function meshBounds(mesh: TriangleMesh): {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
} {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      const v = mesh.positions[i + c];
      if (v < min[c]) min[c] = v;
      if (v > max[c]) max[c] = v;
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

export function scaleMesh(mesh: TriangleMesh, scale: number): TriangleMesh {
  const positions = new Float32Array(mesh.positions.length);
  for (let i = 0; i < mesh.positions.length; i++) positions[i] = mesh.positions[i] * scale;
  return { positions, indices: mesh.indices };
}

export function createCubeGlb(sizeMm = 20): Buffer {
  const h = sizeMm / 2;
  const positions = new Float32Array([
    -h, -h, -h, h, -h, -h, h, h, -h, -h, h, -h, -h, -h, h, h, -h, h, h, h, h, -h, h, h,
  ]);
  const indices = new Uint16Array([
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 5, 4, 0, 1, 5, 3, 6, 2, 3, 7, 6, 0, 7, 3, 0, 4, 7, 1,
    6, 5, 1, 2, 6,
  ]);

  const bin = Buffer.alloc(96 + 72);
  Buffer.from(positions.buffer).copy(bin, 0);
  Buffer.from(indices.buffer).copy(bin, 96);

  const json = JSON.stringify({
    asset: { version: "2.0", generator: "3d-lab-mock" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 8,
        type: "VEC3",
        min: [-h, -h, -h],
        max: [h, h, h],
      },
      { bufferView: 1, componentType: 5123, count: 36, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 96 },
      { buffer: 0, byteOffset: 96, byteLength: 72 },
    ],
    buffers: [{ byteLength: 168 }],
  });

  const jsonPad = (4 - (Buffer.byteLength(json) % 4)) % 4;
  const jsonBuf = Buffer.alloc(Buffer.byteLength(json) + jsonPad, 0x20);
  jsonBuf.write(json, 0, "utf8");
  const binPad = (4 - (bin.length % 4)) % 4;
  const binPadded = Buffer.concat([bin, Buffer.alloc(binPad)]);

  const header = Buffer.alloc(12);
  const jsonChunk = Buffer.alloc(8);
  const binChunk = Buffer.alloc(8);
  const total = 12 + 8 + jsonBuf.length + 8 + binPadded.length;
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  jsonChunk.writeUInt32LE(jsonBuf.length, 0);
  jsonChunk.writeUInt32LE(CHUNK_JSON, 4);
  binChunk.writeUInt32LE(binPadded.length, 0);
  binChunk.writeUInt32LE(CHUNK_BIN, 4);
  return Buffer.concat([header, jsonChunk, jsonBuf, binChunk, binPadded]);
}
