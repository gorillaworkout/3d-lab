export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { JobDetail } from "@/components/JobDetail";
import { requirePageUser } from "@/lib/page-guard";
import { refreshJob } from "@/lib/jobs/pipeline";
import { getSettings } from "@/lib/store";

type Props = { params: Promise<{ id: string }> };

export default async function JobPage({ params }: Props) {
  const user = await requirePageUser();
  const { id } = await params;
  const [job, settings] = await Promise.all([refreshJob(id), getSettings()]);
  if (!job) notFound();

  return (
    <AppShell user={user} pathname={`/jobs/${id}`}>
      <JobDetail initial={job} settings={settings} />
    </AppShell>
  );
}
