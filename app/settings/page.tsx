export const dynamic = "force-dynamic";

import { AppShell } from "@/components/AppShell";
import { SettingsForm } from "@/components/SettingsForm";
import { requirePageUser } from "@/lib/page-guard";
import { getSettings } from "@/lib/store";

export default async function SettingsPage() {
  const user = await requirePageUser();
  const settings = await getSettings();
  return (
    <AppShell user={user} pathname="/settings">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Pengaturan</h1>
          <p className="muted text-sm">Harga, markup, kurs, dan default cetak. Semua quote berlabel perkiraan.</p>
        </div>
        <SettingsForm initial={settings} />
      </div>
    </AppShell>
  );
}
