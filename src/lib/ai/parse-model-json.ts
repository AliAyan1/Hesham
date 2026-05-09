/**
 * Parse JSON from LLM output that may include markdown fences or leading/trailing prose.
 */
export function parseJsonFromModel(raw: string): unknown {
  const trimmed = raw.trim();
  const fence =
    trimmed.match(/^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```\s*$/im)?.[1] ??
    trimmed.match(/```(?:json)?\s*([\s\S]*?)```/im)?.[1];
  const candidate = fence?.trim() ?? trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Model output was not valid JSON");
  }
}
