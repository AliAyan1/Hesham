/** Pinned IDs per https://platform.claude.com/docs/en/about-claude/models/overview */
export const DEFAULT_CLAUDE_MESSAGE_MODELS = [
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-5-20250929",
] as const;

/** Env list first, then defaults (deduped), so retired single-model env values don’t block fallbacks. */
export function claudeMessageModelCandidates(): string[] {
  const raw = process.env.ANTHROPIC_ATS_MODEL?.trim();
  const fromEnv = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const id of [...fromEnv, ...DEFAULT_CLAUDE_MESSAGE_MODELS]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  return merged.length ? merged : [...DEFAULT_CLAUDE_MESSAGE_MODELS];
}
