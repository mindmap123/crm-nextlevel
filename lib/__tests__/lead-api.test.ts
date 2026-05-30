import { describe, expect, it } from "vitest";
import { mapLeadPayload, parseLeadPayloads } from "../lead-api";

describe("mapLeadPayload", () => {
  it("mappe les en-têtes CSV Hermes vers le modèle CRM", () => {
    const result = mapLeadPayload({
      "Nom entreprise": "Atelier Martin",
      "Téléphone": "04 91 00 00 00",
      "E-mail": "contact@atelier-martin.fr",
      "Site web": "https://atelier-martin.fr",
      "Ville": "Marseille",
      "Catégorie": "artisan",
      "Note Google": "4,7",
      "Nombre d'avis": "38",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lead).toMatchObject({
      companyName: "Atelier Martin",
      phone: "04 91 00 00 00",
      email: "contact@atelier-martin.fr",
      website: "https://atelier-martin.fr",
      city: "Marseille",
      category: "artisan",
      googleRating: 4.7,
      reviewCount: 38,
      hasWebsite: true,
    });
  });

  it("retourne une erreur lisible quand le nom entreprise manque", () => {
    const result = mapLeadPayload({ Ville: "Marseille" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("companyName");
  });
});

describe("parseLeadPayloads", () => {
  it("accepte un objet, un tableau ou une enveloppe leads", () => {
    expect(parseLeadPayloads({ companyName: "A" })).toHaveLength(1);
    expect(parseLeadPayloads([{ companyName: "A" }, { companyName: "B" }])).toHaveLength(2);
    expect(parseLeadPayloads({ leads: [{ companyName: "A" }] })).toHaveLength(1);
  });
});
