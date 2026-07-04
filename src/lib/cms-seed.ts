import { clearCache } from "@/lib/cms";
import { SITE_CONTENT_SEED } from "@/lib/cms-defaults";
import { getPrisma } from "@/lib/db";

export async function ensureSiteContentSeeded(updatedBy: string | null): Promise<number> {
  const prisma = getPrisma();
  const existingCount = await prisma.siteContent.count();
  if (existingCount >= SITE_CONTENT_SEED.length) {
    return existingCount;
  }

  await Promise.all(
    SITE_CONTENT_SEED.map((item) =>
      prisma.siteContent.upsert({
        where: { key: item.key },
        update: {
          section: item.section,
          label: item.label,
          type: item.type ?? "text",
        },
        create: {
          key: item.key,
          valueEn: item.valueEn,
          valueAr: item.valueAr,
          section: item.section,
          label: item.label,
          type: item.type ?? "text",
          updatedBy,
        },
      }),
    ),
  );

  clearCache();
  return SITE_CONTENT_SEED.length;
}

export async function resyncSiteContentDefaults(updatedBy: string | null): Promise<number> {
  const prisma = getPrisma();

  await Promise.all(
    SITE_CONTENT_SEED.map((item) =>
      prisma.siteContent.upsert({
        where: { key: item.key },
        update: {
          valueEn: item.valueEn,
          valueAr: item.valueAr,
          section: item.section,
          label: item.label,
          type: item.type ?? "text",
          updatedBy,
        },
        create: {
          key: item.key,
          valueEn: item.valueEn,
          valueAr: item.valueAr,
          section: item.section,
          label: item.label,
          type: item.type ?? "text",
          updatedBy,
        },
      }),
    ),
  );

  clearCache();
  return SITE_CONTENT_SEED.length;
}
