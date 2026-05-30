import { prisma } from "@/lib/db";
import { Kanban } from "@/components/kanban";
import { PageHeader, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";
const PIPELINE_LIMIT = 500;

export default async function PipelinePage() {
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { score: "desc" },
      take: PIPELINE_LIMIT,
    }),
    prisma.lead.count(),
  ]);

  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Glissez les cartes pour changer de statut" />
      {total > PIPELINE_LIMIT && (
        <div className="border-b bg-amber-50 px-6 py-2 text-sm text-amber-800">
          Pipeline limité aux {PIPELINE_LIMIT} meilleurs scores sur {total} leads.
        </div>
      )}
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
