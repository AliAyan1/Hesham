import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse, SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
import { APIError } from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages";
import { getAnthropic } from "@/lib/ai/anthropic";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import { claudeMessageModelCandidates } from "@/lib/ai/claude-model-candidates";
import { ATS_PASS_THRESHOLD } from "@/lib/cv/ats-threshold";
import { computeCvCompletionPercent } from "@/lib/cv/completion";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 120;

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

type ExperienceRow = { title: string; company: string; description: string };
type EducationRow = { degree: string; institution: string };

function normalizeExperience(json: unknown): ExperienceRow[] {
  const arr = Array.isArray(json) ? json : [];
  const out: ExperienceRow[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const title =
      typeof r.title === "string"
        ? r.title
        : typeof r.jobTitle === "string"
          ? r.jobTitle
          : "";
    const company =
      typeof r.company === "string"
        ? r.company
        : typeof r.employer === "string"
          ? r.employer
          : "";
    let description = "";
    if (typeof r.description === "string") description = r.description;
    else if (Array.isArray(r.bulletPoints))
      description = (r.bulletPoints as unknown[])
        .filter((x): x is string => typeof x === "string")
        .map((line) => (line.startsWith("•") ? line : `• ${line.replace(/^-\s*/, "")}`))
        .join("\n");
    out.push({ title, company, description });
  }
  return out.length ? out : [{ title: "", company: "", description: "" }];
}

function normalizeEducation(json: unknown): EducationRow[] {
  const arr = Array.isArray(json) ? json : [];
  const out: EducationRow[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const degree =
      typeof r.degree === "string"
        ? r.degree
        : typeof r.qualification === "string"
          ? r.qualification
          : "";
    const institution =
      typeof r.institution === "string"
        ? r.institution
        : typeof r.school === "string"
          ? r.school
          : typeof r.university === "string"
            ? r.university
            : "";
    out.push({ degree, institution });
  }
  return out.length ? out : [{ degree: "", institution: "" }];
}

function normalizeSkills(json: unknown): string[] {
  const arr = Array.isArray(json) ? json : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of arr) {
    let s = "";
    if (typeof row === "string") s = row.trim();
    else if (row && typeof row === "object" && typeof (row as { name?: unknown }).name === "string") {
      s = String((row as { name: string }).name).trim();
    }
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  return out;
}

function normalizeStringList(json: unknown): string[] {
  const arr = Array.isArray(json) ? json : [];
  const out: string[] = [];
  for (const row of arr) {
    if (typeof row === "string" && row.trim()) out.push(row.trim());
    else if (row && typeof row === "object" && typeof (row as { name?: unknown }).name === "string") {
      const n = String((row as { name: string }).name).trim();
      if (n) out.push(n);
    }
  }
  return out;
}

const improveCvSchemaFixed = z.object({
  professionalTitle: z.string().min(1).max(200),
  summary: z.string().min(1).max(4000),
  experience: z.array(
    z.object({
      title: z.string().min(1).max(200),
      company: z.string().max(200),
      description: z.string().min(1).max(8000),
    }),
  ),
  education: z.array(
    z.object({
      degree: z.string().min(1).max(400),
      institution: z.string().min(1).max(400),
    }),
  ),
  skills: z.array(z.string().max(80)).max(45),
  languages: z.array(z.string()).max(20).optional(),
  certifications: z.array(z.string().max(200)).max(20).optional(),
});

export type ImproveForAtsDraft = z.infer<typeof improveCvSchemaFixed>;

export async function POST(): Promise<
  NextResponse<
    ApiResponse<{
      draft: ImproveForAtsDraft;
    }>
  >
> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const [user, cv] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true, image: true },
    }),
    prisma.cV.findUnique({ where: { userId: session.user.id } }),
  ]);

  const tier = (user?.subscriptionTier ?? "FREE") as SubscriptionTier;
  if (!hasAccess(tier, "ai_cv_ats_rebuild")) {
    return NextResponse.json({ success: false, error: "Upgrade required" }, { status: 403 });
  }
  if (!cv) {
    return NextResponse.json({ success: false, error: "CV not found" }, { status: 404 });
  }
  if (cv.atsScore == null || cv.atsAnalysis == null) {
    return NextResponse.json(
      { success: false, error: "Run an ATS scan before optimizing your CV." },
      { status: 400 },
    );
  }
  if (cv.atsScore >= ATS_PASS_THRESHOLD) {
    return NextResponse.json(
      {
        success: false,
        error: `Your ATS score already meets our ${ATS_PASS_THRESHOLD}% target—edit manually if you still want tweaks.`,
      },
      { status: 400 },
    );
  }

  let anthropic: ReturnType<typeof getAnthropic>;
  try {
    anthropic = getAnthropic();
  } catch {
    return NextResponse.json(
      { success: false, error: "CV optimization is not configured (missing API key)." },
      { status: 503 },
    );
  }

  const prevExp = normalizeExperience(cv.experience);
  const prevEdu = normalizeEducation(cv.education);
  const prevSkills = normalizeSkills(cv.skills);
  const prevLangs = normalizeStringList(cv.languages);
  const prevCerts = normalizeStringList(cv.certifications);

  const prompt =
    "You rewrite CV content for ATS (applicant tracking systems) and recruiter clarity. " +
    "Use clear section-style wording: first-person summary preferred; strong role-aligned title; concise bullets.\n\n" +
    "Rules:\n" +
    "- Preserve factual truth — do not invent employers, degrees you cannot infer, or years you cannot reasonably infer.\n" +
    "- Where dates are unknown, prepend the first line of each experience.description with a placeholder like \"(Add exact dates)\", still add realistic month-year ranges when the CV clearly implies tenure.\n" +
    "- Each experience.description: start with an optional employer/title date line then bullet lines using • or hyphen.\n" +
    "- Omit theatrical/hobby-only roles unless they clearly support the professional title.\n" +
    "- Align professionalTitle with the strongest professional thread in the CV.\n" +
    "- Include ATS-relevant keywords from the ATS analysis hints when they truly fit.\n" +
    "- ATS + PDF parity: plain text lines only inside summary and descriptions (no tables, columns, ascii art, emoji, decorative Unicode). Standard English section labels are implied — keep bullets scannable.\n" +
    "- Prefer strong noun phrases + metrics at bullet starts where facts allow (e.g. \"Reduced …\", \"Led …\", \"$…\", \"%\").\n" +
    "- Skills array: concise industry tokens (technologies, methodologies, certs) comma-free single strings.\n\n" +
    "Return ONLY JSON with this shape (no markdown, no prose):\n" +
    "{professionalTitle:string,summary:string," +
    "experience:[{title:string,company:string,description:string}]," +
    "education:[{degree:string,institution:string}],skills:string[]," +
    "languages:string[] (optional extra fluencies e.g. English — Fluent),"+
    "certifications:string[] (optional relevant certs)} \n\n" +
    "Current CV JSON:\n" +
    JSON.stringify(
      {
        professionalTitle: cv.professionalTitle,
        summary: cv.summary,
        experience: prevExp,
        education: prevEdu,
        skills: prevSkills,
        languages: prevLangs,
        certifications: prevCerts,
      },
      null,
      2,
    ) +
    "\n\nPrior ATS summary (respect issues and missing keywords):\n" +
    JSON.stringify(cv.atsAnalysis, null, 2).slice(0, 12000);

  try {
    const candidates = claudeMessageModelCandidates();
    let msg: Message | undefined;

    for (const model of candidates) {
      try {
        msg = await anthropic.messages.create({
          model,
          max_tokens: 8192,
          temperature: 0.35,
          stream: false,
          system:
            "You output a single JSON object only. Plain UTF-8. No markdown fences, no commentary. " +
            "Write for recruiter systems and straightforward PDF layouts: factual, structured, ATS-parseable wording.",
          messages: [{ role: "user", content: prompt }],
        });
        break;
      } catch (e) {
        if (e instanceof APIError && e.status === 404) {
          console.warn("[cv/improve-for-ats] Claude model 404, next:", model);
          continue;
        }
        throw e;
      }
    }

    if (!msg) {
      return NextResponse.json(
        {
          success: false,
          error:
            `No Claude model available. Tried: ${candidates.join(", ")}.`,
        },
        { status: 400 },
      );
    }

    const text =
      msg.content
        .map((c) => (c.type === "text" ? c.text : ""))
        .join("")
        .trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Optimization returned no content" },
        { status: 502 },
      );
    }

    let json: unknown;
    try {
      json = parseJsonFromModel(text);
    } catch (e) {
      console.error("[cv/improve-for-ats] JSON parse failed", e, text.slice(0, 500));
      return NextResponse.json(
        { success: false, error: "Optimization response was not valid JSON" },
        { status: 502 },
      );
    }

    const parsedRaw = improveCvSchemaFixed.safeParse(json);
    if (!parsedRaw.success) {
      console.error("[cv/improve-for-ats] validation failed", parsedRaw.error.flatten());
      return NextResponse.json(
        { success: false, error: "AI output validation failed" },
        { status: 502 },
      );
    }

    const parsed = parsedRaw.data;
    const experience = parsed.experience.length ? parsed.experience : prevExp;
    const education = parsed.education.length ? parsed.education : prevEdu;
    const skills = parsed.skills.length ? [...new Set(parsed.skills)].slice(0, 40) : prevSkills;
    const languages = parsed.languages?.length ? parsed.languages : prevLangs;
    const certifications =
      parsed.certifications && parsed.certifications.length ? parsed.certifications : prevCerts;

    await prisma.cV.update({
      where: { userId: session.user.id },
      data: {
        professionalTitle: parsed.professionalTitle,
        summary: parsed.summary,
        experience: toInputJson(experience),
        education: toInputJson(education),
        skills: toInputJson(skills),
        ...(languages.length ? { languages: toInputJson(languages) } : {}),
        ...(certifications.length ? { certifications: toInputJson(certifications) } : {}),
        atsScore: null,
        atsAnalysis: Prisma.DbNull,
        atsKeywords: Prisma.DbNull,
        atsSuggestions: Prisma.DbNull,
      },
      select: { id: true },
    });

    const updated = await prisma.cV.findUnique({ where: { userId: session.user.id } });
    const completionPct = computeCvCompletionPercent({
      cv: updated,
      hasProfilePhoto: Boolean(user?.image),
    });
    await prisma.cV.update({
      where: { userId: session.user.id },
      data: { completionPct, isComplete: completionPct >= 100 },
      select: { id: true },
    });

    const draft: ImproveForAtsDraft = {
      professionalTitle: parsed.professionalTitle,
      summary: parsed.summary,
      experience,
      education,
      skills,
      languages,
      certifications: certifications.length ? certifications : undefined,
    };

    return NextResponse.json({ success: true, data: { draft } });
  } catch (e) {
    console.error("[cv/improve-for-ats]", e);
    return NextResponse.json(
      { success: false, error: "CV optimization failed" },
      { status: 502 },
    );
  }
}
