import type { Source } from "@prisma/client";

export interface LeadInput {
  companyName: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  source?: Source;
  category?: string | null;
  googleRating?: number | null;
  reviewCount?: number | null;
  hasWebsite?: boolean;
  technologies?: string[];
}

export interface ImportRow {
  companyName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  category?: string;
  source?: string;
  googleRating?: string | number;
  reviewCount?: string | number;
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
