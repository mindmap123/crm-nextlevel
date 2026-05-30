"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/leads", label: "Leads", icon: "📋" },
  { href: "/pipeline", label: "Pipeline", icon: "🗂️" },
  { href: "/import", label: "Import", icon: "⬆️" },
  { href: "/scoring", label: "Scoring", icon: "🎯" },
  { href: "/tasks", label: "Notes & Tâches", icon: "✅" },
  { href: "/export", label: "Export", icon: "⬇️" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-bold text-accent-foreground">
          N
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">NextLevel</div>
          <div className="text-xs text-muted-foreground">CRM</div>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 px-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-5 py-4 text-xs text-muted-foreground">
        Aucun envoi auto. Tout manuel.
      </div>
    </aside>
  );
}
