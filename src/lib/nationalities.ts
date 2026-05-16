/** Canonical nationality labels stored on the job seeker profile. */
export const NATIONALITY_OPTIONS = [
  "Saudi Arabian",
  "Emirati",
  "Kuwaiti",
  "Qatari",
  "Bahraini",
  "Omani",
  "Egyptian",
  "Jordanian",
  "Lebanese",
  "Palestinian",
  "Syrian",
  "Iraqi",
  "Yemeni",
  "Sudanese",
  "Moroccan",
  "Tunisian",
  "Algerian",
  "Libyan",
  "Pakistani",
  "Indian",
  "Bangladeshi",
  "Filipino",
  "Indonesian",
  "Turkish",
  "Iranian",
  "Afghan",
  "Nepali",
  "Sri Lankan",
  "American",
  "British",
  "Canadian",
  "French",
  "German",
  "Spanish",
  "Italian",
  "Chinese",
  "Japanese",
  "South Korean",
  "Malaysian",
  "Singaporean",
  "Australian",
  "South African",
  "Nigerian",
  "Ethiopian",
  "Other",
] as const;

export type NationalityOption = (typeof NATIONALITY_OPTIONS)[number];

export type NationalityLetterGroup = {
  letter: string;
  items: string[];
};

/** Map legacy free-text values to a list option when possible. */
export function normalizeNationality(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const hit = NATIONALITY_OPTIONS.find((n) => n.toLowerCase() === lower);
  if (hit) return hit;
  const aliases: Record<string, NationalityOption> = {
    saudi: "Saudi Arabian",
    "saudi arabia": "Saudi Arabian",
    uae: "Emirati",
    emirates: "Emirati",
    pakistan: "Pakistani",
    pakistani: "Pakistani",
    india: "Indian",
    egypt: "Egyptian",
  };
  return aliases[lower] ?? trimmed;
}

function collectOptions(current: string): string[] {
  const normalized = normalizeNationality(current);
  const set = new Set<string>(NATIONALITY_OPTIONS);
  if (normalized && normalized !== "Other" && !set.has(normalized)) {
    set.add(normalized);
  }
  const other = set.has("Other") ? ["Other"] : [];
  set.delete("Other");
  const sorted = [...set].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  return [...sorted, ...other];
}

/** Nationalities sorted A→Z, grouped under letter headings for `<optgroup>`. */
export function nationalityGroupsForValue(current: string): NationalityLetterGroup[] {
  const options = collectOptions(current);
  const byLetter = new Map<string, string[]>();

  for (const name of options) {
    const letter = name.charAt(0).toUpperCase();
    const bucket = byLetter.get(letter) ?? [];
    bucket.push(name);
    byLetter.set(letter, bucket);
  }

  return [...byLetter.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, items]) => ({ letter, items }));
}
