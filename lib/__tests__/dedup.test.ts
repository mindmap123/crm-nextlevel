import { describe, it, expect } from "vitest";
import { findDuplicate, trigramSimilarity, pickMaster } from "../dedup";

const existing = [
  {
    id: "1",
    normPhone: "491223344",
    normEmail: "a@b.fr",
    normDomain: "exemple.fr",
    normName: "garage dupont",
    normCity: "marseille",
    city: "Marseille",
  },
];

describe("findDuplicate", () => {
  it("clé forte téléphone", () => {
    const m = findDuplicate(
      { normPhone: "491223344", normEmail: null, normDomain: null, normName: null },
      existing,
    );
    expect(m.strength).toBe("strong");
    expect(m.existingId).toBe("1");
  });

  it("nom proche + même ville = faible", () => {
    const m = findDuplicate(
      {
        normPhone: null,
        normEmail: null,
        normDomain: null,
        normName: "garage dupond",
        normCity: "marseille",
        city: "Marseille",
      },
      existing,
    );
    expect(m.strength).toBe("weak");
  });

  it("ville normalisée: ponctuation et accents ne cassent pas le fuzzy", () => {
    const m = findDuplicate(
      {
        normPhone: null,
        normEmail: null,
        normDomain: null,
        normName: "garage dupond",
        normCity: "aix en provence",
        city: "Aix en Provence",
      },
      [
        {
          id: "aix",
          normPhone: null,
          normEmail: null,
          normDomain: null,
          normName: "garage dupont",
          normCity: "aix en provence",
          city: "Aix-en-Provence",
        },
      ],
    );
    expect(m.strength).toBe("weak");
    expect(m.existingId).toBe("aix");
  });

  it("choisit le match fort le plus complet quand plusieurs clés matchent", () => {
    const m = findDuplicate(
      {
        normPhone: "491223344",
        normEmail: "contact@example.fr",
        normDomain: null,
        normName: null,
        normCity: null,
      },
      [
        {
          id: "phone",
          normPhone: "491223344",
          normEmail: null,
          normDomain: null,
          normName: null,
          normCity: null,
          filledCount: 2,
          score: 10,
        },
        {
          id: "email",
          normPhone: null,
          normEmail: "contact@example.fr",
          normDomain: null,
          normName: null,
          normCity: null,
          filledCount: 8,
          score: 80,
        },
      ],
    );
    expect(m.strength).toBe("strong");
    expect(m.existingId).toBe("email");
  });

  it("rien ne matche = none", () => {
    const m = findDuplicate(
      { normPhone: "999", normEmail: null, normDomain: null, normName: "autre", city: "Lyon" },
      existing,
    );
    expect(m.strength).toBe("none");
  });
});

describe("trigramSimilarity", () => {
  it("identique = 1", () => {
    expect(trigramSimilarity("dupont", "dupont")).toBe(1);
  });
  it("proche > 0.5", () => {
    expect(trigramSimilarity("dupont", "dupond")).toBeGreaterThan(0.4);
  });
});

describe("pickMaster", () => {
  it("le plus complet gagne", () => {
    const a = { id: "a", normPhone: null, normEmail: null, normDomain: null, normName: null, filledCount: 5, score: 10 };
    const b = { id: "b", normPhone: null, normEmail: null, normDomain: null, normName: null, filledCount: 2, score: 90 };
    expect(pickMaster(a, b).id).toBe("a");
  });
});
