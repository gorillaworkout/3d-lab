import { randomBytes } from "node:crypto";

export function createId(prefix = ""): string {
  const raw = randomBytes(9).toString("base64url");
  return prefix ? `${prefix}_${raw}` : raw;
}
