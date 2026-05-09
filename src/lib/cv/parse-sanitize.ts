import { mergeExperienceDescriptionFromRecord } from "@/lib/cv/experience-description";

function pickStr(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

function coerceArray(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") return [raw];
  return [];
}

/** First plausible email substring; avoids pasted labels like "Email: john@..." */
export function normalizeExtractedEmail(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const fromAngle = raw.match(/<([^>\s]+@[^>\s]+)>/);
  const candidate = fromAngle?.[1] ?? raw.trim();
  const emailMatch = candidate.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63})/i);
  return emailMatch ? emailMatch[1] : candidate.includes("@") ? candidate.slice(0, 254) : undefined;
}

/** Collapse weird whitespace but keep intentional line breaks minimal for phone strings. */
export function normalizeExtractedPhone(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const t = raw.replace(/\u00a0/g, " ").trim();
  if (t.length > 80) return t.slice(0, 80).trim();
  return t.replace(/\s{2,}/g, " ");
}

function buildDateLine(row: Record<string, unknown>): string | null {
  const start = pickStr(row, "startDate", "start", "from", "dateFrom", "started", "periodStart");
  const endRaw = pickStr(row, "endDate", "end", "to", "dateTo", "ended", "periodEnd");
  const explicitCurrent =
    row.current === true ||
    (typeof row.isCurrent === "boolean" && row.isCurrent === true) ||
    (endRaw && ["present", "current", "now", "today"].includes(endRaw.toLowerCase()));

  const endClean = explicitCurrent ? "Present" : endRaw;

  if (start && endClean) return `${start} – ${endClean}`;
  if (start) return start;
  if (endClean) return endClean;
  return null;
}

function prependIfMissing(paragraphs: string[], line: string | null): string[] {
  if (!line) return paragraphs;
  const body = paragraphs.join("\n\n").trim();
  if (!body) return [line];
  const firstLower = body.split("\n")[0]?.toLowerCase() ?? "";
  if (
    firstLower.includes(line.slice(0, 6).toLowerCase()) ||
    /\d{4}\s*[–\-–]\s*\d{4}|present|\b\d{4}\b/.test(firstLower)
  ) {
    return paragraphs;
  }
  return [line, ...paragraphs.filter(Boolean)];
}

export function sanitizeExperienceRows(raw: unknown): unknown[] {
  const rows = coerceArray(raw);
  const out: Record<string, unknown>[] = [];

  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;

    let title =
      pickStr(r, "title", "jobTitle", "role", "position", "designation", "job_role", "positionTitle") ||
      "";
    const company =
      pickStr(r, "company", "employer", "organization", "org", "employerName", "companyName") || "";

    if (!title.trim() && typeof r.summary === "string" && r.summary.trim()) title = r.summary.trim();

    const descBody = mergeExperienceDescriptionFromRecord(r);
    const dateLine = buildDateLine(r);
    const paragraphs: string[] = [];
    const withDates = prependIfMissing(descBody.trim() ? [descBody.trim()] : [], dateLine ?? null);
    if (withDates.length) paragraphs.push(...withDates);

    const description = paragraphs.join("\n\n").trim();

    if (!title && !company && !description) continue;

    out.push({
      title: title.slice(0, 240),
      company: company.slice(0, 240),
      description: description.slice(0, 16000),
    });
  }

  return out.length ? out : [{ title: "", company: "", description: "" }];
}

export function sanitizeEducationRows(raw: unknown): unknown[] {
  const rows = coerceArray(raw);
  const out: Record<string, unknown>[] = [];

  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    let degree =
      pickStr(r, "degree", "qualification", "diploma", "program", "course", "credential") || "";
    const field = pickStr(r, "field", "major", "studyField", "areaOfStudy", "specialization") || "";
    if (degree && field && !degree.toLowerCase().includes(field.toLowerCase())) {
      degree = `${degree} — ${field}`;
    } else if (!degree && field) degree = field;

    const institution =
      pickStr(r, "institution", "school", "university", "college", "academy", "institute") || "";

    const loc = pickStr(r, "location", "city", "country");
    const yearStart = pickStr(r, "startYear", "start", "from");
    const yearEnd = pickStr(r, "endYear", "end", "to", "graduationYear");
    const yearBits = [yearStart, yearEnd].filter(Boolean).join(" – ");
    const metaParts = [loc, yearBits].filter(Boolean);
    const meta = metaParts.join(" · ");

    const degreePart = degree || field;
    let finalDegree = degreePart;
    if (meta && degreePart && !degreePart.includes(meta)) finalDegree = `${degreePart} (${meta})`;
    else if (meta && !degreePart) finalDegree = meta;

    finalDegree = finalDegree.trim();
    if (!finalDegree && !institution) continue;

    out.push({
      degree: finalDegree.slice(0, 400),
      institution: institution.slice(0, 400),
    });
  }

  return out.length ? out : [{ degree: "", institution: "" }];
}

