import { prisma } from "@/lib/db";
import { TasksView } from "@/components/tasks-view";
import { PageHeader, Empty, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, activities] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      include: { lead: { select: { id: true, companyName: true } } },
    }),
    prisma.activity.findMany({
      where: { type: "note" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { lead: { select: { id: true, companyName: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Notes & Tâches" subtitle={`${tasks.length} tâche(s)`} />
      {tasks.length === 0 ? (
        <div className="p-6">
          <Empty title="Aucune tâche" hint="Vos relances apparaîtront ici. Créez-les depuis une fiche lead." />
        </div>
      ) : (
        <TasksView tasks={tasks} />
      )}

      {activities.length > 0 && (
        <div className="px-6 pb-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Notes récentes</h2>
            <ul className="space-y-2 text-sm">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="flex-1">{a.body}</span>
                  <a href={`/leads/${a.lead.id}`} className="text-xs text-accent hover:underline">
                    {a.lead.companyName}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
