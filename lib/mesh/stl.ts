import type { TriangleMesh } from "./glb";

export function meshToBinaryStl(mesh: TriangleMesh): Buffer {
  const triCount = Math.floor(mesh.indices.length / 3);
  const out = Buffer.alloc(84 + triCount * 50);
  out.write("3D Lab + Kas", 0, "ascii");
  out.writeUInt32LE(triCount, 80);
  let offset = 84;
  for (let t = 0; t < triCount; t++) {
    const i0 = mesh.indices[t * 3] * 3;
    const i1 = mesh.indices[t * 3 + 1] * 3;
    const i2 = mesh.indices[t * 3 + 2] * 3;
    const ax = mesh.positions[i0];
    const ay = mesh.positions[i0 + 1];
    const az = mesh.positions[i0 + 2];
    const bx = mesh.positions[i1];
    const by = mesh.positions[i1 + 1];
    const bz = mesh.positions[i1 + 2];
    const cx = mesh.positions[i2];
    const cy = mesh.positions[i2 + 1];
    const cz = mesh.positions[i2 + 2];
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    out.writeFloatLE(nx, offset);
    out.writeFloatLE(ny, offset + 4);
    out.writeFloatLE(nz, offset + 8);
    out.writeFloatLE(ax, offset + 12);
    out.writeFloatLE(ay, offset + 16);
    out.writeFloatLE(az, offset + 20);
    out.writeFloatLE(bx, offset + 24);
    out.writeFloatLE(by, offset + 28);
    out.writeFloatLE(bz, offset + 32);
    out.writeFloatLE(cx, offset + 36);
    out.writeFloatLE(cy, offset + 40);
    out.writeFloatLE(cz, offset + 44);
    out.writeUInt16LE(0, offset + 48);
    offset += 50;
  }
  return out;
}
