import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  normalizeEmail,
  normalizeDomain,
  normalizeName,
  normalizeCity,
  normalizeLead,
} from "../normalize";

describe("normalizePhone", () => {
  it("garde 9 chiffres nationaux", () => {
    expect(normalizePhone("04 91 22 33 44")).toBe("491223344");
    expect(normalizePhone("+33 4 91 22 33 44")).toBe("491223344");
    expect(normalizePhone("0033491223344")).toBe("491223344");
  });
  it("rejette trop court", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("trim + lowercase", () => {
    expect(normalizeEmail("  Foo@Bar.FR ")).toBe("foo@bar.fr");
  });
  it("rejette sans @", () => {
    expect(normalizeEmail("foobar")).toBeNull();
  });
});

describe("normalizeDomain", () => {
  it("retire schéma et www", () => {
    expect(normalizeDomain("https://www.Exemple.fr/contact")).toBe("exemple.fr");
    expect(normalizeDomain("exemple.fr")).toBe("exemple.fr");
  });
  it("rejette host invalide", () => {
    expect(normalizeDomain("localhost")).toBeNull();
  });
});

describe("normalizeName", () => {
  it("retire accents, ponctuation et forme juridique", () => {
    expect(normalizeName("Café de l'Été SARL")).toBe("cafe de l ete");
    expect(normalizeName("Garage Dupont SAS")).toBe("garage dupont");
  });
});

describe("normalizeCity", () => {
  it("normalise accents, casse et ponctuation", () => {
    expect(normalizeCity(" Aix-en-Provence ")).toBe("aix en provence");
    expect(normalizeCity("Éguilles")).toBe("eguilles");
  });
});

describe("normalizeLead", () => {
  it("inclut la ville normalisée pour la déduplication", () => {
    expect(normalizeLead({ companyName: "Garage Dupont", city: "Aix-en-Provence" })).toMatchObject({
      normName: "garage dupont",
      normCity: "aix en provence",
    });
  });
});
