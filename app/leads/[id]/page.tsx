import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LeadDetail } from "@/components/lead-detail";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      master: { select: { id: true, companyName: true } },
      duplicates: { select: { id: true, companyName: true } },
    },
  });
  if (!lead) notFound();

  return <LeadDetail lead={lead} />;
}
