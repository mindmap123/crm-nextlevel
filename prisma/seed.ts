import { Prisma, PrismaClient, Tag } from "@prisma/client";
import {
  DEFAULT_WEIGHTS,
  DEFAULT_TARGET_CATEGORIES,
  DEFAULT_TARGET_CITIES,
  scoreLead,
} from "../lib/scoring";
import { normalizeLead } from "../lib/normalize";

const prisma = new PrismaClient();

async function main() {
  await prisma.scoreConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      weights: DEFAULT_WEIGHTS as object,
      targetCategories: DEFAULT_TARGET_CATEGORIES,
      targetCities: DEFAULT_TARGET_CITIES,
    },
  });

  const demo = [
    {
      companyName: "Pizzeria Bella Napoli",
      contactName: "Marco Rossi",
      phone: "04 91 22 33 44",
      email: "contact@bellanapoli.fr",
      website: "https://bellanapoli.wixsite.com/pizza",
      city: "Marseille",
      category: "restaurant",
      source: "GOOGLE_MAPS" as const,
      googleRating: 4.4,
      reviewCount: 182,
      hasWebsite: true,
      technologies: ["Wix"],
    },
    {
      companyName: "Garage Dupont",
      contactName: "Jean Dupont",
      phone: "04 91 55 66 77",
      email: null,
      website: null,
      city: "Aix-en-Provence",
      category: "garage",
      source: "SHERLOCK_MAPS" as const,
      googleRating: 4.8,
      reviewCount: 64,
      hasWebsite: false,
      technologies: [],
    },
    {
      companyName: "Coiffure Élégance",
      contactName: null,
      phone: "04 42 10 20 30",
      email: "elegance@gmail.com",
      website: "https://coiffure-elegance.fr",
      city: "Marseille",
      category: "coiffeur",
      source: "GOOGLE_MAPS" as const,
      googleRating: 3.9,
      reviewCount: 7,
      hasWebsite: true,
      technologies: ["WordPress"],
    },
  ];

  for (const d of demo) {
    const norm = normalizeLead(d);
    const { score, breakdown } = scoreLead(d);
    const existing = await prisma.lead.findFirst({
      where: {
        companyName: d.companyName,
        city: d.city,
      },
    });

    const data = {
      ...d,
      ...norm,
      score,
      scoreBreakdown: breakdown as unknown as Prisma.InputJsonValue,
      tags: d.hasWebsite ? [] : [Tag.SANS_SITE],
    } satisfies Prisma.LeadCreateInput;

    if (existing) {
      await prisma.lead.update({
        where: { id: existing.id },
        data,
      });
      continue;
    }

    await prisma.lead.create({
      data,
    });
  }

  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
