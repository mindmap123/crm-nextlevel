"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Lead, Status } from "@prisma/client";
import { STATUSES, STATUS_LABEL, scoreClass, TAG_CLASS, TAG_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { setStatus } from "@/lib/actions";

export function Kanban({ leads }: { leads: Lead[] }) {
  const [items, setItems] = useState(leads);
  const [, start] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);

  const byStatus = (s: Status) => items.filter((l) => l.status === s);

  const drop = (s: Status) => {
    setOver(null);
    if (!dragId) return;
    const lead = items.find((l) => l.id === dragId);
    if (!lead || lead.status === s) return;
    setItems((prev) => prev.map((l) => (l.id === dragId ? { ...l, status: s } : l)));
    const id = dragId;
    setDragId(null);
    start(() => setStatus(id, s));
  };

  return (
    <div className="flex gap-3 overflow-x-auto p-6">
      {STATUSES.map((s) => {
        const col = byStatus(s);
        return (
          <div
            key={s}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(s);
            }}
            onDrop={() => drop(s)}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30",
              over === s && "ring-2 ring-accent/50",
            )}
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">{STATUS_LABEL[s]}</span>
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="flex-1 space-y-2 p-2">
              {col.length === 0 && (
                <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                  vide
                </div>
              )}
              {col.map((l) => (
                <div
                  key={l.id}
                  draggable
                  onDragStart={() => setDragId(l.id)}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "cursor-grab rounded-lg border bg-card p-3 shadow-sm active:cursor-grabbing",
                    dragId === l.id && "opacity-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/leads/${l.id}`} className="text-sm font-medium hover:text-accent">
                      {l.companyName}
                    </Link>
                    <Badge className={scoreClass(l.score)}>{l.score}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{l.city ?? "—"}</div>
                  {l.nextAction && (
                    <div className="mt-1 text-xs text-foreground">→ {l.nextAction}</div>
                  )}
                  {l.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {l.tags.slice(0, 2).map((t) => (
                        <Badge key={t} className={TAG_CLASS[t]}>
                          {TAG_LABEL[t]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
