import { describe, expect, it } from "vitest";
import {
  FIREBASE_APP_PREFIX,
  FIRESTORE_COLLECTIONS,
  firebaseStorageObjectPath,
} from "./namespace";

describe("Firebase namespace isolation", () => {
  it("prefixes Firestore collections so they do not collide with sibling apps", () => {
    expect(FIREBASE_APP_PREFIX).toBe("3dlab");
    expect(FIRESTORE_COLLECTIONS.jobs).toBe("3dlab_jobs");
    expect(FIRESTORE_COLLECTIONS.kas).toBe("3dlab_kas");
    expect(FIRESTORE_COLLECTIONS.settings).toBe("3dlab_settings");
  });

  it("prefixes Storage object paths once", () => {
    expect(firebaseStorageObjectPath("jobs/abc/model.glb")).toBe("3dlab/jobs/abc/model.glb");
    expect(firebaseStorageObjectPath("/jobs/abc/photo.png")).toBe("3dlab/jobs/abc/photo.png");
    expect(firebaseStorageObjectPath("3dlab/jobs/abc/model.stl")).toBe(
      "3dlab/jobs/abc/model.stl",
    );
  });
});
