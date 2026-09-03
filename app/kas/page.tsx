export const dynamic = "force-dynamic";

import { AppShell } from "@/components/AppShell";
import { KasClient } from "@/components/KasClient";
import { requirePageUser } from "@/lib/page-guard";
import { listKas, monthKasSummary } from "@/lib/store";

export default async function KasPage() {
  const user = await requirePageUser();
  const [entries, month] = await Promise.all([listKas(), monthKasSummary()]);
  return (
    <AppShell user={user} pathname="/kas">
      <KasClient entries={entries} month={month} />
    </AppShell>
  );
}
