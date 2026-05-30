"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, Status, Tag, Source, ImportFormat } from "@prisma/client";
import { prisma } from "./db";
import { normalizeLead } from "./normalize";
import { scoreLead, type ScoreInput } from "./scoring";
import { getActiveConfig } from "./config";
import { createLeadWithDedup, type LeadIngestInput } from "./lead-ingest";
import type { LeadInput, ImportRow, ImportChunkResult } from "./types";

async function computeScore(input: ScoreInput) {
  const cfg = await getActiveConfig();
  return scoreLead(input, cfg.weights, cfg.targetCategories, cfg.targetCities);
}

async function logActivity(leadId: string, type: string, body: string) {
  await prisma.activity.create({ data: { leadId, type, body } });
}

function revalidateLeadSurfaces(id?: string) {
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  if (id) revalidatePath(`/leads/${id}`);
}

// ---------- CRUD lead ----------

export async function createLeadFromApi(input: LeadIngestInput) {
  const result = await createLeadWithDedup(prisma, input, {
    activityBody: "Lead créé manuellement",
    duplicateActivityBody: "Création manuelle bloquée : doublon fort détecté",
  });
  revalidateLeadSurfaces(result.id);
  return { id: result.id, duplicate: result.duplicate };
}

export async function createLead(input: LeadInput) {
  const result = await createLeadFromApi(input);
  return result.id;
}

export async function updateLead(id: string, input: Partial<LeadInput>) {
  const current = await prisma.lead.findUniqueOrThrow({ where: { id } });
  const merged = { ...current, ...input };
  const norm = normalizeLead(merged);
  const { score, breakdown } = await computeScore({
    ...merged,
    tags: merged.tags,
    masterId: merged.masterId,
  });
  await prisma.lead.update({
    where: { id },
    data: {
      ...input,
      ...norm,
      score,
      scoreBreakdown: breakdown as unknown as Prisma.InputJsonValue,
    },
  });
  revalidateLeadSurfaces(id);
}

export async function setStatus(id: string, status: Status) {
  await prisma.lead.update({ where: { id }, data: { status } });
  await logActivity(id, "status_change", `Statut → ${status}`);
  revalidateLeadSurfaces(id);
}

export async function setTags(id: string, tags: Tag[]) {
  const current = await prisma.lead.findUniqueOrThrow({ where: { id } });
  const { score, breakdown } = await computeScore({ ...current, tags });
  await prisma.lead.update({
    where: { id },
    data: { tags, score, scoreBreakdown: breakdown as unknown as Prisma.InputJsonValue },
  });
  revalidateLeadSurfaces(id);
}

export async function addNote(id: string, body: string) {
  if (!body.trim()) return;
  await logActivity(id, "note", body.trim());
  revalidatePath(`/leads/${id}`);
}

export async function setInternalNotes(id: string, notes: string) {
  await prisma.lead.update({ where: { id }, data: { internalNotes: notes } });
  revalidatePath(`/leads/${id}`);
}

export async function setNextAction(id: string, action: string, at?: string | null) {
  await prisma.lead.update({
    where: { id },
    data: { nextAction: action || null, nextActionAt: at ? new Date(at) : null },
  });
  revalidatePath(`/leads/${id}`);
}

// Action manuelle explicite — aucun envoi automatique.
export async function logManualContact(id: string) {
  await prisma.lead.update({
    where: { id },
    data: { lastContactAt: new Date(), status: "CONTACTE" },
  });
  await logActivity(id, "manual_contact", "Contact effectué manuellement");
  revalidateLeadSurfaces(id);
}

export async function deleteLeads(ids: string[]) {
  await prisma.lead.deleteMany({ where: { id: { in: ids } } });
  revalidateLeadSurfaces();
}

// ---------- bulk ----------

export async function bulkSetStatus(ids: string[], status: Status) {
  await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { status } });
  revalidateLeadSurfaces();
}

export async function bulkAddTag(ids: string[], tag: Tag) {
  const leads = await prisma.lead.findMany({ where: { id: { in: ids } } });
  for (const l of leads) {
    if (!l.tags.includes(tag)) {
      const tags = [...l.tags, tag];
      const { score, breakdown } = await computeScore({ ...l, tags });
      await prisma.lead.update({
        where: { id: l.id },
        data: { tags, score, scoreBreakdown: breakdown as unknown as Prisma.InputJsonValue },
      });
    }
  }
  revalidateLeadSurfaces();
}

// ---------- doublons ----------

export async function linkDuplicate(id: string, masterId: string) {
  if (id === masterId) return;
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id } });
  const tags = Array.from(new Set([...lead.tags, "DOUBLON" as Tag]));
  await prisma.lead.update({ where: { id }, data: { masterId, tags } });
  await logActivity(id, "dedup", `Marqué doublon de ${masterId}`);
  await logActivity(masterId, "dedup", `Doublon rattaché : ${id}`);
  revalidateLeadSurfaces(id);
}

export async function unlinkDuplicate(id: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id } });
  await prisma.lead.update({
    where: { id },
    data: { masterId: null, tags: lead.tags.filter((t) => t !== "DOUBLON") },
  });
  revalidateLeadSurfaces(id);
}

