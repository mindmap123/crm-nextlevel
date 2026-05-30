"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createLead } from "@/lib/actions";
import { PageHeader, Card, Input, Button } from "@/components/ui";
import type { Source } from "@prisma/client";

export default function NewLeadPage() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    companyName: "",
    contactName: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    category: "",
    source: "MANUEL" as Source,
    googleRating: "",
    reviewCount: "",
  });

  const upd = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.companyName.trim()) return;
    start(async () => {
      const id = await createLead({
        companyName: f.companyName.trim(),
        contactName: f.contactName || null,
        phone: f.phone || null,
        email: f.email || null,
        website: f.website || null,
        address: f.address || null,
        city: f.city || null,
        category: f.category || null,
        source: f.source,
        googleRating: f.googleRating ? Number(f.googleRating) : null,
        reviewCount: f.reviewCount ? Number(f.reviewCount) : null,
        hasWebsite: !!f.website.trim(),
      });
      router.push(`/leads/${id}`);
    });
  };

  const Field = ({ label, k, type = "text" }: { label: string; k: keyof typeof f; type?: string }) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Input type={type} value={f[k]} onChange={(e) => upd(k, e.target.value)} />
    </label>
  );

  return (
    <div>
      <PageHeader title="Nouveau lead" subtitle="Saisie manuelle" />
      <div className="max-w-2xl p-6">
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Nom entreprise *" k="companyName" />
            </div>
            <Field label="Nom contact" k="contactName" />
            <Field label="Ville" k="city" />
            <Field label="Téléphone" k="phone" />
            <Field label="Email" k="email" />
            <Field label="Site web" k="website" />
            <Field label="Catégorie" k="category" />
            <Field label="Adresse" k="address" />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Source</span>
              <select
                value={f.source}
                onChange={(e) => upd("source", e.target.value)}
                className="h-9 rounded-md border bg-card px-2 text-sm"
              >
                <option value="MANUEL">Manuel</option>
                <option value="GOOGLE_MAPS">Google Maps</option>
                <option value="SHERLOCK_MAPS">SherlockMaps</option>
              </select>
            </label>
            <Field label="Note Google" k="googleRating" type="number" />
            <Field label="Nombre d'avis" k="reviewCount" type="number" />
          </div>
          <div className="mt-6 flex gap-2">
            <Button onClick={submit} disabled={pending || !f.companyName.trim()}>
              Créer le lead
            </Button>
            <Button variant="ghost" onClick={() => router.back()}>
              Annuler
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
