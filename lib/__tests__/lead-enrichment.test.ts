import { describe, expect, it } from "vitest";
import { findDuplicate } from "../dedup";
import { normalizeGoogleMapsUrl, normalizeLead } from "../normalize";

describe("lead enrichment normalisation", () => {
  it("normalise une URL Google Maps pour la déduplication", () => {
    expect(normalizeGoogleMapsUrl(" https://maps.google.com/?cid=123&utm_source=x ")).toBe(
      "https://maps.google.com/?cid=123",
    );
  });

  it("inclut googleMapsUrl dans les clés normalisées du lead", () => {
    expect(
      normalizeLead({
        companyName: "EMS Paris",
        city: "Paris",
        googleMapsUrl: "https://maps.google.com/?cid=123",
      }),
    ).toMatchObject({ normGoogleMapsUrl: "https://maps.google.com/?cid=123" });
  });
});

describe("dedup enriched leads", () => {
  it("détecte un doublon fort via URL Google Maps", () => {
    const match = findDuplicate(
      {
        normPhone: null,
        normEmail: null,
        normDomain: null,
        normName: "ems paris",
        normCity: "paris",
        normGoogleMapsUrl: "https://maps.google.com/?cid=123",
      },
      [
        {
          id: "lead_1",
          normPhone: null,
          normEmail: null,
          normDomain: null,
          normName: "autre nom",
          normCity: "paris",
          normGoogleMapsUrl: "https://maps.google.com/?cid=123",
        },
      ],
    );

    expect(match).toMatchObject({
      existingId: "lead_1",
      strength: "strong",
      reason: "URL Google Maps identique",
    });
  });
});
