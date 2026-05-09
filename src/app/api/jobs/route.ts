import { NextResponse, type NextRequest } from "next/server";
import { JobType, type Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { JOB_CATEGORIES } from "@/lib/jobs/constants";

function asInt(v: string | null, fallback: number) {
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function isJobType(value: string): value is JobType {
  return Object.values(JobType).includes(value as JobType);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? undefined;
    const category = url.searchParams.get("category")?.trim() ?? undefined;
    const location = url.searchParams.get("location")?.trim() ?? undefined;
    const typeRaw = url.searchParams.get("type")?.trim();
    const remoteOnly = url.searchParams.get("remote") === "true";
    const sort = url.searchParams.get("sort") ?? "newest";

    const page = asInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(asInt(url.searchParams.get("pageSize"), 10), 50);

    const prisma = getPrisma();

    const where: Prisma.JobWhereInput = {
      isActive: true,
      ...(category && (JOB_CATEGORIES as readonly string[]).includes(category)
        ? { category }
        : {}),
      ...(remoteOnly
        ? {
            OR: [{ isRemote: true }, { type: JobType.REMOTE }],
          }
        : {}),
      ...(typeof typeRaw === "string" && typeRaw.length && isJobType(typeRaw) ? { type: typeRaw } : {}),
      ...(location ? { location: { contains: location, mode: "insensitive" } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { titleAr: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { descriptionAr: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.JobOrderByWithRelationInput[] =
      sort === "salary"
        ? [{ salaryMax: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

    const [total, rows] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          titleAr: true,
          category: true,
          type: true,
          location: true,
          locationAr: true,
          isRemote: true,
          salaryMin: true,
          salaryMax: true,
          currency: true,
          createdAt: true,
          expiresAt: true,
          employer: {
            select: {
              name: true,
              email: true,
              image: true,
              employerProfile: {
                select: { companyName: true, logoUrl: true },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const items = rows.map((j) => {
      const company =
        j.employer.employerProfile?.companyName?.trim() ||
        j.employer.name?.trim() ||
        j.employer.email ||
        "—";
      return {
        id: j.id,
        title: j.title,
        titleAr: j.titleAr,
        category: j.category,
        type: j.type,
        location: j.location,
        locationAr: j.locationAr,
        isRemote: j.isRemote,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        currency: j.currency,
        createdAt: j.createdAt.toISOString(),
        expiresAt: j.expiresAt?.toISOString() ?? null,
        companyName: company,
        companyLogoUrl: j.employer.employerProfile?.logoUrl ?? null,
        employerImage: j.employer.image,
        matchScore: null as number | null,
      };
    });

    return NextResponse.json(
      { items, page, pageSize, total, totalPages },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60" },
      },
    );
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
