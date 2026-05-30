import { prisma } from "@/lib/db";
import { getActiveConfig } from "@/lib/config";
import { ScoringEditor } from "@/components/scoring-editor";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const BUCKETS: [string, number, number][] = [
  ["0–19", 0, 19],
  ["20–44", 20, 44],
  ["45–69", 45, 69],
  ["70–100", 70, 100],
];

export default async function ScoringPage() {
  const cfg = await getActiveConfig();
  const leads = await prisma.lead.findMany({ select: { score: true } });
  const distribution = BUCKETS.map(([bucket, lo, hi]) => ({
    bucket,
    count: leads.filter((l) => l.score >= lo && l.score <= hi).length,
  }));

  return (
    <div>
      <PageHeader title="Scoring" subtitle="Poids éditables, lisibles, recalcul global" />
      <ScoringEditor
        weights={cfg.weights}
        targetCategories={cfg.targetCategories}
        targetCities={cfg.targetCities}
        distribution={distribution}
      />
    </div>
  );
}
