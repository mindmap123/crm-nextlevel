// Normalisation des champs pour la déduplication. Fonctions pures, testables.

const LEGAL_SUFFIXES = [
  "sarl",
  "sas",
  "sasu",
  "eurl",
  "sa",
  "sci",
  "snc",
  "scop",
  "earl",
  "gie",
  "auto entrepreneur",
  "micro entreprise",
  "ei",
  "eirl",
];

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Téléphone -> chiffres seuls, garde les 9 derniers (numéro national FR sans le 0). */
export function normalizePhone(input?: string | null): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length < 6) return null;
  // retire indicatif type 33 / 0033 puis le 0 de tête
  let national = digits;
  if (national.startsWith("0033")) national = national.slice(4);
  else if (national.startsWith("33") && national.length > 9) national = national.slice(2);
  national = national.replace(/^0+/, "");
  return national.slice(-9) || null;
}

export function normalizeEmail(input?: string | null): string | null {
  if (!input) return null;
  const e = input.trim().toLowerCase();
  return e.includes("@") ? e : null;
}

/** Domaine -> host sans www, en minuscules. Accepte url nue ou avec schéma. */
export function normalizeDomain(input?: string | null): string | null {
  if (!input) return null;
  let raw = input.trim().toLowerCase();
  if (!raw) return null;
  raw = raw.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const host = raw.split(/[/?#]/)[0];
  if (!host || !host.includes(".")) return null;
  return host;
}

export function normalizeGoogleMapsUrl(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    const normalized = url.toString().replace(/\/$/, "");
    return normalized || null;
  } catch {
    return raw.replace(/\s+/g, "").replace(/\/$/, "") || null;
  }
}

export function normalizeName(input?: string | null): string | null {
  if (!input) return null;
  let s = stripAccents(input.toLowerCase());
  s = s.replace(/[^a-z0-9\s]/g, " ");
  const words = s
    .split(/\s+/)
    .filter((w) => w && !LEGAL_SUFFIXES.includes(w));
  const joined = words.join(" ").trim();
  return joined || null;
}

export function normalizeCity(input?: string | null): string | null {
  if (!input) return null;
  let s = stripAccents(input.toLowerCase());
  s = s.replace(/[^a-z0-9\s]/g, " ");
  const joined = s.split(/\s+/).filter(Boolean).join(" ").trim();
  return joined || null;
}

export interface NormalizedKeys {
  normPhone: string | null;
  normEmail: string | null;
  normDomain: string | null;
  normGoogleMapsUrl: string | null;
  normName: string | null;
  normCity: string | null;
}

export function normalizeLead(lead: {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  googleMapsUrl?: string | null;
  companyName?: string | null;
  city?: string | null;
}): NormalizedKeys {
  return {
    normPhone: normalizePhone(lead.phone),
    normEmail: normalizeEmail(lead.email),
    normDomain: normalizeDomain(lead.website),
    normGoogleMapsUrl: normalizeGoogleMapsUrl(lead.googleMapsUrl),
    normName: normalizeName(lead.companyName),
    normCity: normalizeCity(lead.city),
  };
}
