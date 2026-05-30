import { describe, it, expect } from "vitest";
import { scoreLead, isWeakSite } from "../scoring";

describe("isWeakSite", () => {
  it("site Wix = faible", () => {
    expect(isWeakSite({ hasWebsite: true, technologies: ["Wix"] })).toBe(true);
  });
  it("site sans techno détectée = faible", () => {
    expect(isWeakSite({ hasWebsite: true, technologies: [] })).toBe(true);
  });
  it("pas de site = pas faible", () => {
    expect(isWeakSite({ hasWebsite: false })).toBe(false);
  });
  it("tag manuel force faible", () => {
    expect(isWeakSite({ hasWebsite: false, tags: ["SITE_FAIBLE"] })).toBe(true);
  });
});

describe("scoreLead", () => {
  it("prospect cible idéal score haut", () => {
    const r = scoreLead({
      companyName: "Resto",
      category: "restaurant",
      phone: "0491223344",
      email: "a@b.fr",
      hasWebsite: true,
      technologies: ["Wix"],
      googleRating: 4.5,
      reviewCount: 120,
    });
    // siteFaible 25 + categorie 20 + contact 15 + avis 10 = 70
    expect(r.score).toBe(70);
    expect(r.breakdown.map((l) => l.key)).toContain("siteActifFaible");
  });

  it("malus doublon + sans contact + hors cible borné à 0", () => {
    const r = scoreLead({
      companyName: "X",
      category: "avocat",
      masterId: "abc",
    });
    expect(r.score).toBe(0);
    expect(r.breakdown.map((l) => l.key)).toContain("doublon");
    expect(r.breakdown.map((l) => l.key)).toContain("horsCible");
  });

  it("breakdown toujours présent", () => {
    const r = scoreLead({ companyName: "Y" });
    expect(Array.isArray(r.breakdown)).toBe(true);
  });
});
