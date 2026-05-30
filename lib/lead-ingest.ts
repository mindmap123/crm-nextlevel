import type { Lead, Prisma, PrismaClient, Tag } from "@prisma/client";
import { findDuplicate, type DedupExisting } from "./dedup";
import { normalizeLead } from "./normalize";
import {
  DEFAULT_TARGET_CATEGORIES,
  DEFAULT_TARGET_CITIES,
  DEFAULT_WEIGHTS,
  scoreLead,
  type ScoreInput,
  type ScoreWeights,
} from "./scoring";
import type { LeadInput } from "./types";

export interface LeadIngestInput extends LeadInput {
  internalNotes?: string | null;
  importBatchId?: string | null;
  tags?: Tag[];
  score?: number | null;
}

export interface LeadIngestResult {
  id: string;
  duplicate: boolean;
  created: boolean;
  updated: boolean;
  reason: string;
  updatedFields: string[];
}

function filledCount(lead: {
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  category?: string | null;
  googleRating?: number | null;
  reviewCount?: number | null;
  district?: string | null;
  googleMapsUrl?: string | null;
  priority?: string | null;
}) {
  return [
    lead.contactName,
    lead.phone,
    lead.email,
    lead.website,
    lead.address,
    lead.city,
    lead.category,
    lead.googleRating,
    lead.reviewCount,
    lead.district,
    lead.googleMapsUrl,
    lead.priority,
  ].filter((v) => v !== null && v !== undefined && v !== "").length;
}

function candidateWhere(norm: ReturnType<typeof normalizeLead>): Prisma.LeadWhereInput {
  const or = [
    norm.normPhone ? { normPhone: norm.normPhone } : undefined,
    norm.normEmail ? { normEmail: norm.normEmail } : undefined,
    norm.normDomain ? { normDomain: norm.normDomain } : undefined,
    norm.normGoogleMapsUrl ? { normGoogleMapsUrl: norm.normGoogleMapsUrl } : undefined,
    norm.normName && norm.normCity ? { normCity: norm.normCity } : undefined,
  ].filter(Boolean) as Prisma.LeadWhereInput[];

  return or.length > 0 ? { OR: or } : { id: "__no_dedup_candidates__" };
}

function toDedupExisting(
  lead: Pick<
    Lead,
    | "id"
    | "normPhone"
    | "normEmail"
    | "normDomain"
    | "normGoogleMapsUrl"
    | "normName"
    | "normCity"
    | "city"
    | "contactName"
    | "phone"
    | "email"
    | "website"
    | "address"
    | "category"
    | "googleRating"
    | "reviewCount"
    | "district"
    | "googleMapsUrl"
    | "priority"
    | "score"
  >,
): DedupExisting {
  return {
    id: lead.id,
    normPhone: lead.normPhone,
    normEmail: lead.normEmail,
    normDomain: lead.normDomain,
    normGoogleMapsUrl: lead.normGoogleMapsUrl,
    normName: lead.normName,
    normCity: lead.normCity,
    city: lead.city,
    filledCount: filledCount(lead),
    score: lead.score,
  };
}

async function getActiveConfig(client: PrismaClient) {
  const c = await client.scoreConfig.findUnique({ where: { id: 1 } });
  return {
    weights: { ...DEFAULT_WEIGHTS, ...((c?.weights as Partial<ScoreWeights>) ?? {}) },
    targetCategories: c?.targetCategories ?? DEFAULT_TARGET_CATEGORIES,
    targetCities: c?.targetCities ?? DEFAULT_TARGET_CITIES,
  };
}

async function computeScore(client: PrismaClient, input: ScoreInput) {
  const cfg = await getActiveConfig(client);
  return scoreLead(input, cfg.weights, cfg.targetCategories, cfg.targetCities);
}

function mergeTags(...sets: Array<Tag[] | undefined>) {
  return Array.from(new Set(sets.flatMap((set) => set ?? [])));
}

function isFilled(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== "";
}

function priorityTag(value?: string | null): Tag[] {
  const s = value?.trim().toLowerCase();
  if (!s) return [];
  if (["1", "true", "yes", "oui", "o", "prioritaire", "haute", "high", "urgent"].includes(s)) {
    return ["PRIORITAIRE"];
  }
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? ["PRIORITAIRE"] : [];
}

function appendConflictNote(existingNotes: string | null | undefined, source: string, conflicts: string[]) {
  if (conflicts.length === 0) return existingNotes;
  const block = [`Conflits import ${source}:`, ...conflicts.map((conflict) => `- ${conflict}`)].join("\n");
  return [existingNotes?.trim(), block].filter(Boolean).join("\n\n");
}

