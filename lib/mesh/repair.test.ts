import { describe, expect, it } from "vitest";
import { createCubeGlb } from "./glb";
import { repairAndVolume } from "./repair";
import { meshToBinaryStl } from "./stl";
import { parseGlbMesh } from "./glb";

describe("watertight cube mock", () => {
  it("reports 8 cm³ at 20 mm height and writes a non-empty STL", async () => {
    const glb = createCubeGlb(20);
    const result = await repairAndVolume(glb, 20);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.volume_cm3).toBeCloseTo(8, 5);
    }
    const stl = meshToBinaryStl(parseGlbMesh(glb));
    expect(stl.length).toBeGreaterThan(84);
    expect(stl.readUInt32LE(80)).toBe(12);
  });

  it("scales volume with target height", async () => {
    const glb = createCubeGlb(20);
    const result = await repairAndVolume(glb, 40);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.volume_cm3).toBeCloseTo(64, 4);
    }
  });
});
