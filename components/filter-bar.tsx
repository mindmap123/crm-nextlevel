"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useRef } from "react";
import { STATUSES, STATUS_LABEL, TAGS, TAG_LABEL } from "@/lib/constants";

const SOURCES = [
  ["", "Toutes sources"],
  ["GOOGLE_MAPS", "Google Maps"],
  ["SHERLOCK_MAPS", "SherlockMaps"],
  ["MANUEL", "Manuel"],
  ["IMPORT_CSV", "Import CSV"],
  ["IMPORT_JSON", "Import JSON"],
] as const;

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const sel =
    "h-9 rounded-md border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";
  const active = params.toString().length > 0;
  const qTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-card px-6 py-3">
      <input
        defaultValue={params.get("q") ?? ""}
        placeholder="Rechercher entreprise, ville, catégorie…"
        onChange={(e) => {
          const v = e.target.value;
          if (qTimer.current) clearTimeout(qTimer.current);
          qTimer.current = setTimeout(() => set("q", v), 350);
        }}
        className="h-9 w-72 rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
      <select className={sel} value={params.get("status") ?? ""} onChange={(e) => set("status", e.target.value)}>
        <option value="">Tous statuts</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <select className={sel} value={params.get("tag") ?? ""} onChange={(e) => set("tag", e.target.value)}>
        <option value="">Tous tags</option>
        {TAGS.map((t) => (
          <option key={t} value={t}>
            {TAG_LABEL[t]}
          </option>
        ))}
      </select>
      <select className={sel} value={params.get("source") ?? ""} onChange={(e) => set("source", e.target.value)}>
        {SOURCES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <select className={sel} value={params.get("scoreMin") ?? ""} onChange={(e) => set("scoreMin", e.target.value)}>
        <option value="">Score min</option>
        <option value="70">≥ 70</option>
        <option value="45">≥ 45</option>
        <option value="20">≥ 20</option>
      </select>
      <select className={sel} value={params.get("hasWebsite") ?? ""} onChange={(e) => set("hasWebsite", e.target.value)}>
        <option value="">Site ?</option>
        <option value="yes">Avec site</option>
        <option value="no">Sans site</option>
      </select>
      <label className="flex items-center gap-1 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={params.get("hasPhone") === "yes"}
          onChange={(e) => set("hasPhone", e.target.checked ? "yes" : "")}
        />
        Tél
      </label>
      <select className={sel} value={params.get("sort") ?? "score"} onChange={(e) => set("sort", e.target.value)}>
        <option value="score">Tri : score</option>
        <option value="recent">Tri : récent</option>
        <option value="name">Tri : nom</option>
      </select>
      {active && (
        <button
          onClick={() => router.push(pathname)}
          className="ml-auto text-sm text-muted-foreground underline hover:text-foreground"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
