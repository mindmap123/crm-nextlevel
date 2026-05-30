import type { Source, Status } from "@prisma/client";

export interface LeadInput {
  companyName: string;
  contactName?: string | null;
  district?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  googleMapsUrl?: string | null;
  source?: Source;
  status?: Status;
  category?: string | null;
  googleRating?: number | null;
  reviewCount?: number | null;
  score?: number | null;
  priority?: string | null;
  internalNotes?: string | null;
  hasWebsite?: boolean;
  technologies?: string[];
}

export interface ImportRow {
  companyName?: string;
  contactName?: string;
  district?: string;
  phone?: string;
  email?: string;
  website?: string;
  googleMapsUrl?: string;
  address?: string;
  city?: string;
  category?: string;
  source?: string;
  status?: string;
  googleRating?: string | number;
  reviewCount?: string | number;
  score?: string | number;
  priority?: string;
  internalNotes?: string;
}

export interface ImportChunkResult {
  batchId: string;
  imported: number;
  duplicates: number;
  toVerify: number;
  errors: number;
  cursor: number;
  done: boolean;
}
