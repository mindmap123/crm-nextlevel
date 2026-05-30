"use client";

import { useState, useTransition } from "react";
import { Card, Button } from "@/components/ui";
import { saveScoreConfig, recomputeAllScores } from "@/lib/actions";
import type { ScoreWeights } from "@/lib/scoring";

const BONUS: (keyof ScoreWeights)[] = [
  "siteActifFaible",
  "categorieAlignee",
  "contactFacile",
  "bonSignalLocal",
  "bonsAvis",
];
const MALUS: (keyof ScoreWeights)[] = [
  "doublon",
  "donneesIncompletes",
  "horsCible",
  "sansContact",
];

const LABELS: Record<keyof ScoreWeights, string> = {
  siteActifFaible: "Site actif mais faible/moyen",
  categorieAlignee: "Catégorie alignée NextLevel",
  contactFacile: "Contact facile (tél + email)",
  bonSignalLocal: "Bon signal local",
  bonsAvis: "Bons avis Google",
  doublon: "Doublon",
  donneesIncompletes: "Données incomplètes",
  horsCible: "Hors cible",
  sansContact: "Aucun moyen de contact",
};

export function ScoringEditor({
  weights,
  targetCategories,
  targetCities,
  distribution,
}: {
  weights: ScoreWeights;
  targetCategories: string[];
  targetCities: string[];
  distribution: { bucket: string; count: number }[];
}) {
  const [w, setW] = useState<ScoreWeights>(weights);
  const [cats, setCats] = useState(targetCategories.join(", "));
  const [cities, setCities] = useState(targetCities.join(", "));
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const save = (recompute: boolean) =>
    start(async () => {
      await saveScoreConfig(
        w as unknown as Record<string, number>,
        cats.split(",").map((s) => s.trim()).filter(Boolean),
        cities.split(",").map((s) => s.trim()).filter(Boolean),
      );
      if (recompute) await recomputeAllScores();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });

  const max = Math.max(1, ...distribution.map((d) => d.count));

  const Row = ({ k }: { k: keyof ScoreWeights }) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{LABELS[k]}</span>
      <input
        type="number"
        value={w[k]}
        onChange={(e) => setW((p) => ({ ...p, [k]: Number(e.target.value) }))}
        className="h-8 w-20 rounded-md border bg-card px-2 text-right text-sm"
      />
    </label>
  );

  return (
    <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-emerald-700">Bonus</h2>
        <div className="space-y-2">{BONUS.map((k) => <Row key={k} k={k} />)}</div>
        <h2 className="mb-3 mt-5 text-sm font-semibold text-red-700">Malus</h2>
        <div className="space-y-2">{MALUS.map((k) => <Row key={k} k={k} />)}</div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Cibles</h2>
          <label className="text-xs text-muted-foreground">Catégories cibles (séparées par virgule)</label>
          <textarea
            value={cats}
            onChange={(e) => setCats(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border bg-card p-2 text-sm"
          />
          <label className="mt-3 block text-xs text-muted-foreground">Villes cibles (optionnel)</label>
          <textarea
            value={cities}
            onChange={(e) => setCities(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border bg-card p-2 text-sm"
          />
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Distribution des scores</h2>
          {distribution.every((d) => d.count === 0) ? (
            <p className="text-sm text-muted-foreground">Importez des leads pour voir la distribution.</p>
          ) : (
            <div className="space-y-1.5">
              {distribution.map((d) => (
                <div key={d.bucket} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-muted-foreground">{d.bucket}</span>
                  <div className="h-4 flex-1 rounded bg-muted">
                    <div className="h-full rounded bg-accent" style={{ width: `${(d.count / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex items-center gap-2">
          <Button disabled={pending} onClick={() => save(true)}>
            Enregistrer + recalculer tout
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => save(false)}>
            Enregistrer seulement
          </Button>
          {saved && <span className="text-sm text-emerald-600">✓ Enregistré</span>}
        </div>
      </div>
    </div>
  );
}
