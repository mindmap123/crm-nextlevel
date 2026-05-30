import type { Source, Status } from "@prisma/client";
import type { LeadIngestInput } from "./lead-ingest";

type RawLead = Record<string, unknown>;
type LeadField = keyof LeadIngestInput | "googleMapsUrl" | "priority" | "notes";

export type LeadPayloadResult =
  | { ok: true; lead: LeadIngestInput }
  | { ok: false; error: string; raw: RawLead };

const FIELD_ALIASES: Record<LeadField, string[]> = {
  companyName: [
    "companyname",
    "company",
    "businessname",
    "name",
    "nom",
    "nometablissement",
    "nomentreprise",
    "entreprise",
    "etablissement",
    "societe",
    "raison sociale",
  ],
  contactName: ["contactname", "contact", "nomcontact", "contactprincipal"],
  district: ["district", "area", "quartier", "zone"],
  phone: ["phone", "telephone", "tel", "mobile", "portable"],
  email: ["email", "mail", "e-mail", "courriel"],
  website: ["website", "site", "siteweb", "url", "web"],
  address: ["address", "adresse"],
  city: ["city", "ville", "commune"],
  source: ["source", "origine"],
  status: ["status", "statut"],
  category: ["category", "categorie", "catégorie", "secteur", "metier", "métier"],
  googleRating: ["googlerating", "rating", "note", "notegoogle", "etoiles", "étoiles"],
  reviewCount: ["reviewcount", "reviews", "avis", "nombredavis", "nbavis"],
  hasWebsite: ["haswebsite", "sitepresent", "asite", "siteoui"],
  technologies: ["technologies", "tech", "cms"],
  internalNotes: ["internalnotes", "notesinternes"],
  importBatchId: ["importbatchid"],
  score: ["score"],
  tags: ["tags"],
  googleMapsUrl: ["googlemapsurl", "urlgooglemaps", "googlemaps", "liengooglemaps", "lienmaps", "mapsurl", "maps"],
  priority: ["priority", "priorite", "priorité"],
  notes: ["notes", "noteinterne", "commentaire", "commentaires"],
};

function key(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function num(value: unknown): number | null {
  const s = text(value);
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function bool(value: unknown): boolean | undefined {
  const s = text(value);
  if (!s) return undefined;
  if (["1", "true", "yes", "oui", "o"].includes(s.toLowerCase())) return true;
  if (["0", "false", "no", "non", "n"].includes(s.toLowerCase())) return false;
  return undefined;
}

function source(value: unknown): Source {
  const s = text(value)?.toLowerCase();
  if (s?.includes("google")) return "GOOGLE_MAPS";
  if (s?.includes("sherlock")) return "SHERLOCK_MAPS";
  if (s?.includes("json")) return "IMPORT_JSON";
  if (s?.includes("manuel")) return "MANUEL";
  return "IMPORT_CSV";
}

function status(value: unknown): Status | undefined {
  const s = key(text(value) ?? "");
  const statuses: Status[] = [
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
  return statuses.find((candidate) => key(candidate) === s);
}

function valueFor(raw: RawLead, field: LeadField): unknown {
  const aliases = new Set(FIELD_ALIASES[field].map(key));
  for (const [rawKey, value] of Object.entries(raw)) {
    const normalized = key(rawKey);
    if (normalized === key(field) || aliases.has(normalized)) return value;
  }
  return undefined;
}

function combineNotes(notes: Array<string | null>) {
  const body = notes.filter(Boolean).join("\n");
  return body || null;
}

export function parseLeadPayloads(payload: unknown): RawLead[] {
  if (Array.isArray(payload)) return payload.filter((row): row is RawLead => Boolean(row) && typeof row === "object");
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;
  for (const key of ["leads", "rows", "data"]) {
    if (Array.isArray(obj[key])) {
      return (obj[key] as unknown[]).filter((row): row is RawLead => Boolean(row) && typeof row === "object");
    }
  }

  return [obj as RawLead];
}

export function mapLeadPayload(raw: RawLead): LeadPayloadResult {
  const companyName = text(valueFor(raw, "companyName"));
  if (!companyName) {
    return { ok: false, error: "Champ obligatoire manquant: companyName / Nom entreprise", raw };
  }

  const website = text(valueFor(raw, "website"));
  const hasWebsite = bool(valueFor(raw, "hasWebsite")) ?? Boolean(website);
  const technologies = text(valueFor(raw, "technologies"))
    ?.split(/[;,]/)
    .map((tech) => tech.trim())
    .filter(Boolean);
  const mapsUrl = text(valueFor(raw, "googleMapsUrl"));
  const priority = text(valueFor(raw, "priority"));
  const internalNotes = combineNotes([
    text(valueFor(raw, "notes")),
    text(valueFor(raw, "internalNotes")),
  ]);

  return {
    ok: true,
    lead: {
      companyName,
      contactName: text(valueFor(raw, "contactName")),
      district: text(valueFor(raw, "district")),
      phone: text(valueFor(raw, "phone")),
      email: text(valueFor(raw, "email")),
      website,
      address: text(valueFor(raw, "address")),
      city: text(valueFor(raw, "city")),
      googleMapsUrl: mapsUrl,
      source: source(valueFor(raw, "source")),
      status: status(valueFor(raw, "status")),
      category: text(valueFor(raw, "category")),
      googleRating: num(valueFor(raw, "googleRating")),
      reviewCount: num(valueFor(raw, "reviewCount")),
      hasWebsite,
      technologies: technologies ?? [],
      internalNotes,
      score: num(valueFor(raw, "score")),
      priority,
    },
  };
}

export function missingLeadFields(lead: LeadIngestInput) {
  const requiredForEnrichment: Array<keyof LeadIngestInput> = [
    "city",
    "phone",
    "website",
    "address",
    "googleMapsUrl",
    "reviewCount",
    "googleRating",
  ];
  return requiredForEnrichment.filter((field) => {
    const value = lead[field];
    return value === null || value === undefined || value === "";
  });
}
