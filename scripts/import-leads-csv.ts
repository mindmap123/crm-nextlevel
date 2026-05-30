import { readFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import Papa from "papaparse";
import { createLeadWithDedup } from "../lib/lead-ingest";
import { mapLeadPayload, missingLeadFields } from "../lib/lead-api";

interface ImportError {
  row: number;
  error: string;
}

interface Duplicate {
  row: number;
  id: string;
  reason: string;
}

function configureEnv() {
  const { loadEnvConfig } = nextEnv;
  loadEnvConfig(process.cwd());

  if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
  }
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL_UNPOOLED;
  }

  const missing = ["DATABASE_URL", "DIRECT_URL"].filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Configuration Neon incomplète. Variable(s) manquante(s): ${missing.join(", ")}`);
  }
}

function usage() {
  return [
    "Usage:",
    "  npm run import:leads -- /chemin/vers/fichier.csv",
    "  pnpm import:leads /chemin/vers/fichier.csv",
  ].join("\n");
}

async function main() {
  const startedAt = performance.now();
  configureEnv();

  const fileArg = process.argv[2];
  if (!fileArg) throw new Error(`Fichier CSV manquant.\n${usage()}`);

  const filePath = path.resolve(fileArg);
  const csv = await readFile(filePath, "utf8");
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => `ligne ${error.row ?? "?"}: ${error.message}`).join("\n"));
  }

  const prisma = new PrismaClient();
  const createdIds: string[] = [];
  const updatedIds: string[] = [];
  const duplicates: Duplicate[] = [];
  const errors: ImportError[] = [];
  const missingFields: Array<{ row: number; fields: string[] }> = [];

  try {
    for (const [index, row] of parsed.data.entries()) {
      const line = index + 2;
      const mapped = mapLeadPayload(row);
      if (!mapped.ok) {
        errors.push({ row: line, error: mapped.error });
        continue;
      }
      const rowMissingFields = missingLeadFields(mapped.lead);
      if (rowMissingFields.length > 0) {
        missingFields.push({ row: line, fields: rowMissingFields.map(String) });
      }

      try {
        const result = await createLeadWithDedup(prisma, mapped.lead, {
          activityBody: `Lead créé via import CSV serveur (${path.basename(filePath)})`,
          duplicateActivityBody: `Import CSV serveur ignoré : doublon fort détecté (${path.basename(filePath)})`,
        });

        if (result.created) {
          createdIds.push(result.id);
        } else {
          duplicates.push({ row: line, id: result.id, reason: result.reason });
        }
        if (result.updated) {
          updatedIds.push(result.id);
        }
      } catch (error) {
        errors.push({
          row: line,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  const durationMs = Math.round(performance.now() - startedAt);
  const report = {
    file: filePath,
    rowsDetected: parsed.data.length,
    created: createdIds.length,
    updated: updatedIds.length,
    duplicatesIgnored: duplicates.length,
    errors: errors.length,
    missingFields,
    durationMs,
    createdIds,
    updatedIds,
    duplicateExistingIds: duplicates,
    rowErrors: errors,
  };

  console.log("Import CSV CRM terminé");
  console.log(`Fichier lu: ${report.file}`);
  console.log(`Lignes détectées: ${report.rowsDetected}`);
  console.log(`Leads créés: ${report.created}`);
  console.log(`Leads mis à jour: ${report.updated}`);
  console.log(`Doublons ignorés: ${report.duplicatesIgnored}`);
  console.log(`Erreurs: ${report.errors}`);
  console.log(`Champs manquants: ${report.missingFields.length}`);
  console.log(`Durée: ${report.durationMs}ms`);
  console.log("IDs créés:");
  console.log(report.createdIds.length ? report.createdIds.map((id) => `- ${id}`).join("\n") : "- aucun");
  console.log("IDs des doublons existants:");
  console.log(
    report.duplicateExistingIds.length
      ? report.duplicateExistingIds
          .map((duplicate) => `- ligne ${duplicate.row}: ${duplicate.id} (${duplicate.reason})`)
          .join("\n")
      : "- aucun",
  );
  console.log("IDs mis à jour:");
  console.log(report.updatedIds.length ? report.updatedIds.map((id) => `- ${id}`).join("\n") : "- aucun");
  if (report.missingFields.length > 0) {
    console.log("Champs manquants par ligne:");
    console.log(
      report.missingFields.map((entry) => `- ligne ${entry.row}: ${entry.fields.join(", ")}`).join("\n"),
    );
  }
  if (report.rowErrors.length > 0) {
    console.log("Erreurs par ligne:");
    console.log(report.rowErrors.map((error) => `- ligne ${error.row}: ${error.error}`).join("\n"));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
