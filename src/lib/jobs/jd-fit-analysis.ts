import { z } from "zod";
import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import { parseHiringMeta } from "@/lib/jobs/job-detail-display";

export const jdFitIssueSchema = z.object({
  code: z.string().max(64),
  severity: z.enum(["critical", "major", "minor"]),
  title: z.string().max(200),
  titleAr: z.string().max(200).optional().default(""),
  detail: z.string().max(800),
  detailAr: z.string().max(800).optional().default(""),
});

export const jdFitAnalysisSchema = z.object({
  fitScore: z.number().int().min(0).max(100),
  summary: z.string().max(1200),
  summaryAr: z.string().max(1200).optional().default(""),
  strengths: z.array(z.string().max(300)).max(8).default([]),
  strengthsAr: z.array(z.string().max(300)).max(8).optional().default([]),
  gaps: z.array(jdFitIssueSchema).max(12).default([]),
  canStillApply: z.boolean().default(true),
  analyzedAt: z.string().optional(),
});

export type JdFitIssue = z.infer<typeof jdFitIssueSchema>;
export type JdFitAnalysis = z.infer<typeof jdFitAnalysisSchema>;

export type JdFitJobInput = {
  title: string;
  description: string;
  requirements: unknown;
  skills: unknown;
  hiringMeta: unknown;
};

export type JdFitCvInput = {
  professionalTitle: string | null;
  summary: string | null;
  experience: unknown;
  education: unknown;
  skills: unknown;
};

function asLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => {
      if (typeof x === "string") return x.trim();
      if (x && typeof x === "object") {
        const r = x as Record<string, unknown>;
        const name = [r.name, r.skill, r.label, r.title, r.degree, r.company].find(
          (v) => typeof v === "string" && String(v).trim(),
        ) as string | undefined;
        return name?.trim() ?? "";
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, 40);
}

function estimateYears(experience: unknown): number | null {
  if (!Array.isArray(experience) || experience.length === 0) return null;
  let months = 0;
  for (const item of experience) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const start = typeof r.startDate === "string" ? Date.parse(r.startDate) : NaN;
    const endRaw =
      r.current === true ? Date.now() : typeof r.endDate === "string" ? Date.parse(r.endDate) : NaN;
    if (Number.isFinite(start) && Number.isFinite(endRaw) && endRaw >= start) {
      months += Math.max(1, Math.round((endRaw - start) / (1000 * 60 * 60 * 24 * 30)));
    } else {
      months += 12;
    }
  }
  return Math.max(0, Math.round(months / 12));
}

function heuristicFit(job: JdFitJobInput, cv: JdFitCvInput): JdFitAnalysis {
  const meta = parseHiringMeta(job.hiringMeta);
  const requiredYears = meta?.yearsExperience ?? null;
  const cvYears = estimateYears(cv.experience);
  const metaSkills =
    job.hiringMeta && typeof job.hiringMeta === "object"
      ? (job.hiringMeta as { requiredSkills?: unknown }).requiredSkills
      : [];
  const jobSkills = new Set(
    [...asLines(job.skills), ...asLines(metaSkills)].map((s) => s.toLowerCase()),
  );
  const cvSkills = new Set(asLines(cv.skills).map((s) => s.toLowerCase()));
  const missingSkills = [...jobSkills]
    .filter((s) => ![...cvSkills].some((c) => c.includes(s) || s.includes(c)))
    .slice(0, 6);

  const gaps: JdFitIssue[] = [];
  if (requiredYears != null && cvYears != null && cvYears < requiredYears) {
    gaps.push({
      code: "experience_years",
      severity: requiredYears - cvYears >= 3 ? "critical" : "major",
      title: "Experience below job requirement",
      titleAr: "الخبرة أقل من متطلب الوظيفة",
      detail: `This role asks for about ${requiredYears} years; your CV suggests ~${cvYears} year(s).`,
      detailAr: `هذه الوظيفة تطلب نحو ${requiredYears} سنوات؛ سيرتك تشير إلى حوالي ${cvYears} سنة.`,
    });
  } else if (requiredYears != null && cvYears == null) {
    gaps.push({
      code: "experience_unclear",
      severity: "minor",
      title: "Experience duration unclear",
      titleAr: "مدة الخبرة غير واضحة",
      detail: `Role prefers ~${requiredYears} years of experience; dates on your CV are incomplete.`,
      detailAr: `الدور يفضّل نحو ${requiredYears} سنوات خبرة؛ تواريخ الخبرة في سيرتك غير مكتملة.`,
    });
  }

  if (meta?.educationRequirement?.trim()) {
    const eduText = asLines(cv.education).join(" ").toLowerCase();
    const req = meta.educationRequirement.toLowerCase();
    const keywords = ["bachelor", "master", "phd", "degree", "بكالوريوس", "ماجستير", "دكتوراه"];
    const needsDegree = keywords.some((k) => req.includes(k));
    if (needsDegree && !keywords.some((k) => eduText.includes(k))) {
      gaps.push({
        code: "education",
        severity: "major",
        title: "Education may not match",
        titleAr: "التعليم قد لا يطابق المتطلب",
        detail: `Job asks for: ${meta.educationRequirement}. Your CV education may not clearly meet this.`,
        detailAr: `الوظيفة تطلب: ${meta.educationRequirement}. تعليمك في السيرة قد لا يطابق ذلك بوضوح.`,
      });
    }
  }

  for (const skill of missingSkills.slice(0, 4)) {
    gaps.push({
      code: "skill_gap",
      severity: "major",
      title: `Missing skill: ${skill}`,
      titleAr: `مهارة ناقصة: ${skill}`,
      detail: `The job lists "${skill}" but it is not clearly on your CV.`,
      detailAr: `الوظيفة تذكر «${skill}» لكنها غير واضحة في سيرتك.`,
    });
  }

  let fitScore = 72;
  for (const g of gaps) {
    if (g.severity === "critical") fitScore -= 18;
    else if (g.severity === "major") fitScore -= 10;
    else fitScore -= 4;
  }
  fitScore = Math.min(100, Math.max(15, fitScore));

  return {
    fitScore,
    summary:
      gaps.length === 0
        ? "Your profile looks reasonably aligned with this job. You can apply with confidence."
        : `We found ${gaps.length} gap(s) versus the job requirements. You can still apply — review the points below first.`,
    summaryAr:
      gaps.length === 0
        ? "ملفك يبدو متوافقاً بشكل معقول مع هذه الوظيفة. يمكنك التقديم بثقة."
        : `وجدنا ${gaps.length} فجوة/فجوات مقابل متطلبات الوظيفة. ما زال بإمكانك التقديم — راجع النقاط أدناه أولاً.`,
    strengths: [
      ...(cv.professionalTitle ? [`Title: ${cv.professionalTitle}`] : []),
      ...(cvSkills.size ? [`Skills listed: ${[...cvSkills].slice(0, 5).join(", ")}`] : []),
    ],
    strengthsAr: [],
    gaps,
    canStillApply: true,
    analyzedAt: new Date().toISOString(),
  };
}

