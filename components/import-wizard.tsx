"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { Card, Button } from "@/components/ui";
import { commitImportChunk } from "@/lib/actions";
import type { ImportRow, ImportChunkResult } from "@/lib/types";
import type { ImportFormat } from "@prisma/client";

const FIELDS = [
  "companyName",
  "contactName",
  "phone",
  "email",
  "website",
  "address",
  "city",
  "category",
  "source",
  "googleRating",
  "reviewCount",
] as const;

const FIELD_LABEL: Record<(typeof FIELDS)[number], string> = {
  companyName: "Nom entreprise *",
  contactName: "Nom contact",
  phone: "Téléphone",
  email: "Email",
  website: "Site web",
  address: "Adresse",
  city: "Ville",
  category: "Catégorie",
  source: "Source",
  googleRating: "Note Google",
  reviewCount: "Nombre d'avis",
};

const CHUNK = 300;

function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  for (const h of headers) {
    const n = norm(h);
    if (n.includes("entreprise") || n.includes("company") || n.includes("nom") && !n.includes("contact")) map[h] = "companyName";
    else if (n.includes("contact")) map[h] = "contactName";
    else if (n.includes("tel") || n.includes("phone")) map[h] = "phone";
    else if (n.includes("mail")) map[h] = "email";
    else if (n.includes("site") || n.includes("web") || n.includes("url")) map[h] = "website";
    else if (n.includes("adresse") || n.includes("address")) map[h] = "address";
    else if (n.includes("ville") || n.includes("city")) map[h] = "city";
    else if (n.includes("categor")) map[h] = "category";
    else if (n.includes("source")) map[h] = "source";
    else if (n.includes("note") || n.includes("rating") || n.includes("etoile")) map[h] = "googleRating";
    else if (n.includes("avis") || n.includes("review")) map[h] = "reviewCount";
  }
  return map;
}

export function ImportWizard() {
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [filename, setFilename] = useState("");
  const [format, setFormat] = useState<ImportFormat>("CSV");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportChunkResult | null>(null);
  const [pending, start] = useTransition();

  const onFile = (file: File) => {
    setFilename(file.name);
    setResult(null);
    if (file.name.endsWith(".json")) {
      setFormat("JSON");
      file.text().then((txt) => {
        try {
          const data = JSON.parse(txt);
          const arr = Array.isArray(data) ? data : [data];
          const h = Object.keys(arr[0] ?? {});
          setHeaders(h);
          setMapping(autoMap(h));
          setRawRows(arr);
        } catch {
          alert("JSON invalide");
        }
      });
    } else {
      setFormat("CSV");
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const rows = res.data as Record<string, unknown>[];
          const h = res.meta.fields ?? [];
          setHeaders(h);
          setMapping(autoMap(h));
          setRawRows(rows);
        },
      });
    }
  };

  const mapped: ImportRow[] = rawRows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [col, field] of Object.entries(mapping)) {
      if (field) out[field] = r[col];
    }
    return out as ImportRow;
  });

  const validCount = mapped.filter((r) => r.companyName && String(r.companyName).trim()).length;

  const runImport = () => {
    setResult(null);
    setProgress({ done: 0, total: mapped.length });
    start(async () => {
      let batchId: string | null = null;
      let cursor = 0;
      const totals = { imported: 0, duplicates: 0, toVerify: 0, errors: 0 };
      while (cursor < mapped.length) {
        const chunk = mapped.slice(cursor, cursor + CHUNK);
        const res = await commitImportChunk(batchId, filename, format, chunk, mapped.length, cursor);
        batchId = res.batchId;
        cursor = res.cursor;
        totals.imported += res.imported;
        totals.duplicates += res.duplicates;
        totals.toVerify += res.toVerify;
        totals.errors += res.errors;
        setProgress({ done: cursor, total: mapped.length });
        if (res.done) {
          setResult({ ...res, ...totals });
          break;
        }
      }
    });
  };

  if (rawRows.length === 0) {
    return (
      <div className="p-6">
        <Card className="flex flex-col items-center gap-3 border-dashed p-12 text-center">
          <div className="text-3xl opacity-40">⬆️</div>
          <p className="font-medium">Glissez un fichier CSV ou JSON</p>
          <p className="text-sm text-muted-foreground">Ou choisissez un fichier à importer.</p>
          <input
            type="file"
            accept=".csv,.json"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="mt-2 text-sm"
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold">Mapping des colonnes — {filename}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {rawRows.length} ligne(s) · {validCount} avec nom d&apos;entreprise valide.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {headers.map((h) => (
            <label key={h} className="flex flex-col gap-1 text-sm">
              <span className="truncate text-xs text-muted-foreground" title={h}>
                {h}
              </span>
              <select
                value={mapping[h] ?? ""}
                onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                className="h-9 rounded-md border bg-card px-2 text-sm"
              >
                <option value="">— ignorer —</option>
                {FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {FIELD_LABEL[f]}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-2 text-sm font-semibold">Aperçu (5 premières lignes)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                {FIELDS.filter((f) => Object.values(mapping).includes(f)).map((f) => (
                  <th key={f} className="px-2 py-1">
                    {FIELD_LABEL[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mapped.slice(0, 5).map((r, i) => (
                <tr key={i} className="border-t">
                  {FIELDS.filter((f) => Object.values(mapping).includes(f)).map((f) => (
                    <td key={f} className="px-2 py-1">
                      {String((r as Record<string, unknown>)[f] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {progress && (
        <Card className="p-5">
          <div className="mb-2 flex justify-between text-sm">
            <span>Import en cours…</span>
            <span>
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-5">
          <h2 className="mb-2 text-sm font-semibold">Import terminé</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-emerald-600">✓ {result.imported} nouveaux</span>
            <span className="text-amber-600">↔ {result.duplicates} doublons rattachés</span>
            <span className="text-yellow-600">? {result.toVerify} à vérifier</span>
            <span className="text-red-600">✕ {result.errors} erreurs</span>
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        <Button
          disabled={pending || !Object.values(mapping).includes("companyName") || validCount === 0}
          onClick={runImport}
        >
          {pending ? "Import…" : `Importer ${validCount} lead(s)`}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setRawRows([]);
            setHeaders([]);
            setResult(null);
            setProgress(null);
          }}
        >
          Annuler
        </Button>
      </div>
      {!Object.values(mapping).includes("companyName") && (
        <p className="text-sm text-red-600">Mappe au moins une colonne sur « Nom entreprise ».</p>
      )}
    </div>
  );
}
