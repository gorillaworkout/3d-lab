export const dynamic = "force-dynamic";

import { AppShell } from "@/components/AppShell";
import { NewJobForm } from "@/components/NewJobForm";
import { requirePageUser } from "@/lib/page-guard";
import { hasTripoKey, isMockTripoEnabled } from "@/lib/env";

export default async function NewJobPage() {
  const user = await requirePageUser();
  return (
    <AppShell user={user} pathname="/jobs/new">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Job baru</h1>
          <p className="muted text-sm">Satu foto → image-to-3D tanpa tekstur → preview + unduh GLB/STL.</p>
        </div>
        <NewJobForm needTripoKey={!hasTripoKey() && !isMockTripoEnabled()} />
      </div>
    </AppShell>
  );
}