export async function analyzeJdFit(params: {
  job: JdFitJobInput;
  cv: JdFitCvInput;
}): Promise<JdFitAnalysis> {
  const { job, cv } = params;
  const meta = parseHiringMeta(job.hiringMeta);
  const cvYears = estimateYears(cv.experience);
  const requirements = asLines(job.requirements);
  const jobSkills = asLines(job.skills);
  const requiredSkills = asLines(
    job.hiringMeta && typeof job.hiringMeta === "object"
      ? (job.hiringMeta as { requiredSkills?: unknown }).requiredSkills
      : [],
  );

  const user =
    `Compare this job posting to the candidate CV. Flag real mismatches only (experience years, education, mandatory skills, role relevance).\n` +
    `Return ONLY JSON:\n` +
    `{"fitScore":0-100,"summary":"","summaryAr":"","strengths":[""],"strengthsAr":[""],"gaps":[{"code":"experience_years|education|skill_gap|role_mismatch|other","severity":"critical|major|minor","title":"","titleAr":"","detail":"","detailAr":""}],"canStillApply":true}\n` +
    `Be fair and specific. Do not invent CV facts. canStillApply must always be true.\n\n` +
    `JOB TITLE: ${job.title}\n` +
    `JOB DESCRIPTION:\n${job.description.slice(0, 6000)}\n` +
    `REQUIREMENTS:\n${requirements.join("\n") || "(none listed)"}\n` +
    `SKILLS: ${[...jobSkills, ...requiredSkills].join(", ") || "(none)"}\n` +
    `HIRING META: years=${meta?.yearsExperience ?? "n/a"}, level=${meta?.experienceLevel ?? "n/a"}, education=${meta?.educationRequirement ?? "n/a"}\n\n` +
    `CANDIDATE TITLE: ${cv.professionalTitle ?? "n/a"}\n` +
    `SUMMARY: ${(cv.summary ?? "").slice(0, 1500)}\n` +
    `ESTIMATED YEARS (from CV dates/roles): ${cvYears ?? "unknown"}\n` +
    `EXPERIENCE JSON: ${JSON.stringify(cv.experience).slice(0, 3500)}\n` +
    `EDUCATION JSON: ${JSON.stringify(cv.education).slice(0, 1500)}\n` +
    `SKILLS: ${asLines(cv.skills).join(", ") || "(none)"}\n`;

  const claude = await fetchClaudeJsonText({
    system:
      "You are a careful recruiting fit analyst. Output one JSON object only. Never block applications; only warn about gaps.",
    user,
    maxTokens: 3500,
  });

  if (claude.ok) {
    try {
      const json = parseJsonFromModel(claude.text);
      const v = jdFitAnalysisSchema.safeParse(json);
      if (v.success) {
        return {
          ...v.data,
          canStillApply: true,
          analyzedAt: new Date().toISOString(),
          gaps: v.data.gaps.map((g) => ({
            ...g,
            titleAr: g.titleAr || g.title,
            detailAr: g.detailAr || g.detail,
          })),
        };
      }
    } catch (err) {
      console.error("[jd-fit] parse failed:", err);
    }
  } else {
    console.error("[jd-fit] Claude unavailable:", claude.error);
  }

  return heuristicFit(job, cv);
}

export function parseStoredFitAnalysis(raw: unknown): JdFitAnalysis | null {
  const v = jdFitAnalysisSchema.safeParse(raw);
  return v.success ? v.data : null;
}
