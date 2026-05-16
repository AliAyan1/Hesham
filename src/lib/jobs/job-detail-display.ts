export type HiringMetaShape = {
  educationRequirement?: string;
  experienceLevel?: string;
  yearsExperience?: number;
};

export function parseHiringMeta(raw: unknown): HiringMetaShape | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: HiringMetaShape = {};
  if (typeof o.educationRequirement === "string" && o.educationRequirement.trim()) {
    out.educationRequirement = o.educationRequirement.trim();
  }
  if (typeof o.experienceLevel === "string") {
    out.experienceLevel = o.experienceLevel;
  }
  if (typeof o.yearsExperience === "number" && Number.isFinite(o.yearsExperience)) {
    out.yearsExperience = o.yearsExperience;
  }
  return Object.keys(out).length ? out : null;
}

export function formatJobSalaryLine(input: {
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  notListed: string;
  range: (min: number, max: number, currency: string) => string;
  upTo: (max: number, currency: string) => string;
  from: (min: number, currency: string) => string;
}): string {
  const { salaryMin, salaryMax, currency, notListed, range, upTo, from } = input;
  if (salaryMin != null && salaryMax != null) return range(salaryMin, salaryMax, currency);
  if (salaryMax != null) return upTo(salaryMax, currency);
  if (salaryMin != null) return from(salaryMin, currency);
  return notListed;
}

export function experienceLevelLabel(
  level: string,
  labels: Record<string, string>,
): string {
  return labels[level] ?? level;
}
