import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { parseFilters, buildWhere, buildOrderBy } from "@/lib/filters";
import { STATUS_LABEL, TAG_LABEL, SOURCE_LABEL } from "@/lib/constants";

const COLUMNS: Record<string, (l: Record<string, unknown>) => string | number | null> = {
  companyName: (l) => l.companyName as string,
  contactName: (l) => (l.contactName as string) ?? "",
  phone: (l) => (l.phone as string) ?? "",
  email: (l) => (l.email as string) ?? "",
  website: (l) => (l.website as string) ?? "",
  address: (l) => (l.address as string) ?? "",
  city: (l) => (l.city as string) ?? "",
  category: (l) => (l.category as string) ?? "",
  source: (l) => SOURCE_LABEL[l.source as keyof typeof SOURCE_LABEL] ?? "",
  googleRating: (l) => (l.googleRating as number) ?? "",
  reviewCount: (l) => (l.reviewCount as number) ?? "",
  hasWebsite: (l) => (l.hasWebsite ? "Oui" : "Non"),
  score: (l) => l.score as number,
  status: (l) => STATUS_LABEL[l.status as keyof typeof STATUS_LABEL] ?? "",
  tags: (l) => (l.tags as string[]).map((t) => TAG_LABEL[t as keyof typeof TAG_LABEL]).join("; "),
};
const EXPORT_LIMIT = 5000;

function csvCell(v: string | number | null): string {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const format = sp.format === "json" ? "json" : "csv";
  const cols = (sp.cols ? sp.cols.split(",") : Object.keys(COLUMNS)).filter((c) => c in COLUMNS);

  const filters = parseFilters(sp);
  const where = sp.scope === "all" ? {} : buildWhere(filters);
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: buildOrderBy(filters), take: EXPORT_LIMIT }),
    prisma.lead.count({ where }),
  ]);
  const exportHeaders = {
    "X-Total-Count": String(total),
    "X-Exported-Count": String(leads.length),
    "X-Result-Limit": String(EXPORT_LIMIT),
  };

  if (format === "json") {
    const data = leads.map((l) =>
      Object.fromEntries(cols.map((c) => [c, COLUMNS[c](l as unknown as Record<string, unknown>)])),
    );
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        ...exportHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="leads-${Date.now()}.json"`,
      },
    });
  }

  const header = cols.join(",");
  const body = leads
    .map((l) => cols.map((c) => csvCell(COLUMNS[c](l as unknown as Record<string, unknown>))).join(","))
    .join("\n");
  const csv = `${header}\n${body}`;
  return new Response(csv, {
    headers: {
      ...exportHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${Date.now()}.csv"`,
    },
  });
}
