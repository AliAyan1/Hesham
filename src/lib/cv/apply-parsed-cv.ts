import { mergeExperienceDescriptionFromRecord } from "@/lib/cv/experience-description";

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

export type ParsedCvFormSlice = {
  name?: string;
  phone?: string;
  location?: string;
  bio?: string;
  professionalTitle?: string;
  summary?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  experience: { title: string; company: string; description: string }[];
  education: { degree: string; institution: string }[];
  skillsText: string;
  languagesText: string;
  certsText: string;
};

/** Map `/api/cv/parse` payload into job seeker profile form fields. */
export function mapParsedCvToForm(parsed: Record<string, unknown>): ParsedCvFormSlice {
  const exp = Array.isArray(parsed.experience) ? (parsed.experience as unknown[]) : [];
  const edu = Array.isArray(parsed.education) ? (parsed.education as unknown[]) : [];
  const sk = Array.isArray(parsed.skills) ? (parsed.skills as unknown[]) : [];
  const lang = Array.isArray(parsed.languages) ? (parsed.languages as unknown[]) : [];
  const certs = Array.isArray(parsed.certifications) ? (parsed.certifications as unknown[]) : [];

  const skillsLines = sk
    .map((row) => {
      if (typeof row === "string") return row.trim();
      const r = row as Record<string, unknown>;
      return typeof r.name === "string" ? r.name.trim() : "";
    })
    .filter(Boolean);

  const langLines = lang
    .map((row) => {
      if (typeof row === "string") return row.trim();
      const r = row as Record<string, unknown>;
      const n = typeof r.language === "string" ? r.language : typeof r.name === "string" ? r.name : "";
      const lv = typeof r.proficiency === "string" ? r.proficiency : typeof r.level === "string" ? r.level : "";
      return n && lv ? `${n} — ${lv}` : n;
    })
    .filter(Boolean);

  const certLines = certs
    .map((row) => {
      if (typeof row === "string") return row.trim();
      const r = row as Record<string, unknown>;
      return typeof r.name === "string" ? r.name.trim() : typeof r.title === "string" ? r.title.trim() : "";
    })
    .filter(Boolean);

  const summary = pickStr(parsed, "summary", "profile", "about");

  return {
    name: pickStr(parsed, "fullName", "name"),
    phone: pickStr(parsed, "phone", "mobile"),
    location: pickStr(parsed, "location"),
    bio: summary,
    professionalTitle: pickStr(parsed, "professionalTitle", "headline", "jobTitle", "role"),
    summary,
    linkedinUrl: pickStr(parsed, "linkedinUrl", "linkedin"),
    portfolioUrl: pickStr(parsed, "portfolioUrl", "website", "websiteUrl"),
    experience:
      exp.length > 0
        ? exp.map((row) => {
            const r = row as Record<string, unknown>;
            return {
              title: pickStr(r, "title", "jobTitle", "role", "position") ?? "",
              company: pickStr(r, "company", "employer", "organization", "org") ?? "",
              description: mergeExperienceDescriptionFromRecord(r),
            };
          })
        : [{ title: "", company: "", description: "" }],
    education:
      edu.length > 0
        ? edu.map((row) => {
            const r = row as Record<string, unknown>;
            return {
              degree: pickStr(r, "degree", "qualification") ?? "",
              institution: pickStr(r, "institution", "school", "university") ?? "",
            };
          })
        : [{ degree: "", institution: "" }],
    skillsText: skillsLines.join("\n"),
    languagesText: langLines.join("\n"),
    certsText: certLines.join("\n"),
  };
}
