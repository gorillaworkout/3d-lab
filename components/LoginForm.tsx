"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

type Props = {
  firebaseConfigured: boolean;
  devBypass: boolean;
  production: boolean;
};

export function LoginForm({ firebaseConfigured, devBypass, production }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function finish(idToken?: string, demo?: boolean) {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(demo ? { demo: true } : { idToken }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(json.error || "Gagal membuat sesi");
    router.replace("/");
    router.refresh();
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase belum dikonfigurasi");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await finish(await cred.user.getIdToken());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setPending(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase belum dikonfigurasi");
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await finish(await cred.user.getIdToken());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login Google gagal");
    } finally {
      setPending(false);
    }
  }

  async function onDemo() {
    setError(null);
    setPending(true);
    try {
      await finish(undefined, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mode demo gagal");
    } finally {
      setPending(false);
    }
  }

  if (!firebaseConfigured && !devBypass) {
    return (
      <div className="panel p-6">
        <h1 className="text-xl font-semibold">Firebase belum dikonfigurasi</h1>
        <p className="muted mt-3 text-sm leading-relaxed">
          Admin tidak dibuka tanpa autentikasi. Isi <code>NEXT_PUBLIC_FIREBASE_*</code> dan
          (untuk persistensi) <code>FIREBASE_ADMIN_*</code> di environment server. Jangan
          menaruh kunci di bundle browser.
        </p>
        {production ? (
          <p className="mt-3 text-sm text-[var(--accent-2)]">
            Mode demo dimatikan di production.
          </p>
        ) : (
          <p className="muted mt-3 text-sm">
            Untuk development, set <code>DEV_AUTH_BYPASS=1</code> lalu restart.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="panel p-6">
      <div className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Admin</div>
      <h1 className="mt-1 text-2xl font-semibold">Masuk 3D Lab + Kas</h1>
      <p className="muted mt-2 text-sm">Hanya Bayu / admin. Tidak ada halaman publik.</p>

      {firebaseConfigured ? (
        <>
          <button className="btn mt-5 w-full" disabled={pending} onClick={onGoogle} type="button">
            Masuk dengan Google
          </button>
          <form className="mt-5 space-y-3" onSubmit={onEmail}>
            <label className="block text-sm">
              Email
              <input
                className="field mt-1"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Password
              <input
                className="field mt-1"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button className="btn btn-accent w-full" disabled={pending} type="submit">
              Masuk dengan email
            </button>
          </form>
        </>
      ) : null}

      {devBypass ? (
        <div className="mt-6 rounded-xl border border-[#8a3d16] bg-[#3a1a0c] p-4">
          <div className="text-sm font-semibold text-[#ffe7c8]">
            MODE DEMO — Firebase kosong. Jangan dipakai produksi.
          </div>
          <button className="btn mt-3 w-full" disabled={pending} onClick={onDemo} type="button">
            Masuk mode demo
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
