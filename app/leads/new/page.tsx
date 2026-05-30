"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createLead } from "@/lib/actions";
import { PageHeader, Card, Input, Button } from "@/components/ui";
import type { Source } from "@prisma/client";

type LeadForm = {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  category: string;
  source: Source;
  googleRating: string;
  reviewCount: string;
};

function LeadField({
  label,
  field,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  field: keyof LeadForm;
  value: string;
  onChange: (field: keyof LeadForm, value: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Input type={type} value={value} onChange={(e) => onChange(field, e.target.value)} />
    </label>
  );
}

export default function NewLeadPage() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState<LeadForm>({
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

  const upd = (k: keyof LeadForm, v: string) => setF((p) => ({ ...p, [k]: v }));

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

  return (
    <div>
      <PageHeader title="Nouveau lead" subtitle="Saisie manuelle" />
      <div className="max-w-2xl p-6">
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <LeadField label="Nom entreprise *" field="companyName" value={f.companyName} onChange={upd} />
            </div>
            <LeadField label="Nom contact" field="contactName" value={f.contactName} onChange={upd} />
            <LeadField label="Ville" field="city" value={f.city} onChange={upd} />
            <LeadField label="Téléphone" field="phone" value={f.phone} onChange={upd} />
            <LeadField label="Email" field="email" value={f.email} onChange={upd} />
            <LeadField label="Site web" field="website" value={f.website} onChange={upd} />
            <LeadField label="Catégorie" field="category" value={f.category} onChange={upd} />
            <LeadField label="Adresse" field="address" value={f.address} onChange={upd} />
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
            <LeadField label="Note Google" field="googleRating" value={f.googleRating} onChange={upd} type="number" />
            <LeadField label="Nombre d'avis" field="reviewCount" value={f.reviewCount} onChange={upd} type="number" />
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
