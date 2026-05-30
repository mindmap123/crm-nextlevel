import type { LeadInput } from "./types";

type RawLead = Record<string, unknown>;

export type LeadPayloadResult =
  | { ok: true; lead: LeadInput }
  | { ok: false; error: string; raw: RawLead };

const FIELD_ALIASES: Record<keyof LeadInput, string[]> = {
  companyName: ["companyname", "company", "businessname", "name", "nom", "nomentreprise", "entreprise", "societe", "raison sociale"],
  contactName: ["contactname", "contact", "nomcontact", "contactprincipal"],
  phone: ["phone", "telephone", "tel", "mobile", "portable"],
  email: ["email", "mail", "e-mail", "courriel"],
  website: ["website", "site", "siteweb", "url", "web"],
  address: ["address", "adresse"],
  city: ["city", "ville", "commune"],
  source: ["source", "origine"],
  category: ["category", "categorie", "catégorie", "secteur", "metier", "métier"],
  googleRating: ["googlerating", "rating", "note", "notegoogle", "etoiles", "étoiles"],
  reviewCount: ["reviewcount", "reviews", "avis", "nombredavis", "nbavis"],
  hasWebsite: ["haswebsite", "sitepresent", "asite", "siteoui"],
  technologies: ["technologies", "tech", "cms"],
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

function source(value: unknown): LeadInput["source"] {
  const s = text(value)?.toLowerCase();
  if (s?.includes("google")) return "GOOGLE_MAPS";
  if (s?.includes("sherlock")) return "SHERLOCK_MAPS";
  if (s?.includes("json")) return "IMPORT_JSON";
  if (s?.includes("manuel")) return "MANUEL";
  return "IMPORT_CSV";
}

function valueFor(raw: RawLead, field: keyof LeadInput): unknown {
  const aliases = new Set(FIELD_ALIASES[field].map(key));
  for (const [rawKey, value] of Object.entries(raw)) {
    const normalized = key(rawKey);
    if (normalized === key(field) || aliases.has(normalized)) return value;
  }
  return undefined;
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

  return {
    ok: true,
    lead: {
      companyName,
      contactName: text(valueFor(raw, "contactName")),
      phone: text(valueFor(raw, "phone")),
      email: text(valueFor(raw, "email")),
      website,
      address: text(valueFor(raw, "address")),
      city: text(valueFor(raw, "city")),
      source: source(valueFor(raw, "source")),
      category: text(valueFor(raw, "category")),
      googleRating: num(valueFor(raw, "googleRating")),
      reviewCount: num(valueFor(raw, "reviewCount")),
      hasWebsite,
      technologies: technologies ?? [],
    },
  };
}
