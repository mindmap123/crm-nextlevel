import type { Prisma, Status, Tag, Source } from "@prisma/client";
import { STATUSES, TAGS } from "./constants";

export interface LeadFilters {
  q?: string;
  status?: Status;
  tag?: Tag;
  city?: string;
  source?: Source;
  scoreMin?: number;
  hasWebsite?: "yes" | "no";
  hasPhone?: "yes";
  hasEmail?: "yes";
  sort?: "score" | "recent" | "name";
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): LeadFilters {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const status = get("status");
  const tag = get("tag");
  const source = get("source");
  const scoreMin = get("scoreMin");
  return {
    q: get("q") || undefined,
    status: STATUSES.includes(status as Status) ? (status as Status) : undefined,
    tag: TAGS.includes(tag as Tag) ? (tag as Tag) : undefined,
    city: get("city") || undefined,
    source: (["GOOGLE_MAPS", "SHERLOCK_MAPS", "MANUEL", "IMPORT_CSV", "IMPORT_JSON"].includes(
      source ?? "",
    )
      ? source
      : undefined) as Source | undefined,
    scoreMin: scoreMin ? Number(scoreMin) : undefined,
    hasWebsite: get("hasWebsite") === "yes" ? "yes" : get("hasWebsite") === "no" ? "no" : undefined,
    hasPhone: get("hasPhone") === "yes" ? "yes" : undefined,
    hasEmail: get("hasEmail") === "yes" ? "yes" : undefined,
    sort: (["score", "recent", "name"].includes(get("sort") ?? "")
      ? get("sort")
      : "score") as LeadFilters["sort"],
  };
}

export function buildWhere(f: LeadFilters): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  const and: Prisma.LeadWhereInput[] = [];

  if (f.q) {
    and.push({
      OR: [
        { companyName: { contains: f.q, mode: "insensitive" } },
        { contactName: { contains: f.q, mode: "insensitive" } },
        { city: { contains: f.q, mode: "insensitive" } },
        { category: { contains: f.q, mode: "insensitive" } },
        { email: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  if (f.status) and.push({ status: f.status });
  if (f.tag) and.push({ tags: { has: f.tag } });
  if (f.city) and.push({ city: { contains: f.city, mode: "insensitive" } });
  if (f.source) and.push({ source: f.source });
  if (f.scoreMin !== undefined) and.push({ score: { gte: f.scoreMin } });
  if (f.hasWebsite === "yes") and.push({ hasWebsite: true });
  if (f.hasWebsite === "no") and.push({ hasWebsite: false });
  if (f.hasPhone === "yes") and.push({ NOT: { phone: null } });
  if (f.hasEmail === "yes") and.push({ NOT: { email: null } });

  if (and.length) where.AND = and;
  return where;
}

export function buildOrderBy(f: LeadFilters): Prisma.LeadOrderByWithRelationInput {
  if (f.sort === "recent") return { createdAt: "desc" };
  if (f.sort === "name") return { companyName: "asc" };
  return { score: "desc" };
}
