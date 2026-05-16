import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse, SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
import { extractTextFromFile, isSupportedCvMime } from "@/lib/cv/extract-text";
import { getOpenAI } from "@/lib/ai/openai";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { refreshJobSeekerCvCompletionPct } from "@/lib/cv/refresh-jobseeker-completion";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import {
  sanitizeParsedCvPayload,
  type ParsedCvShape,
} from "@/lib/cv/parse-sanitize";

export const runtime = "nodejs";

/** Hobby / defaults can be shorter; parsing + OpenAI benefits from extra headroom (e.g. Vercel Pro). */
export const maxDuration = 120;

const MAX_BYTES = 5 * 1024 * 1024;

function coerceToArray(val: unknown): unknown {
  if (val === null || val === undefined) return undefined;
  if (Array.isArray(val)) return val;
  if (typeof val === "object") return [val];
  if (typeof val === "string") {
    const s = val.trim();
    return s ? [s] : undefined;
  }
  return val;
}

const arrayField = z.preprocess(coerceToArray, z.array(z.unknown()).optional());

/** Accepts null, numbers, and empty omissions from the model. */
const laxString = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) =>
    v == null || v === "" ? undefined : typeof v === "number" ? String(v) : v.trim() === "" ? undefined : v,
  );

const parsedSchema = z.object({
  fullName: laxString,
  fullNameAr: laxString,
  professionalTitle: laxString,
  professionalTitleAr: laxString,
  email: laxString,
  phone: laxString,
  location: laxString,
  locationAr: laxString,
  linkedinUrl: laxString,
  portfolioUrl: laxString,
  summary: laxString,
  summaryAr: laxString,
  experience: arrayField,
  education: arrayField,
  skills: arrayField,
  languages: arrayField,
  certifications: arrayField,
});

/** Models often wrap JSON in ```json fences``` or prepend prose; GPT also returns null for absent fields (Zod `.optional()` disallows null). */
function stripTopLevelNulls(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const o = { ...(value as Record<string, unknown>) };
  for (const k of Object.keys(o)) {
    if (o[k] === null) delete o[k];
  }
  return o;
}

/**
 * GPT often uses alternate keys (`headline`, `github`). Merge into canonical fields before validation.
 */
function mergeCvAliases(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const o = { ...(value as Record<string, unknown>) };

  function firstString(keys: string[]): string | undefined {
    for (const k of keys) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number") return String(v);
    }
    return undefined;
  }

  function setIfAbsent(key: string, aliases: string[]) {
    const cur = o[key];
    if (typeof cur === "string" && cur.trim()) return;
    const found = firstString(aliases);
    if (found) o[key] = found;
  }

  setIfAbsent("professionalTitle", [
    "headline",
    "jobTitle",
    "currentRole",
    "role",
    "position",
    "title",
    "tagline",
    "desiredPosition",
  ]);
  setIfAbsent("fullNameAr", ["nameAr", "nameArabic", "fullNameInArabic", "fullNameArabic"]);
  setIfAbsent("professionalTitleAr", ["professionalTitleArabic", "jobTitleAr", "headlineAr"]);
  setIfAbsent("linkedinUrl", ["linkedin", "linkedIn", "linkedinProfile"]);
  setIfAbsent("portfolioUrl", ["website", "websiteUrl", "personalWebsite", "githubUrl", "github", "portfolio"]);
  setIfAbsent("locationAr", ["addressAr", "cityAr"]);
  setIfAbsent("summaryAr", ["profileAr", "aboutAr", "bioAr"]);
  setIfAbsent("email", ["emailAddress", "eMail", "mail", "contactEmail", "e_mail"]);
  setIfAbsent("phone", ["mobile", "tel", "telephone", "cell", "cellphone", "phoneNumber", "whatsapp"]);
  setIfAbsent("fullName", ["name", "candidateName", "applicantName"]);

  return o;
}

