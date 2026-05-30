import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseFilters, buildWhere, buildOrderBy } from "@/lib/filters";
import { FilterBar } from "@/components/filter-bar";
import { LeadsTable } from "@/components/leads-table";
import { PageHeader, Empty, Button } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const where = buildWhere(filters);

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: buildOrderBy(filters),
      take: 200,
    }),
    prisma.lead.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${total} lead(s)`}
        actions={
          <>
            <Link href="/import">
              <Button variant="outline" size="sm">
                Importer
              </Button>
            </Link>
            <Link href="/leads/new">
              <Button size="sm">+ Nouveau lead</Button>
            </Link>
          </>
        }
      />
      <FilterBar />
      {leads.length === 0 ? (
        <div className="p-6">
          <Empty
            title={total === 0 ? "Aucun lead" : "Aucun résultat"}
            hint={
              total === 0
                ? "Importez un fichier CSV / JSON ou créez un lead manuellement."
                : "Aucun lead ne correspond aux filtres."
            }
            action={
              total === 0 ? (
                <Link href="/import">
                  <Button>Importer des leads</Button>
                </Link>
              ) : null
            }
          />
        </div>
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  );
}
