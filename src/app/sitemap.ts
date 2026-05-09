import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/constants";

const BASE_URL = "https://qudrahtech.sa";

const PUBLIC_ROUTES = [
  "",
  "/about",
  "/jobs",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const items: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const route of PUBLIC_ROUTES) {
      const path = `/${locale}${route}`;
      const priority =
        route === "" ? 1.0 : route === "/jobs" || route === "/pricing" ? 0.8 : 0.6;

      items.push({
        url: `${BASE_URL}${path}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority,
      });
    }
  }

  return items;
}

