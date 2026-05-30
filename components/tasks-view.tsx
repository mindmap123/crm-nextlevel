"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { toggleTask, deleteTask } from "@/lib/actions";

export interface TaskRow {
  id: string;
  title: string;
  status: "TODO" | "DONE";
  dueAt: Date | null;
  lead: { id: string; companyName: string };
}

function group(tasks: TaskRow[]) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const buckets: Record<string, TaskRow[]> = {
    "En retard": [],
    "Aujourd'hui": [],
    "Cette semaine": [],
    "Plus tard": [],
    "Sans échéance": [],
  };
  for (const t of tasks) {
    if (!t.dueAt) buckets["Sans échéance"].push(t);
    else {
      const d = new Date(t.dueAt);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      if (d < start) buckets["En retard"].push(t);
      else if (d <= today) buckets["Aujourd'hui"].push(t);
      else if (d <= weekEnd) buckets["Cette semaine"].push(t);
      else buckets["Plus tard"].push(t);
    }
  }
  return buckets;
}

export function TasksView({ tasks }: { tasks: TaskRow[] }) {
  const [, start] = useTransition();
  const buckets = group(tasks);

  return (
    <div className="space-y-4 p-6">
      {Object.entries(buckets).map(([label, rows]) =>
        rows.length === 0 ? null : (
          <Card key={label} className="p-5">
            <h2 className={cn("mb-3 text-sm font-semibold", label === "En retard" && "text-red-600")}>
              {label} <span className="text-muted-foreground">({rows.length})</span>
            </h2>
            <ul className="space-y-1.5 text-sm">
              {rows.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={t.status === "DONE"}
                    onChange={() => start(() => toggleTask(t.id))}
                  />
                  <span className={cn("flex-1", t.status === "DONE" && "text-muted-foreground line-through")}>
                    {t.title}
                  </span>
                  <Link href={`/leads/${t.lead.id}`} className="text-xs text-accent hover:underline">
                    {t.lead.companyName}
                  </Link>
                  {t.dueAt && (
                    <span className="w-20 text-right text-xs text-muted-foreground">
                      {new Date(t.dueAt).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  <button
                    onClick={() => start(() => deleteTask(t.id))}
                    className="text-muted-foreground hover:text-red-600"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ),
      )}
    </div>
  );
}
