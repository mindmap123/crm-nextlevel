// Déduplication priorisée sur champs normalisés. Fonctions pures.
import { stripAccents } from "./normalize";

export type DedupStrength = "strong" | "weak" | "none";

export interface DedupCandidate {
  normPhone: string | null;
  normEmail: string | null;
  normDomain: string | null;
  normGoogleMapsUrl?: string | null;
  normName: string | null;
  normCity?: string | null;
  city?: string | null;
}

export interface DedupExisting extends DedupCandidate {
  id: string;
  // pour choisir le maître : plus de champs remplis + score plus haut
  filledCount?: number;
  score?: number;
}

export interface DedupMatch {
  existingId: string;
  strength: DedupStrength;
  reason: string;
}

const TRIGRAM_THRESHOLD = 0.6;

function cityKey(c?: string | null) {
  return c ? stripAccents(c.trim().toLowerCase()) : "";
}

function candidateCityKey(candidate: DedupCandidate) {
  return candidate.normCity ?? cityKey(candidate.city);
}

/** Similarité trigramme (équivalent applicatif de pg_trgm pour l'aperçu import). */
export function trigramSimilarity(a: string, b: string): number {
  const grams = (s: string) => {
    const p = `  ${s} `;
    const set = new Set<string>();
    for (let i = 0; i < p.length - 2; i++) set.add(p.slice(i, i + 3));
    return set;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  return inter / (ga.size + gb.size - inter);
}

/** Renvoie le meilleur match (forte > faible) parmi les existants, ou none. */
export function findDuplicate(
  candidate: DedupCandidate,
  existing: DedupExisting[],
): DedupMatch | { existingId: null; strength: "none"; reason: string } {
  // Clés fortes
  const strongMatches: Array<{ existing: DedupExisting; reason: string }> = [];
  const candidateCity = candidateCityKey(candidate);
  for (const e of existing) {
    const existingCity = e.normCity ?? cityKey(e.city);
    if (candidate.normPhone && e.normPhone && candidate.normPhone === e.normPhone)
      strongMatches.push({ existing: e, reason: "Téléphone identique" });
    if (candidate.normEmail && e.normEmail && candidate.normEmail === e.normEmail)
      strongMatches.push({ existing: e, reason: "Email identique" });
    if (candidate.normDomain && e.normDomain && candidate.normDomain === e.normDomain)
      strongMatches.push({ existing: e, reason: "Domaine identique" });
    if (
      candidate.normGoogleMapsUrl &&
      e.normGoogleMapsUrl &&
      candidate.normGoogleMapsUrl === e.normGoogleMapsUrl
    )
      strongMatches.push({ existing: e, reason: "URL Google Maps identique" });
    if (
      candidate.normName &&
      e.normName &&
      candidate.normName === e.normName &&
      candidateCity === existingCity &&
      candidateCity !== ""
    )
      strongMatches.push({ existing: e, reason: "Nom + ville identiques" });
  }
  if (strongMatches.length > 0) {
    const selected = strongMatches.reduce((best, next) =>
      pickMaster(best.existing, next.existing).id === next.existing.id ? next : best,
    );
    return { existingId: selected.existing.id, strength: "strong", reason: selected.reason };
  }

  // Clé faible : nom proche + même ville -> vérification manuelle
  let best: DedupMatch | null = null;
  let bestSim = 0;
  for (const e of existing) {
    if (!candidate.normName || !e.normName) continue;
    if (candidateCity !== (e.normCity ?? cityKey(e.city))) continue;
    const sim = trigramSimilarity(candidate.normName, e.normName);
    if (sim >= TRIGRAM_THRESHOLD && sim > bestSim) {
      bestSim = sim;
      best = {
        existingId: e.id,
        strength: "weak",
        reason: `Nom proche (${Math.round(sim * 100)}%) + même ville`,
      };
    }
  }
  if (best) return best;

  return { existingId: null, strength: "none", reason: "Aucun doublon détecté" };
}

/** Choisit le maître entre deux leads : le plus complet, puis le meilleur score. */
export function pickMaster(a: DedupExisting, b: DedupExisting): DedupExisting {
  const fa = a.filledCount ?? 0;
  const fb = b.filledCount ?? 0;
  if (fa !== fb) return fa > fb ? a : b;
  return (a.score ?? 0) >= (b.score ?? 0) ? a : b;
}
