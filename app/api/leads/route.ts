import { NextRequest } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { createLeadWithDedup } from "@/lib/lead-ingest";
import { mapLeadPayload, missingLeadFields, parseLeadPayloads } from "@/lib/lead-api";

export const dynamic = "force-dynamic";

async function readPayload(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("text/csv")) {
    const csv = await req.text();
    const parsed = Papa.parse<Record<string, unknown>>(csv, {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors.map((error) => error.message).join("; "));
    }
    return parsed.data;
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (file instanceof File) {
      const text = await file.text();
      if (file.name.endsWith(".csv") || file.type.includes("csv")) {
        const parsed = Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: true,
        });
        if (parsed.errors.length > 0) {
          throw new Error(parsed.errors.map((error) => error.message).join("; "));
        }
        return parsed.data;
      }
      return JSON.parse(text);
    }
    return Object.fromEntries(form.entries());
  }

  return req.json();
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const payload = await readPayload(req);
    const rows = parseLeadPayloads(payload);
    const results = {
      requestId,
      created: 0,
      updated: 0,
      duplicates: 0,
      errors: [] as Array<{ row: number; error: string }>,
      missingFields: [] as Array<{ row: number; fields: string[] }>,
      leads: [] as Array<{ row: number; id: string; created: boolean; updated: boolean; duplicate: boolean }>,
    };

    for (const [index, row] of rows.entries()) {
      const mapped = mapLeadPayload(row);
      if (!mapped.ok) {
        results.errors.push({ row: index + 1, error: mapped.error });
        continue;
      }
      const rowMissingFields = missingLeadFields(mapped.lead);
      if (rowMissingFields.length > 0) {
        results.missingFields.push({ row: index + 1, fields: rowMissingFields.map(String) });
      }

      const result = await createLeadWithDedup(prisma, mapped.lead, {
        activityBody: "Lead créé via API",
        duplicateActivityBody: "Import API bloqué : doublon fort détecté",
      });
      if (result.created) {
        results.created++;
      }
      if (result.duplicate) results.duplicates++;
      if (result.updated) results.updated++;
      results.leads.push({
        row: index + 1,
        id: result.id,
        created: result.created,
        updated: result.updated,
        duplicate: result.duplicate,
      });
    }

    console.info("[api/leads] import completed", {
      requestId,
      rows: rows.length,
      created: results.created,
      updated: results.updated,
      duplicates: results.duplicates,
      errors: results.errors.length,
      durationMs: Date.now() - startedAt,
    });

    return Response.json(results, {
      status: results.created > 0 || results.duplicates > 0 ? 201 : 400,
    });
  } catch (error) {
    console.error("[api/leads] import failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return Response.json(
      {
        requestId,
        error: "Import impossible",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
