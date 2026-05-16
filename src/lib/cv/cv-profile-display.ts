import { mergeExperienceDescriptionFromRecord } from "@/lib/cv/experience-description";

export function pickStr(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

export function normalizeExperience(
  raw: unknown,
): Array<{ title: string; company: string; description: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || item === null) return { title: "", company: "", description: "" };
      const r = item as Record<string, unknown>;
      const title = pickStr(r, "title", "jobTitle", "position", "role") ?? "";
      const company = pickStr(r, "company", "employer", "organization") ?? "";
      const description = mergeExperienceDescriptionFromRecord(r);
      return { title, company, description };
    })
    .filter((x) => x.title || x.company || x.description);
}

export function normalizeEducation(raw: unknown): Array<{ degree: string; institution: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || item === null) return { degree: "", institution: "" };
      const r = item as Record<string, unknown>;
      return {
        degree: pickStr(r, "degree", "field", "qualification") ?? "",
        institution: pickStr(r, "institution", "school", "university", "college") ?? "",
      };
    })
    .filter((x) => x.degree || x.institution);
}

export function asSkillLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => {
      if (typeof x === "string" && x.trim()) return x.trim();
      if (x && typeof x === "object") {
        const r = x as Record<string, unknown>;
        return pickStr(r, "name", "skill", "label") ?? "";
      }
      return "";
    })
    .filter(Boolean);
}

export function asStringLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((x) => {
    if (typeof x === "string" && x.trim()) return [x.trim()];
    if (x && typeof x === "object") {
      const r = x as Record<string, unknown>;
      const name = pickStr(r, "name", "language", "label", "title");
      const level = pickStr(r, "level", "proficiency");
      if (name && level) return [`${name} (${level})`];
      if (name) return [name];
      const issuer = pickStr(r, "issuer", "organization");
      const combined = [name, issuer].filter(Boolean).join(" · ");
      if (combined) return [combined];
    }
    return [];
  });
}

export type CvProfileSlice = {
  fullName: string | null;
  professionalTitle: string | null;
  summary: string | null;
  experience: unknown;
  education: unknown;
  skills: unknown;
  languages: unknown;
  certifications: unknown;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
};
