import { prisma } from "@/lib/db";
import { ExportPanel } from "@/components/export-panel";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const total = await prisma.lead.count();
  return (
    <div>
      <PageHeader title="Export" subtitle="CSV / JSON — téléchargement local" />
      <ExportPanel total={total} />
    </div>
  );
}