// ---------- tâches ----------

export async function addTask(leadId: string, title: string, dueAt?: string | null) {
  if (!title.trim()) return;
  await prisma.task.create({
    data: { leadId, title: title.trim(), dueAt: dueAt ? new Date(dueAt) : null },
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/tasks");
}

export async function toggleTask(taskId: string) {
  const t = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  await prisma.task.update({
    where: { id: taskId },
    data: { status: t.status === "DONE" ? "TODO" : "DONE" },
  });
  revalidatePath("/tasks");
  revalidatePath(`/leads/${t.leadId}`);
}

export async function deleteTask(taskId: string) {
  const t = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/tasks");
  revalidatePath(`/leads/${t.leadId}`);
}

// ---------- scoring ----------

export async function saveScoreConfig(
  weights: Record<string, number>,
  targetCategories: string[],
  targetCities: string[],
) {
  await prisma.scoreConfig.upsert({
    where: { id: 1 },
    update: { weights: weights as Prisma.InputJsonValue, targetCategories, targetCities },
    create: { id: 1, weights: weights as Prisma.InputJsonValue, targetCategories, targetCities },
  });
  revalidatePath("/scoring");
}

export async function recomputeAllScores() {
  const cfg = await getActiveConfig();
  const leads = await prisma.lead.findMany();
  for (const l of leads) {
    const { score, breakdown } = scoreLead(
      { ...l, tags: l.tags, masterId: l.masterId },
      cfg.weights,
      cfg.targetCategories,
      cfg.targetCities,
    );
    if (score !== l.score) {
      await prisma.lead.update({
        where: { id: l.id },
        data: { score, scoreBreakdown: breakdown as unknown as Prisma.InputJsonValue },
      });
    }
  }
  revalidateLeadSurfaces();
  revalidatePath("/scoring");
}

// ---------- import (par chunks, anti-timeout) ----------

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function rowSource(s?: string): Source {
  const v = (s ?? "").toLowerCase();
  if (v.includes("google")) return "GOOGLE_MAPS";
  if (v.includes("sherlock")) return "SHERLOCK_MAPS";
  return "IMPORT_CSV";
}

function rowStatus(s?: string): Status | undefined {
  const value = (s ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
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
  return statuses.find((status) => status === value);
}

export async function commitImportChunk(
  batchId: string | null,
  filename: string,
  format: ImportFormat,
  rows: ImportRow[],
  totalRows: number,
  startCursor: number,
): Promise<ImportChunkResult> {
  let batch = batchId
    ? await prisma.importBatch.findUnique({ where: { id: batchId } })
    : null;
  if (!batch) {
    batch = await prisma.importBatch.create({
      data: { filename, format, rowCount: totalRows },
    });
  }

  let imported = 0;
  let duplicates = 0;
  let toVerify = 0;
  let errors = 0;

  for (const row of rows) {
    if (!row.companyName?.trim()) {
      errors++;
      continue;
    }
    const base = {
      companyName: row.companyName.trim(),
      contactName: row.contactName || null,
      district: row.district || null,
      phone: row.phone || null,
      email: row.email || null,
      website: row.website || null,
      googleMapsUrl: row.googleMapsUrl || null,
      address: row.address || null,
      city: row.city || null,
      category: row.category || null,
      source: rowSource(row.source),
      status: rowStatus(row.status),
      googleRating: toNum(row.googleRating),
      reviewCount: toNum(row.reviewCount),
      score: toNum(row.score),
      priority: row.priority || null,
      internalNotes: row.internalNotes || null,
      hasWebsite: !!(row.website && row.website.trim()),
      technologies: [] as string[],
    };
    const tags: Tag[] = base.hasWebsite ? [] : ["SANS_SITE"];
    const result = await createLeadWithDedup(
      prisma,
      { ...base, tags, importBatchId: batch.id },
      {
        activityBody: `Lead créé pendant l'import ${batch.filename}`,
        duplicateActivityBody: `Doublon fort ignoré pendant l'import ${batch.filename}`,
      },
    );

    if (!result.created) {
      duplicates++;
      continue;
    }

    if (result.duplicate) {
      toVerify++;
    } else {
      imported++;
    }
  }

  const newCursor = startCursor + rows.length;
  const done = newCursor >= totalRows;
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      cursor: newCursor,
      done,
      importedCount: { increment: imported },
      duplicateCount: { increment: duplicates + toVerify },
      errorCount: { increment: errors },
    },
  });

  if (done) {
    revalidateLeadSurfaces();
  }

  return {
    batchId: batch.id,
    imported,
    duplicates,
    toVerify,
    errors,
    cursor: newCursor,
    done,
  };
}

export async function rollbackImportBatch(batchId: string) {
  const batch = await prisma.importBatch.findUniqueOrThrow({ where: { id: batchId } });
  const deleted = await prisma.lead.deleteMany({ where: { importBatchId: batch.id } });
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      done: false,
      cursor: 0,
      importedCount: 0,
      duplicateCount: 0,
      errorCount: 0,
    },
  });
  revalidateLeadSurfaces();
  return deleted.count;
}
