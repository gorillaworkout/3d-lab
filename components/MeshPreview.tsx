"use client";

import { Canvas } from "@react-three/fiber";
import { Center, OrbitControls } from "@react-three/drei";
import { useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Group } from "three";

function LoadedModel({ url }: { url: string }) {
  const [scene, setScene] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setScene(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("Gagal memuat GLB");
        const buf = await res.arrayBuffer();
        const gltf = await new GLTFLoader().parseAsync(buf, "");
        if (!cancelled) setScene(gltf.scene);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Preview gagal");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) return null;
  if (!scene) return null;
  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

export function MeshPreview({ url, mock }: { url: string; mock?: boolean }) {
  return (
    <div className="panel relative overflow-hidden">
      {mock ? (
        <div className="absolute left-3 top-3 z-10 rounded-md bg-[#5a220c] px-2 py-1 text-xs font-semibold text-[#ffe7c8]">
          MESH MOCK
        </div>
      ) : null}
      <div className="h-[360px] w-full">
        <Canvas camera={{ position: [40, 30, 40], fov: 40 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[20, 40, 10]} intensity={1.1} />
          <LoadedModel url={url} />
          <OrbitControls makeDefault enableDamping />
          <gridHelper args={[80, 16, "#3a4554", "#222833"]} />
        </Canvas>
      </div>
      <div className="muted border-t border-[var(--border)] px-3 py-2 text-xs">
        Seret untuk memutar · scroll untuk zoom
      </div>
    </div>
  );
}
