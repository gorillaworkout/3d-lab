import Link from "next/link";
import type { SessionUser } from "@/lib/types";
import { publicRuntimeFlags } from "@/lib/env";
import { LogoutButton } from "@/components/LogoutButton";

const NAV = [
  { href: "/", label: "Dasbor" },
  { href: "/jobs/new", label: "Job baru" },
  { href: "/kas", label: "Kas" },
  { href: "/settings", label: "Pengaturan" },
];

export function AppShell({
  user,
  pathname,
  children,
}: {
  user: SessionUser;
  pathname: string;
  children: React.ReactNode;
}) {
  const flags = publicRuntimeFlags();
  const showDemo =
    user.mode === "dev" || !flags.firebaseConfigured || flags.mockTripo;

  return (
    <div className="min-h-screen">
      {showDemo ? (
        <div className="banner-demo px-4 py-3 text-center text-sm font-semibold tracking-wide">
          MODE DEMO / KONFIGURASI BELUM LENGKAP — jangan dipakai untuk produksi.
          {!flags.firebaseConfigured ? " Firebase kosong." : ""}
          {!flags.tripoConfigured
            ? flags.mockTripo
              ? " MOCK_TRIPO=1 (mesh palsu)."
              : " Butuh TRIPO_API_KEY di environment server."
            : ""}
        </div>
      ) : null}
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-5">
        <aside className="hidden w-52 shrink-0 md:block">
          <div className="mb-6 px-2">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
              Admin
            </div>
            <div className="text-lg font-semibold">3D Lab + Kas</div>
            <div className="muted mt-1 truncate text-xs">{user.email}</div>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    active
                      ? "bg-[var(--surface-2)] text-[var(--accent-2)]"
                      : "muted hover:text-[var(--text)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 px-2">
            <LogoutButton />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="mb-4 flex items-center justify-between md:hidden">
            <div className="font-semibold">3D Lab + Kas</div>
            <LogoutButton />
          </header>
          <nav className="mb-4 flex gap-3 overflow-auto text-sm md:hidden">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="muted whitespace-nowrap">
                {item.label}
              </Link>
            ))}
          </nav>
          {children}
        </div>
      </div>
    </div>
  );
}
