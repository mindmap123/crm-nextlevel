// Scoring lisible, modifiable. Score borné 0..100, breakdown détaillé.
import { clamp } from "./utils";

export interface ScoreWeights {
  siteActifFaible: number;
  categorieAlignee: number;
  contactFacile: number;
  bonSignalLocal: number;
  bonsAvis: number;
  doublon: number;
  donneesIncompletes: number;
  horsCible: number;
  sansContact: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  // Bonus
  siteActifFaible: 25,
  categorieAlignee: 20,
  contactFacile: 15,
  bonSignalLocal: 10,
  bonsAvis: 10,
  // Malus
  doublon: -25,
  donneesIncompletes: -20,
  horsCible: -30,
  sansContact: -15,
};

export const DEFAULT_TARGET_CATEGORIES = [
  "restaurant",
  "coiffeur",
  "garage",
  "plombier",
  "electricien",
  "immobilier",
  "agence",
  "artisan",
  "salle de sport",
  "esthetique",
];

export const DEFAULT_TARGET_CITIES: string[] = [];

// Technos signalant un site faible / moyen = opportunité refonte.
const WEAK_TECH = [
  "wix",
  "wordpress",
  "weebly",
  "jimdo",
  "godaddy",
  "1and1",
  "ionos",
  "joomla",
  "wibsite",
  "site builder",
];

export interface ScoreInput {
  companyName?: string | null;
  category?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  hasWebsite?: boolean | null;
  technologies?: string[] | null;
  googleRating?: number | null;
  reviewCount?: number | null;
  tags?: string[] | null;
  masterId?: string | null;
}

export interface ScoreLine {
  key: keyof ScoreWeights;
  label: string;
  points: number;
}

export interface ScoreResult {
  score: number;
  breakdown: ScoreLine[];
}

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

function lower(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

export function isWeakSite(input: ScoreInput): boolean {
  if (input.tags?.includes("SITE_FAIBLE")) return true;
  if (!input.hasWebsite) return false;
  const techs = (input.technologies ?? []).map(lower);
  if (techs.length === 0) return true; // site présent, aucune techno moderne détectée
  return techs.some((t) => WEAK_TECH.some((w) => t.includes(w)));
}

export function scoreLead(
  input: ScoreInput,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  targetCategories: string[] = DEFAULT_TARGET_CATEGORIES,
  targetCities: string[] = DEFAULT_TARGET_CITIES,
): ScoreResult {
  const lines: ScoreLine[] = [];
  const add = (key: keyof ScoreWeights) =>
    lines.push({ key, label: LABELS[key], points: weights[key] });

  const cat = lower(input.category);
  const city = lower(input.city);
  const hasPhone = !!lower(input.phone);
  const hasEmail = !!lower(input.email);
  const isDuplicate = !!input.masterId || !!input.tags?.includes("DOUBLON");

  // Bonus
  if (isWeakSite(input)) add("siteActifFaible");
  if (cat && targetCategories.some((c) => cat.includes(lower(c)))) add("categorieAlignee");
  if (hasPhone && hasEmail) add("contactFacile");
  if (targetCities.length > 0 && city && targetCities.some((c) => city.includes(lower(c))))
    add("bonSignalLocal");
  if ((input.googleRating ?? 0) >= 4 && (input.reviewCount ?? 0) >= 10) add("bonsAvis");

  // Malus
  if (isDuplicate) add("doublon");
  if (!input.companyName || !cat) add("donneesIncompletes");
  if (cat && !targetCategories.some((c) => cat.includes(lower(c)))) add("horsCible");
  if (!hasPhone && !hasEmail) add("sansContact");

  const raw = lines.reduce((sum, l) => sum + l.points, 0);
  return { score: clamp(raw, 0, 100), breakdown: lines };
}
