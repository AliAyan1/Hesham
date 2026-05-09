/** Merge prose + bullet-style fields from a parsed CV row into one description string for the builder. */
export function mergeExperienceDescriptionFromRecord(row: Record<string, unknown>): string {
  const chunks: string[] = [];
  const desc = row.description;
  if (typeof desc === "string" && desc.trim()) chunks.push(desc.trim());
  else if (Array.isArray(desc)) {
    const lines = (desc as unknown[]).filter((x): x is string => typeof x === "string");
    if (lines.length) chunks.push(lines.join("\n"));
  }
  const listKeys = [
    "bulletPoints",
    "bullets",
    "highlights",
    "responsibilities",
    "achievements",
    "accomplishments",
    "duties",
    "keyAchievements",
  ];
  for (const k of listKeys) {
    const v = row[k];
    if (!Array.isArray(v)) continue;
    const lines = v.filter((x): x is string => typeof x === "string" && Boolean(x.trim())).map((x) => x.trim());
    if (lines.length)
      chunks.push(lines.map((l) => (l.startsWith("•") ? l : `• ${l.replace(/^-\s*/, "")}`)).join("\n"));
  }
  return chunks.join("\n\n");
}
