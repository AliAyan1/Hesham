import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse, SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import {
  jdTailorResultSchema,
  tailoredCvDraftSchema,
  type JdTailorResult,
} from "@/lib/cv/tailored-draft";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  jobDescription: z.string().min(80).max(14000),
  jobPostUrl: z.string().max(500).optional(),
  jobTitle: z.string().max(200).optional(),
  companyName: z.string().max(200).optional(),
});

function normalizeExperience(json: unknown): Array<{ title: string; company: string; description: string }> {
  const arr = Array.isArray(json) ? json : [];
  const out: Array<{ title: string; company: string; description: string }> = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const title =
      typeof r.title === "string" ? r.title : typeof r.jobTitle === "string" ? r.jobTitle : "";
    const company =
      typeof r.company === "string" ? r.company : typeof r.employer === "string" ? r.employer : "";
    let description = "";
    if (typeof r.description === "string") description = r.description;
    else if (Array.isArray(r.bulletPoints)) {
      description = (r.bulletPoints as unknown[])
        .filter((x): x is string => typeof x === "string")
        .map((line) => (line.startsWith("•") ? line : `• ${line.replace(/^-\s*/, "")}`))
        .join("\n");
    }
    if (title.trim() || company.trim() || description.trim()) {
      out.push({ title, company, description });
    }
  }
  return out.length ? out : [{ title: "", company: "", description: "" }];
}

function normalizeEducation(json: unknown): Array<{ degree: string; institution: string }> {
  const arr = Array.isArray(json) ? json : [];
  const out: Array<{ degree: string; institution: string }> = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const degree =
      typeof r.degree === "string" ? r.degree : typeof r.qualification === "string" ? r.qualification : "";
    const institution =
      typeof r.institution === "string"
        ? r.institution
        : typeof r.school === "string"
          ? r.school
          : "";
    if (degree.trim() || institution.trim()) out.push({ degree, institution });
  }
  return out.length ? out : [{ degree: "", institution: "" }];
}

function normalizeSkills(json: unknown): string[] {
  const arr = Array.isArray(json) ? json : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of arr) {
    const s =
      typeof row === "string"
        ? row.trim()
        : row && typeof row === "object" && typeof (row as { name?: unknown }).name === "string"
          ? String((row as { name: string }).name).trim()
          : "";
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  return out;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<JdTailorResult>>> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const [user, cv] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true },
    }),
    prisma.cV.findUnique({ where: { userId: session.user.id } }),
  ]);

  const tier = (user?.subscriptionTier ?? "FREE") as SubscriptionTier;
  if (!hasAccess(tier, "ai_cv_jd_tailor")) {
    return NextResponse.json({ success: false, error: "Upgrade required" }, { status: 403 });
  }

  if (!cv) {
    return NextResponse.json(
      { success: false, error: "Save your CV in the builder first (at least name and one role)." },
      { status: 404 },
    );
  }

  const hasBasics =
    Boolean(cv.fullName?.trim()) &&
    Boolean(cv.summary?.trim() || cv.professionalTitle?.trim()) &&
    normalizeExperience(cv.experience).some((e) => e.title.trim() || e.description.trim());
  if (!hasBasics) {
    return NextResponse.json(
      {
        success: false,
        error: "Complete your CV basics (name, summary or title, and experience) before tailoring.",
      },
      { status: 400 },
    );
  }

  const cvSnapshot = {
    fullName: cv.fullName,
    professionalTitle: cv.professionalTitle,
    summary: cv.summary,
    experience: normalizeExperience(cv.experience),
    education: normalizeEducation(cv.education),
    skills: normalizeSkills(cv.skills),
    location: cv.location,
    linkedinUrl: cv.linkedinUrl,
    portfolioUrl: cv.portfolioUrl,
  };

  const jdContext =
    `Job description (paste from LinkedIn, company site, or email):\n${parsed.data.jobDescription.trim()}\n\n` +
    (parsed.data.jobPostUrl?.trim()
      ? `Source link (for context only — do not fetch): ${parsed.data.jobPostUrl.trim()}\n\n`
      : "") +
    (parsed.data.jobTitle?.trim() ? `Hint — role title: ${parsed.data.jobTitle.trim()}\n` : "") +
    (parsed.data.companyName?.trim() ? `Hint — company: ${parsed.data.companyName.trim()}\n` : "");

  const prompt =
    "You are an expert ATS resume writer. Tailor the candidate CV to the job description below.\n\n" +
    "Rules:\n" +
    "- Do NOT invent employers, degrees, or tools the candidate never had.\n" +
    "- Rewrite summary and bullets with JD keywords where truthful.\n" +
    "- professionalTitle must align with the target role.\n" +
    "- experience[].description: bullet lines with • or -, ATS-friendly plain text.\n" +
    "- skills: include JD keywords that match the candidate profile.\n" +
    "- matchScore: 0-100 estimate of ATS fit after tailoring.\n" +
    "- keywordsMatched: JD terms reflected in the tailored CV.\n" +
    "- keywordsAdded: important JD terms you wove in.\n\n" +
    "Return ONLY JSON:\n" +
    `{"matchScore":0-100,"jobTitleDetected":"","companyDetected":"","keywordsMatched":[],"keywordsAdded":[],"matchSummary":"","matchSummaryAr":"","tailoredDraft":{` +
    `"professionalTitle":"","summary":"","experience":[{"title":"","company":"","description":""}],` +
    `"education":[{"degree":"","institution":""}],"skills":[],"languages":[],"certifications":[]}}\n\n` +
    jdContext +
    "\n\nCandidate CV JSON:\n" +
    JSON.stringify(cvSnapshot, null, 2).slice(0, 14000);

  const claude = await fetchClaudeJsonText({
    system:
      "You output a single JSON object only. No markdown. ATS-optimized, factual, recruiter-ready wording.",
    user: prompt,
    maxTokens: 8192,
  });

  if (!claude.ok) {
    return NextResponse.json({ success: false, error: "AI unavailable" }, { status: 503 });
  }

  try {
    const json = parseJsonFromModel(claude.text);
    const validated = jdTailorResultSchema.safeParse(json);
    if (!validated.success) {
      const draftOnly = tailoredCvDraftSchema.safeParse(
        json && typeof json === "object" && "tailoredDraft" in json
          ? (json as { tailoredDraft: unknown }).tailoredDraft
          : json,
      );
      if (!draftOnly.success) {
        return NextResponse.json({ success: false, error: "Invalid AI shape" }, { status: 502 });
      }
      const fallback: JdTailorResult = {
        matchScore: 75,
        jobTitleDetected: parsed.data.jobTitle?.trim() || cv.professionalTitle || "Target role",
        companyDetected: parsed.data.companyName?.trim(),
        keywordsMatched: [],
        keywordsAdded: [],
        matchSummary: "Tailored resume generated for this job description.",
        matchSummaryAr: "تم إنشاء سيرة مخصصة لهذا الوصف الوظيفي.",
        tailoredDraft: draftOnly.data,
      };
      return NextResponse.json({ success: true, data: fallback });
    }

    return NextResponse.json({ success: true, data: validated.data });
  } catch {
    return NextResponse.json({ success: false, error: "Parse error" }, { status: 502 });
  }
}
