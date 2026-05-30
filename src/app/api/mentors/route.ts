import { NextResponse, type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db";

const DEFAULT_PRICE_CEILING = 500;

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

function sortMentors<T extends { hourlyRate: number | null; averageRating: number; totalSessions: number; user: { name: string | null }; title: string | null }>(
  rows: T[],
  sort: string,
): T[] {
  const copy = [...rows];
  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => (a.hourlyRate ?? 0) - (b.hourlyRate ?? 0));
    case "price_desc":
      return copy.sort((a, b) => (b.hourlyRate ?? 0) - (a.hourlyRate ?? 0));
    case "sessions_desc":
      return copy.sort((a, b) => b.totalSessions - a.totalSessions);
    case "name_asc":
      return copy.sort((a, b) =>
        (a.user.name ?? a.title ?? "").localeCompare(b.user.name ?? b.title ?? "", undefined, {
          sensitivity: "base",
        }),
      );
    case "rating_desc":
    default:
      return copy.sort((a, b) => b.averageRating - a.averageRating);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const industry = url.searchParams.get("industry")?.trim() ?? "";
  const expertise = url.searchParams.get("expertise")?.trim().toLowerCase() ?? "";
  const minRate = Number(url.searchParams.get("minRate") ?? 0);
  const maxRate = Number(url.searchParams.get("maxRate") ?? 0);
  const minRating = Number(url.searchParams.get("minRating") ?? 0);
  const sort = url.searchParams.get("sort") ?? "rating_desc";

  const prisma = getPrisma();
  const allApproved = await prisma.mentor.findMany({
    where: {
      isApproved: true,
      isActive: true,
      hourlyRate: { not: null },
    },
    select: {
      hourlyRate: true,
      expertise: true,
    },
  });

  const rates = allApproved.map((m) => m.hourlyRate).filter((r): r is number => typeof r === "number" && r > 0);
  const maxObserved = rates.length ? Math.max(...rates) : DEFAULT_PRICE_CEILING;
  const priceCeiling = Math.max(DEFAULT_PRICE_CEILING, Math.ceil(maxObserved / 50) * 50);

  const expertiseSet = new Set<string>();
  for (const m of allApproved) {
    for (const tag of asStringArray(m.expertise)) expertiseSet.add(tag);
  }
  const expertiseTags = [...expertiseSet].sort((a, b) => a.localeCompare(b)).slice(0, 24);

  const rows = await prisma.mentor.findMany({
    where: {
      isApproved: true,
      isActive: true,
      hourlyRate: { not: null },
      ...(minRate > 0 || maxRate > 0
        ? {
            hourlyRate: {
              ...(minRate > 0 ? { gte: minRate } : {}),
              ...(maxRate > 0 ? { lte: maxRate } : {}),
            },
          }
        : {}),
      ...(minRating > 0 ? { averageRating: { gte: minRating } } : {}),
    },
    include: {
      user: { select: { name: true, image: true } },
    },
    take: 100,
  });

  let filtered = rows;

  if (industry) {
    filtered = filtered.filter((m) => {
      const ind = asStringArray(m.industries);
      return ind.some((x) => x.toLowerCase() === industry.toLowerCase());
    });
  }

  if (expertise) {
    filtered = filtered.filter((m) => {
      const tags = asStringArray(m.expertise);
      return tags.some((x) => x.toLowerCase() === expertise);
    });
  }

  if (q) {
    filtered = filtered.filter((m) => {
      const expertiseBlob = asStringArray(m.expertise).join(" ");
      const industryBlob = asStringArray(m.industries).join(" ");
      const blob = `${m.title ?? ""} ${m.user.name ?? ""} ${expertiseBlob} ${industryBlob}`.toLowerCase();
      return blob.includes(q);
    });
  }

  filtered = sortMentors(filtered, sort).slice(0, 50);

  return NextResponse.json({
    success: true,
    data: {
      mentors: filtered,
      meta: {
        priceCeiling,
        expertiseTags,
        totalApproved: allApproved.length,
      },
    },
  });
}
