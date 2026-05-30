"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Lead, Task, Activity, Status, Tag } from "@prisma/client";
import {
  STATUSES,
  STATUS_LABEL,
  STATUS_CLASS,
  TAGS,
  TAG_LABEL,
  TAG_CLASS,
  SOURCE_LABEL,
  scoreClass,
} from "@/lib/constants";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  setStatus,
  setTags,
  addNote,
  setInternalNotes,
  setNextAction,
  logManualContact,
  addTask,
  toggleTask,
  deleteTask,
  updateLead,
} from "@/lib/actions";

type ScoreLine = { key: string; label: string; points: number };

type FullLead = Lead & {
  tasks: Task[];
  activities: Activity[];
  master: { id: string; companyName: string } | null;
  duplicates: { id: string; companyName: string }[];
};

function fmt(d: Date | null | undefined) {
  return d ? new Date(d).toLocaleString("fr-FR") : "—";
}

export function LeadDetail({ lead }: { lead: FullLead }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState(lead.internalNotes ?? "");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [nextAct, setNextAct] = useState(lead.nextAction ?? "");
  const [nextAt, setNextAt] = useState(
    lead.nextActionAt ? new Date(lead.nextActionAt).toISOString().slice(0, 10) : "",
  );

  const breakdown = (lead.scoreBreakdown as ScoreLine[] | null) ?? [];

  const toggleTag = (t: Tag) => {
    const has = lead.tags.includes(t);
    const next = has ? lead.tags.filter((x) => x !== t) : [...lead.tags, t];
    start(() => setTags(lead.id, next));
  };

  return (
    <div>
      <PageHeader
        title={lead.companyName}
        subtitle={`${lead.category ?? "Sans catégorie"} · ${lead.city ?? "Ville ?"} · ${SOURCE_LABEL[lead.source]}`}
        actions={
          <>
            <Badge className={cn("text-sm", scoreClass(lead.score))}>Score {lead.score}</Badge>
            <select
              value={lead.status}
              onChange={(e) => start(() => setStatus(lead.id, e.target.value as Status))}
              className={cn("h-9 rounded-md px-3 text-sm font-medium", STATUS_CLASS[lead.status])}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <Button size="sm" disabled={pending} onClick={() => start(() => logManualContact(lead.id))}>
              Enregistrer un contact
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-3">
        {/* Colonne gauche : coordonnées + signaux + notes */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Coordonnées</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <EditField label="Contact" value={lead.contactName} onSave={(v) => updateLead(lead.id, { contactName: v })} />
              <EditField label="Téléphone" value={lead.phone} onSave={(v) => updateLead(lead.id, { phone: v })} />
              <EditField label="Email" value={lead.email} onSave={(v) => updateLead(lead.id, { email: v })} />
              <EditField label="Site web" value={lead.website} onSave={(v) => updateLead(lead.id, { website: v, hasWebsite: !!v })} />
              <EditField label="Ville" value={lead.city} onSave={(v) => updateLead(lead.id, { city: v })} />
              <EditField label="Catégorie" value={lead.category} onSave={(v) => updateLead(lead.id, { category: v })} />
              <EditField label="Adresse" value={lead.address} onSave={(v) => updateLead(lead.id, { address: v })} />
            </div>
            <div className="mt-3 flex gap-2">
              {lead.phone && (
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(lead.phone!)}>
                  Copier tél
                </Button>
              )}
              {lead.email && (
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(lead.email!)}>
                  Copier email
                </Button>
              )}
              {lead.website && (
                <a href={lead.website} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">Ouvrir le site</Button>
                </a>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Signaux</h2>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Note Google" value={lead.googleRating ? `${lead.googleRating}★` : "—"} />
              <Stat label="Avis" value={lead.reviewCount?.toString() ?? "—"} />
              <Stat label="Site" value={lead.hasWebsite ? "Oui" : "Non"} />
              <Stat label="Technos" value={lead.technologies.join(", ") || "—"} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Notes internes</h2>
              <Button
                size="sm"
                variant="outline"
                disabled={pending || notes === (lead.internalNotes ?? "")}
                onClick={() => start(() => setInternalNotes(lead.id, notes))}
              >
                Enregistrer
              </Button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-md border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="Notes libres…"
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Activité</h2>
            <div className="mb-3 flex gap-2">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note…" />
              <Button
                size="sm"
                disabled={!note.trim() || pending}
                onClick={() => start(async () => {
                  await addNote(lead.id, note);
                  setNote("");
                })}
              >
                Ajouter
              </Button>
            </div>
            {lead.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune activité. Ajoutez une note.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lead.activities.map((a) => (
                  <li key={a.id} className="flex gap-3 border-l-2 border-border pl-3">
                    <span className="text-muted-foreground">{fmt(a.createdAt)}</span>
                    <span>{a.body}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Colonne droite : pipeline, tags, score, tâches, doublons */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Pipeline</h2>
            <label className="text-xs text-muted-foreground">Prochaine action</label>
            <Input value={nextAct} onChange={(e) => setNextAct(e.target.value)} className="mt-1" placeholder="Ex : rappeler" />
            <input
              type="date"
              value={nextAt}
              onChange={(e) => setNextAt(e.target.value)}
              className="mt-2 h-9 w-full rounded-md border bg-card px-3 text-sm"
            />
            <Button
              size="sm"
              className="mt-2 w-full"
              disabled={pending}
              onClick={() => start(() => setNextAction(lead.id, nextAct, nextAt || null))}
            >
              Enregistrer l&apos;action
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Dernier contact : {fmt(lead.lastContactAt)}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((t) => {
                const on = lead.tags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium transition",
                      on ? TAG_CLASS[t] : "bg-muted text-muted-foreground hover:bg-muted/70",
                    )}
                  >
                    {TAG_LABEL[t]}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Détail du score · {lead.score}</h2>
            {breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pas de détail.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {breakdown.map((l, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{l.label}</span>
                    <span className={l.points >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {l.points > 0 ? `+${l.points}` : l.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Tâches</h2>
            <div className="mb-3 space-y-2">
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Nouvelle tâche…" />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  className="h-9 flex-1 rounded-md border bg-card px-3 text-sm"
                />
                <Button
                  size="sm"
                  disabled={!taskTitle.trim() || pending}
                  onClick={() => start(async () => {
                    await addTask(lead.id, taskTitle, taskDue || null);
                    setTaskTitle("");
                    setTaskDue("");
                  })}
                >
                  Ajouter
                </Button>
              </div>
            </div>
            {lead.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune tâche.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {lead.tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={t.status === "DONE"}
                      onChange={() => start(() => toggleTask(t.id))}
                    />
                    <span className={cn("flex-1", t.status === "DONE" && "text-muted-foreground line-through")}>
                      {t.title}
                    </span>
                    {t.dueAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.dueAt).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    <button onClick={() => start(() => deleteTask(t.id))} className="text-muted-foreground hover:text-red-600">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {(lead.master || lead.duplicates.length > 0) && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Doublons</h2>
              {lead.master && (
                <p className="text-sm">
                  Doublon de{" "}
                  <Link href={`/leads/${lead.master.id}`} className="text-accent hover:underline">
                    {lead.master.companyName}
                  </Link>
                </p>
              )}
              {lead.duplicates.map((d) => (
                <p key={d.id} className="text-sm">
                  Doublon rattaché :{" "}
                  <Link href={`/leads/${d.id}`} className="text-accent hover:underline">
                    {d.companyName}
                  </Link>
                </p>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function EditField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string | null;
  onSave: (v: string) => Promise<void>;
}) {
  const [v, setV] = useState(value ?? "");
  const [pending, start] = useTransition();
  const dirty = v !== (value ?? "");
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        <Input value={v} onChange={(e) => setV(e.target.value)} />
        {dirty && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => start(() => onSave(v))}>
            ✓
          </Button>
        )}
      </div>
    </label>
  );
}
