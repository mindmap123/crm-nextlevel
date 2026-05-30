import type { Source, Status, Tag } from "@prisma/client";

export const STATUSES: Status[] = [
  "BRUT",
  "A_ENRICHIR",
  "A_QUALIFIER",
  "QUALIFIE",
  "A_CONTACTER",
  "CONTACTE",
  "EN_DISCUSSION",
  "PERDU",
  "GAGNE",
];

export const STATUS_LABEL: Record<Status, string> = {
  BRUT: "Brut",
  A_ENRICHIR: "À enrichir",
  A_QUALIFIER: "À qualifier",
  QUALIFIE: "Qualifié",
  A_CONTACTER: "À contacter",
  CONTACTE: "Contacté",
  EN_DISCUSSION: "En discussion",
  PERDU: "Perdu",
  GAGNE: "Gagné",
};

// classes Tailwind par statut (badge)
export const STATUS_CLASS: Record<Status, string> = {
  BRUT: "bg-zinc-100 text-zinc-700",
  A_ENRICHIR: "bg-amber-100 text-amber-800",
  A_QUALIFIER: "bg-sky-100 text-sky-800",
  QUALIFIE: "bg-indigo-100 text-indigo-800",
  A_CONTACTER: "bg-violet-100 text-violet-800",
  CONTACTE: "bg-blue-100 text-blue-800",
  EN_DISCUSSION: "bg-cyan-100 text-cyan-800",
  PERDU: "bg-red-100 text-red-700",
  GAGNE: "bg-emerald-100 text-emerald-800",
};

export const TAGS: Tag[] = [
  "LOCAL",
  "SITE_FAIBLE",
  "SANS_SITE",
  "BON_POTENTIEL",
  "A_VERIFIER",
  "DOUBLON",
  "PRIORITAIRE",
];

export const TAG_LABEL: Record<Tag, string> = {
  LOCAL: "Local",
  SITE_FAIBLE: "Site faible",
  SANS_SITE: "Sans site",
  BON_POTENTIEL: "Bon potentiel",
  A_VERIFIER: "À vérifier",
  DOUBLON: "Doublon",
  PRIORITAIRE: "Prioritaire",
};

export const TAG_CLASS: Record<Tag, string> = {
  LOCAL: "bg-zinc-100 text-zinc-700",
  SITE_FAIBLE: "bg-amber-100 text-amber-800",
  SANS_SITE: "bg-orange-100 text-orange-800",
  BON_POTENTIEL: "bg-emerald-100 text-emerald-800",
  A_VERIFIER: "bg-yellow-100 text-yellow-800",
  DOUBLON: "bg-red-100 text-red-700",
  PRIORITAIRE: "bg-violet-100 text-violet-800",
};

export const SOURCE_LABEL: Record<Source, string> = {
  GOOGLE_MAPS: "Google Maps",
  SHERLOCK_MAPS: "SherlockMaps",
  MANUEL: "Manuel",
  IMPORT_CSV: "Import CSV",
  IMPORT_JSON: "Import JSON",
};

export function scoreClass(score: number): string {
  if (score >= 70) return "bg-emerald-100 text-emerald-800";
  if (score >= 45) return "bg-amber-100 text-amber-800";
  if (score >= 20) return "bg-orange-100 text-orange-800";
  return "bg-zinc-100 text-zinc-600";
}