/** Ensure save form + Prisma accept URLs (prepend https where missing). */
function normalizeHttpUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  let u = raw.trim().replace(/\s+/g, "");
  try {
    if (!/^https?:\/\//i.test(u)) {
      if (/^linkedin\.com\//i.test(u) || /^github\.com\//i.test(u) || /^[\w.-]+\.[a-z]{2,}/i.test(u)) {
        u = `https://${u.replace(/^\/+/, "")}`;
      }
    }
    const parsed = new URL(u);
    if (!parsed.hostname) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

type ParsedCv = z.infer<typeof parsedSchema>;

function normalizeParsedUrls(row: ParsedCv): ParsedCv {
  return {
    ...row,
    linkedinUrl: normalizeHttpUrl(row.linkedinUrl),
    portfolioUrl: normalizeHttpUrl(row.portfolioUrl),
  };
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  // Prisma expects JSON-compatible values; our payload originates from JSON.parse.
  return value as Prisma.InputJsonValue;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ parsed: unknown }>>> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true },
  });
  const tier = (user?.subscriptionTier ?? "FREE") as SubscriptionTier;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ success: false, error: "Invalid form data" }, { status: 400 });
  }

  const uploadContext = String(form.get("context") ?? "").trim().toLowerCase();
  const isProfileUpload = uploadContext === "profile";

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "File is required" }, { status: 400 });
  }

  if (!isSupportedCvMime(file.type)) {
    return NextResponse.json(
      { success: false, error: "Unsupported file type" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "File too large (max 5MB)" },
      { status: 400 },
    );
  }

  if (!isProfileUpload && !hasAccess(tier, "cv_ai_parse")) {
    return NextResponse.json(
      {
        success: false,
        error:
          "CV AI parsing is not available on your plan. Upgrade your subscription to use this feature.",
      },
      { status: 403 },
    );
  }

  const { text, kind } = await extractTextFromFile(file);
  if (kind === "doc") {
    return NextResponse.json(
      { success: false, error: "DOC files are not supported yet. Please upload PDF or DOCX." },
      { status: 400 },
    );
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return NextResponse.json(
      { success: false, error: "Could not extract text from file" },
      { status: 400 },
    );
  }

  const openai = getOpenAI();
  const parseModel = process.env.OPENAI_CV_PARSE_MODEL?.trim() || "gpt-4o";
  try {
    const cvTextLimit = 35_000;
    const prompt =
      "Extract structured data from this CV/resume. Be precise: copy text from the document; do NOT invent employers, degrees, dates, emails, or links that are not present.\n\n" +
      "Return ONE JSON object with these keys:\n" +
      "- fullName: as printed (top of CV / signature)\n" +
      "- fullNameAr: only if an Arabic name appears explicitly; else omit key\n" +
      "- professionalTitle: headline under the name, OR the exact job title of the most recent / current role if no headline exists (max 12 words, no fluff)\n" +
      "- professionalTitleAr: only if given in Arabic; else omit\n" +
      "- email: one address only, exactly as in the doc (no labels like \"Email:\")\n" +
      "- phone: one primary number as written\n" +
      "- location: city/country line if present\n" +
      "- locationAr: if location is in Arabic; else omit\n" +
      "- linkedinUrl: full https URL if linkedin.com appears anywhere (header, footer, contact)\n" +
      "- portfolioUrl: personal site, GitHub profile, Behance, or product link if clearly stated (not Google Drive unless it is the only portfolio link)\n" +
      "- summary: one paragraph merging Profile / About / Objective / Professional summary sections; third person is OK to keep as-is\n" +
      "- summaryAr: if an Arabic summary block exists; else omit\n" +
      "- experience: array of roles in DOCUMENT ORDER (usually reverse-chronological = most recent first). Each object:\n" +
      "  { title, company, employer (duplicate company if needed), startDate, endDate, current (boolean if role is ongoing), location optional,\n" +
      "   description: paragraph duties if any, bulletPoints: string[] for each bullet line under that role }\n" +
      "  Put every bullet for that role in bulletPoints; keep description for prose only. Do not merge unrelated jobs.\n" +
      "- education: [{ degree, field, institution or school/university, location, startYear, endYear, graduationYear, grade }]\n" +
      "- skills: mix of strings and/or { name, level, category }; list technical and soft skills from dedicated sections AND skills mentioned repeatedly in roles\n" +
      "- languages: [{ language, proficiency }] or []\n" +
      "- certifications: [{ name, organization, issueDate }] or []\n\n" +
      "Hard rules:\n" +
      "- Use empty arrays [] for missing sections; omit unknown scalar keys (never null).\n" +
      "- Dates: preserve month/year wording from the CV (e.g. Jan 2022, 2022-03, March 2020 – Present).\n" +
      "- If the CV mixes \"Projects\" or \"Volunteer\" with jobs, map paid employment to experience unless clearly labelled as internship—then include as normal experience with accurate title.\n" +
      "- professionalTitle MUST align with experience: prefer the newest role's title if the printed headline contradicts roles below.\n\n" +
      "CV TEXT:\n" +
      trimmed.slice(0, cvTextLimit);

    const completion = await openai.chat.completions.create({
      model: parseModel,
      messages: [
        {
          role: "system",
          content:
            "You extract CV fields into strict JSON only. Never fabricate URLs, employers, certifications, or contact info. " +
            "Prefer the most recent role's exact job title for professionalTitle when the document has no subtitle. " +
            "experience[] must preserve document order (typically current job first). " +
            "Use bulletPoints arrays for bulleted achievements so nothing is dropped. " +
            "Include fullNameAr / summaryAr / professionalTitleAr / locationAr only when Arabic appears. " +
            "Omit keys instead of null; use [] for empty lists.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const rawJson = stripTopLevelNulls(mergeCvAliases(parseJsonFromModel(content)));
    const validated = parsedSchema.safeParse(rawJson);
    if (!validated.success) {
      console.error(
        "[cv/parse] schema validation failed:",
        validated.error.flatten(),
        "keys:",
        rawJson && typeof rawJson === "object" ? Object.keys(rawJson as object) : rawJson,
      );
      return NextResponse.json(
        { success: false, error: "AI output validation failed" },
        { status: 502 },
      );
    }

    const sanitized = normalizeParsedUrls(
      sanitizeParsedCvPayload(validated.data as ParsedCvShape) as ParsedCv,
    );

    await prisma.cV.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        fullName: sanitized.fullName,
        fullNameAr: sanitized.fullNameAr,
        professionalTitle: sanitized.professionalTitle,
        professionalTitleAr: sanitized.professionalTitleAr,
        email: sanitized.email,
        phone: sanitized.phone,
        location: sanitized.location,
        locationAr: sanitized.locationAr,
        linkedinUrl: sanitized.linkedinUrl,
        portfolioUrl: sanitized.portfolioUrl,
        summary: sanitized.summary,
        summaryAr: sanitized.summaryAr,
        experience: sanitized.experience != null ? toInputJson(sanitized.experience) : undefined,
        education: sanitized.education != null ? toInputJson(sanitized.education) : undefined,
        skills: sanitized.skills != null ? toInputJson(sanitized.skills) : undefined,
        languages: sanitized.languages != null ? toInputJson(sanitized.languages) : undefined,
        certifications:
          sanitized.certifications != null ? toInputJson(sanitized.certifications) : undefined,
        lastParsed: new Date(),
      },
      update: {
        fullName: sanitized.fullName,
        fullNameAr: sanitized.fullNameAr,
        professionalTitle: sanitized.professionalTitle,
        professionalTitleAr: sanitized.professionalTitleAr,
        email: sanitized.email,
        phone: sanitized.phone,
        location: sanitized.location,
        locationAr: sanitized.locationAr,
        linkedinUrl: sanitized.linkedinUrl,
        portfolioUrl: sanitized.portfolioUrl,
        summary: sanitized.summary,
        summaryAr: sanitized.summaryAr,
        experience: sanitized.experience != null ? toInputJson(sanitized.experience) : undefined,
        education: sanitized.education != null ? toInputJson(sanitized.education) : undefined,
        skills: sanitized.skills != null ? toInputJson(sanitized.skills) : undefined,
        languages: sanitized.languages != null ? toInputJson(sanitized.languages) : undefined,
        certifications:
          sanitized.certifications != null ? toInputJson(sanitized.certifications) : undefined,
        lastParsed: new Date(),
      },
      select: { id: true },
    });

    if (isProfileUpload) {
      if (sanitized.fullName?.trim()) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { name: sanitized.fullName.trim() },
        });
      }
      await prisma.profile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          language: "ar",
          phone: sanitized.phone ?? null,
          location: sanitized.location ?? null,
          bio: sanitized.summary ?? null,
        },
        update: {
          ...(sanitized.phone ? { phone: sanitized.phone } : {}),
          ...(sanitized.location ? { location: sanitized.location } : {}),
          ...(sanitized.summary ? { bio: sanitized.summary } : {}),
        },
      });
    }

    await refreshJobSeekerCvCompletionPct(session.user.id);

    return NextResponse.json({ success: true, data: { parsed: sanitized } });
  } catch (e) {
    console.error("[cv/parse]", e);
    return NextResponse.json(
      { success: false, error: "AI parsing failed" },
      { status: 502 },
    );
  }
}

