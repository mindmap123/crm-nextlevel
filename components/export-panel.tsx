"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui";

const COLUMNS: [string, string][] = [
  ["companyName", "Nom entreprise"],
  ["contactName", "Nom contact"],
  ["phone", "Téléphone"],
  ["email", "Email"],
  ["website", "Site web"],
  ["address", "Adresse"],
  ["city", "Ville"],
  ["category", "Catégorie"],
  ["source", "Source"],
  ["googleRating", "Note Google"],
  ["reviewCount", "Avis"],
  ["hasWebsite", "Site (O/N)"],
  ["score", "Score"],
  ["status", "Statut"],
  ["tags", "Tags"],
];

export function ExportPanel({ total }: { total: number }) {
  const [cols, setCols] = useState<Set<string>>(new Set(COLUMNS.map((c) => c[0])));
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const scope = "all" as const;

  const toggle = (c: string) =>
    setCols((s) => {
      const n = new Set(s);
      n.has(c) ? n.delete(c) : n.add(c);
      return n;
    });

  const download = () => {
    const params = new URLSearchParams();
    params.set("format", format);
    params.set("scope", scope);
    params.set("cols", [...cols].join(","));
    window.location.href = `/api/export?${params.toString()}`;
  };

  return (
    <div className="max-w-2xl space-y-4 p-6">
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold">Colonnes</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COLUMNS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cols.has(k)} onChange={() => toggle(k)} />
              {label}
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold">Format & portée</h2>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={format === "csv"} onChange={() => setFormat("csv")} /> CSV
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={format === "json"} onChange={() => setFormat("json")} /> JSON
          </label>
          <span className="ml-auto text-muted-foreground">{total} lead(s) — portée : tout</span>
        </div>
      </Card>

      <Button disabled={cols.size === 0 || total === 0} onClick={download}>
        Télécharger ({format.toUpperCase()})
      </Button>
      <p className="text-xs text-muted-foreground">
        Export = fichier local uniquement. Aucun envoi automatique.
      </p>
    </div>
  );
}