export function sanitizeSkills(raw: unknown): unknown[] {
  const rows = coerceArray(raw);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of rows) {
    if (typeof item === "string") {
      const s = item.trim();
      if (!s) continue;
      const k = s.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name = pickStr(r, "name", "skill", "title", "label");
    if (!name) continue;
    const k = name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    const level = pickStr(r, "level", "proficiency");
    out.push(level ? `${name} (${level})` : name);
  }

  return out.slice(0, 60);
}

export function sanitizeLanguages(raw: unknown): unknown[] {
  const rows = coerceArray(raw);
  const out: unknown[] = [];

  for (const item of rows) {
    if (typeof item === "string") {
      const s = item.trim();
      if (s) out.push(s);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const lang = pickStr(r, "language", "name", "lang");
    if (!lang) continue;
    const prof = pickStr(r, "proficiency", "level", "fluency");
    out.push(prof ? { language: lang, proficiency: prof } : { language: lang });
  }

  return out;
}

export function sanitizeCertifications(raw: unknown): unknown[] {
  const rows = coerceArray(raw);
  const out: unknown[] = [];

  for (const item of rows) {
    if (typeof item === "string") {
      const s = item.trim();
      if (s) out.push(s);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name = pickStr(r, "name", "title", "certification", "credential");
    if (!name) continue;
    const org = pickStr(r, "organization", "issuer", "provider");
    const date = pickStr(r, "issueDate", "date", "year");
    const bits = [name, org, date].filter(Boolean);
    out.push(bits.join(" — ").slice(0, 300));
  }

  return out;
}

export function collapseWhitespace(s: string | undefined, maxLen: number): string | undefined {
  if (!s?.trim()) return undefined;
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

export type ParsedCvShape = {
  fullName?: string;
  fullNameAr?: string;
  professionalTitle?: string;
  professionalTitleAr?: string;
  email?: string;
  phone?: string;
  location?: string;
  locationAr?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  summary?: string;
  summaryAr?: string;
  experience?: unknown;
  education?: unknown;
  skills?: unknown;
  languages?: unknown;
  certifications?: unknown;
};

export function sanitizeParsedCvPayload(data: ParsedCvShape): ParsedCvShape {
  const experienceArr = sanitizeExperienceRows(data.experience);
  const firstExpTitle =
    Array.isArray(experienceArr) && experienceArr[0] && typeof experienceArr[0] === "object"
      ? String((experienceArr[0] as Record<string, unknown>).title ?? "").trim()
      : "";

  let professionalTitle = collapseWhitespace(data.professionalTitle, 200);
  if (!professionalTitle?.trim() && firstExpTitle) {
    professionalTitle = collapseWhitespace(firstExpTitle, 200);
  }

  const summary = collapseWhitespace(data.summary, 4000);
  const summaryAr = collapseWhitespace(data.summaryAr, 4000);

  return {
    ...data,
    fullName: collapseWhitespace(data.fullName, 200),
    fullNameAr: collapseWhitespace(data.fullNameAr, 200),
    professionalTitle,
    professionalTitleAr: collapseWhitespace(data.professionalTitleAr, 200),
    email: normalizeExtractedEmail(data.email),
    phone: normalizeExtractedPhone(data.phone),
    location: collapseWhitespace(data.location, 200),
    locationAr: collapseWhitespace(data.locationAr, 200),
    summary,
    summaryAr,
    experience: experienceArr,
    education: sanitizeEducationRows(data.education),
    skills: sanitizeSkills(data.skills),
    languages: sanitizeLanguages(data.languages),
    certifications: sanitizeCertifications(data.certifications),
  };
}