async function updateDuplicateMissingFields(
  client: PrismaClient,
  existingId: string,
  input: LeadIngestInput,
  norm: ReturnType<typeof normalizeLead>,
) {
  const existing = await client.lead.findUnique({ where: { id: existingId } });
  if (!existing) return { updated: false, updatedFields: [] };

  const data: Prisma.LeadUpdateInput = {};
  const updatedFields: string[] = [];
  const conflicts: string[] = [];
  const source = input.source ?? "IMPORT_CSV";

  const setIfMissing = <K extends keyof LeadIngestInput>(field: K, value: LeadIngestInput[K]) => {
    if (!isFilled(value)) return;
    const current = existing[field as keyof typeof existing];
    if (!isFilled(current)) {
      Object.assign(data, { [field]: value });
      updatedFields.push(String(field));
    } else if (String(current) !== String(value)) {
      conflicts.push(`${String(field)} existant="${String(current)}", import="${String(value)}"`);
    }
  };
  const setUniqueNormIfFree = async (
    field: "normPhone" | "normEmail" | "normDomain" | "normGoogleMapsUrl" | "normCity",
    value: string | null,
  ) => {
    if (!value || isFilled(existing[field])) return;
    const conflict = await client.lead.findFirst({
      where: { [field]: value, NOT: { id: existingId } },
      select: { id: true },
    });
    if (conflict) {
      conflicts.push(`${field} déjà lié au lead ${conflict.id}`);
      return;
    }
    Object.assign(data, { [field]: value });
  };

  setIfMissing("district", input.district);
  setIfMissing("phone", input.phone);
  setIfMissing("email", input.email);
  setIfMissing("website", input.website);
  setIfMissing("googleMapsUrl", input.googleMapsUrl);
  setIfMissing("address", input.address);
  setIfMissing("city", input.city);
  setIfMissing("category", input.category);
  setIfMissing("googleRating", input.googleRating);
  setIfMissing("reviewCount", input.reviewCount === null ? null : Math.round(input.reviewCount ?? 0));
  setIfMissing("priority", input.priority);
  setIfMissing("internalNotes", input.internalNotes);

  if (!existing.hasWebsite && input.hasWebsite) {
    data.hasWebsite = true;
    updatedFields.push("hasWebsite");
  }
  if (existing.technologies.length === 0 && input.technologies && input.technologies.length > 0) {
    data.technologies = input.technologies;
    updatedFields.push("technologies");
  }
  if (input.status && existing.status === "BRUT") {
    data.status = input.status;
    updatedFields.push("status");
  }
  if (typeof input.score === "number" && Number.isFinite(input.score) && existing.score === 0) {
    data.score = Math.max(0, Math.min(100, Math.round(input.score)));
    updatedFields.push("score");
  }
  await setUniqueNormIfFree("normPhone", norm.normPhone);
  await setUniqueNormIfFree("normEmail", norm.normEmail);
  await setUniqueNormIfFree("normDomain", norm.normDomain);
  await setUniqueNormIfFree("normGoogleMapsUrl", norm.normGoogleMapsUrl);
  await setUniqueNormIfFree("normCity", norm.normCity);

  const tags = mergeTags(existing.tags, priorityTag(input.priority));
  if (tags.length !== existing.tags.length) {
    data.tags = tags;
    updatedFields.push("tags");
  }

  const notesWithConflicts = appendConflictNote(
    (data.internalNotes as string | undefined) ?? existing.internalNotes,
    source,
    conflicts,
  );
  if (notesWithConflicts !== existing.internalNotes) {
    data.internalNotes = notesWithConflicts;
    if (!updatedFields.includes("internalNotes")) updatedFields.push("internalNotes");
  }

  if (Object.keys(data).length === 0) return { updated: false, updatedFields: [] };
  await client.lead.update({ where: { id: existingId }, data });
  return { updated: true, updatedFields };
}

export async function createLeadWithDedup(
  client: PrismaClient,
  input: LeadIngestInput,
  options: { activityBody?: string; duplicateActivityBody?: string } = {},
): Promise<LeadIngestResult> {
  const norm = normalizeLead(input);
  const candidates = await client.lead.findMany({
    where: candidateWhere(norm),
  });
  const match = findDuplicate(norm, candidates.map(toDedupExisting));

  if (match.strength === "strong" && match.existingId) {
    const updated = await updateDuplicateMissingFields(client, match.existingId, input, norm);
    await client.activity.create({
      data: {
        leadId: match.existingId,
        type: "dedup",
        body: options.duplicateActivityBody ?? `Création bloquée : doublon fort détecté (${match.reason})`,
      },
    });
    return {
      id: match.existingId,
      duplicate: true,
      created: false,
      updated: updated.updated,
      reason: match.reason,
      updatedFields: updated.updatedFields,
    };
  }

  const weakDuplicateTags =
    match.strength === "weak" && match.existingId ? (["DOUBLON", "A_VERIFIER"] as Tag[]) : [];
  const tags = mergeTags(input.tags, weakDuplicateTags, priorityTag(input.priority));
  const masterId = match.strength === "weak" ? match.existingId : null;
  const computed = await computeScore(client, { ...input, tags, masterId });
  const score =
    typeof input.score === "number" && Number.isFinite(input.score)
      ? Math.max(0, Math.min(100, Math.round(input.score)))
      : computed.score;

  const lead = await client.lead.create({
    data: {
      companyName: input.companyName,
      contactName: input.contactName,
      district: input.district,
      phone: input.phone,
      email: input.email,
      website: input.website,
      googleMapsUrl: input.googleMapsUrl,
      address: input.address,
      city: input.city,
      source: input.source,
      status: input.status,
      category: input.category,
      googleRating: input.googleRating,
      reviewCount:
        input.reviewCount === undefined || input.reviewCount === null
          ? input.reviewCount
          : Math.round(input.reviewCount),
      hasWebsite: input.hasWebsite,
      technologies: input.technologies,
      internalNotes: input.internalNotes,
      priority: input.priority,
      importBatchId: input.importBatchId,
      ...norm,
      tags,
      masterId,
      score,
      scoreBreakdown: computed.breakdown as unknown as Prisma.InputJsonValue,
    },
  });

  await client.activity.create({
    data: { leadId: lead.id, type: "note", body: options.activityBody ?? "Lead créé" },
  });
  if (masterId) {
    await client.activity.create({
      data: { leadId: lead.id, type: "dedup", body: `Doublon potentiel de ${masterId}` },
    });
  }

  return {
    id: lead.id,
    duplicate: Boolean(masterId),
    created: true,
    updated: false,
    reason: match.reason,
    updatedFields: [],
  };
}
