import type { SiteContent } from "@prisma/client";
import { SITE_CONTENT_SEED } from "@/lib/cms-defaults";
import { getPrisma, isPrismaConnectionError } from "@/lib/db";

type ContentLocale = "en" | "ar";
type SiteContentMap = Record<string, SiteContent>;

let cache: SiteContentMap | null = null;
let cacheTime = 0;
/** Dedupes concurrent SSR fetches (home page hits CMS from multiple Server Components). */
let inflight: Promise<SiteContentMap | null> | null = null;

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

  if (!inflight) {
    inflight = (async () => {
      try {
        const prisma = getPrisma();
        const items = await prisma.siteContent.findMany();
        cache = Object.fromEntries(items.map((item) => [item.key, item]));
        cacheTime = Date.now();
        return cache;
      } catch (error) {
        // Never crash marketing pages if CMS DB is down or pool is exhausted.
        if (isPrismaConnectionError(error)) {
          console.warn("[cms] Database unreachable, using cached or default content");
        } else {
          console.error("[cms] Failed to load site content, using cached or default content", error);
        }
        return null;
      } finally {
        inflight = null;
      }
    })();
  }

  const map = (await inflight) ?? cache;
  if (map) return formatContent(map, normalizedLocale);
  return getDefaultContent(normalizedLocale);
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
