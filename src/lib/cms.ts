import type { SiteContent } from "@prisma/client";
import { SITE_CONTENT_SEED } from "@/lib/cms-defaults";
import { getPrisma, isPrismaConnectionError } from "@/lib/db";

type ContentLocale = "en" | "ar";
type SiteContentMap = Record<string, SiteContent>;

let cache: SiteContentMap | null = null;
let cacheTime = 0;

export const CMS_CACHE_TTL_MS = 60 * 1000;

export type CmsPublicContent = Record<string, string>;

export type CmsAdminItem = {
  id: string;
  key: string;
  valueEn: string;
  valueAr: string;
  section: string;
  label: string;
  type: string;
  updatedAt: string;
  updatedBy: string | null;
};

function normalizeLocale(locale: string): ContentLocale {
  return locale.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function formatContent(items: SiteContentMap, locale: ContentLocale): CmsPublicContent {
  return Object.fromEntries(
    Object.entries(items).map(([key, item]) => [key, locale === "ar" ? item.valueAr : item.valueEn]),
  );
}

function getDefaultContent(locale: ContentLocale): CmsPublicContent {
  return Object.fromEntries(
    SITE_CONTENT_SEED.map((item) => [item.key, locale === "ar" ? item.valueAr : item.valueEn]),
  );
}

export async function getContent(locale: string = "en"): Promise<CmsPublicContent> {
  const now = Date.now();
  const normalizedLocale = normalizeLocale(locale);

  if (cache && now - cacheTime < CMS_CACHE_TTL_MS) {
    return formatContent(cache, normalizedLocale);
  }

  try {
    const prisma = getPrisma();
    const items = await prisma.siteContent.findMany();
    cache = Object.fromEntries(items.map((item) => [item.key, item]));
    cacheTime = now;
    return formatContent(cache, normalizedLocale);
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      console.warn("[cms] Database unreachable, using cached or default content");
      if (cache) return formatContent(cache, normalizedLocale);
      return getDefaultContent(normalizedLocale);
    }
    throw error;
  }
}

export async function getAllContentItems(): Promise<CmsAdminItem[]> {
  const prisma = getPrisma();
  const items = await prisma.siteContent.findMany({
    orderBy: [{ section: "asc" }, { label: "asc" }],
  });

  cache = Object.fromEntries(items.map((item) => [item.key, item]));
  cacheTime = Date.now();

  return items.map((item) => ({
    id: item.id,
    key: item.key,
    valueEn: item.valueEn,
    valueAr: item.valueAr,
    section: item.section,
    label: item.label,
    type: item.type,
    updatedAt: item.updatedAt.toISOString(),
    updatedBy: item.updatedBy,
  }));
}

export function clearCache(): void {
  cache = null;
  cacheTime = 0;
}
