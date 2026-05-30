import { prisma } from "@/lib/db";
import { Kanban } from "@/components/kanban";
import { PageHeader, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const leads = await prisma.lead.findMany({
    orderBy: { score: "desc" },
    take: 500,
  });

  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Glissez les cartes pour changer de statut" />
      {leads.length === 0 ? (
        <div className="p-6">
          <Empty title="Aucun lead" hint="Importez des leads pour alimenter le pipeline." />
        </div>
      ) : (
        <Kanban leads={leads} />
      )}
    </div>
  );
}
