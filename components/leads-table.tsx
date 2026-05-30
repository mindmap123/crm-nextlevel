"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Lead } from "@prisma/client";
import {
  STATUSES,
  STATUS_LABEL,
  STATUS_CLASS,
  TAG_LABEL,
  TAG_CLASS,
  scoreClass,
} from "@/lib/constants";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { bulkSetStatus, bulkAddTag, deleteLeads, setStatus } from "@/lib/actions";

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "—";
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const allChecked = leads.length > 0 && selected.size === leads.length;
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(leads.map((l) => l.id)));

  const ids = [...selected];

  return (
    <div className="px-6 py-4">
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-accent/5 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} sélectionné(s)</span>
          <select
            className="h-8 rounded-md border bg-card px-2 text-xs"
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              const v = e.target.value as (typeof STATUSES)[number];
              start(async () => {
                await bulkSetStatus(ids, v);
                setSelected(new Set());
              });
            }}
          >
            <option value="">Changer statut…</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => start(async () => {
              await bulkAddTag(ids, "PRIORITAIRE");
              setSelected(new Set());
            })}
          >
            + Prioritaire
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Supprimer ${selected.size} lead(s) ? Action irréversible.`)) return;
              start(async () => {
                await deleteLeads(ids);
                setSelected(new Set());
              });
            }}
          >
            Supprimer
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-8 px-3 py-2">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className="px-3 py-2">Entreprise</th>
              <th className="px-3 py-2">Ville</th>
              <th className="px-3 py-2">Catégorie</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Avis</th>
              <th className="px-3 py-2">Site</th>
              <th className="px-3 py-2">Dernier contact</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr
                key={l.id}
                className={cn(
                  "border-b last:border-0 hover:bg-muted/30",
                  selected.has(l.id) && "bg-accent/5",
                )}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(l.id)}
                    onChange={() => toggle(l.id)}
                  />
                </td>
                <td className="px-3 py-2">
                  <Link href={`/leads/${l.id}`} className="font-medium hover:text-accent">
                    {l.companyName}
                  </Link>
                  {l.tags.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {l.tags.slice(0, 3).map((t) => (
                        <Badge key={t} className={TAG_CLASS[t]}>
                          {TAG_LABEL[t]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{l.city ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{l.category ?? "—"}</td>
                <td className="px-3 py-2">
                  <Badge className={scoreClass(l.score)}>{l.score}</Badge>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={l.status}
                    onChange={(e) =>
                      start(() => setStatus(l.id, e.target.value as (typeof STATUSES)[number]))
                    }
                    className={cn(
                      "cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium",
                      STATUS_CLASS[l.status],
                    )}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className="flex gap-1 text-base" title="présence tél / email">
                    <span className={l.phone ? "" : "opacity-20"}>📞</span>
                    <span className={l.email ? "" : "opacity-20"}>✉️</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {l.googleRating ? `${l.googleRating}★ (${l.reviewCount ?? 0})` : "—"}
                </td>
                <td className="px-3 py-2">{l.hasWebsite ? "Oui" : "Non"}</td>
                <td className="px-3 py-2 text-muted-foreground">{fmtDate(l.lastContactAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
