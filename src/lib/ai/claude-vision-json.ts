import { APIError } from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages";
import { getAnthropic } from "@/lib/ai/anthropic";
import { claudeMessageModelCandidates } from "@/lib/ai/claude-model-candidates";

export type ClaudeVisionJsonResult =
  | { ok: true; text: string }
  | { ok: false; error: "missing_key" | "no_model" | "no_text" | "request_failed" };

/**
 * One image (base64) + prompt → JSON-shaped text. Caller parses JSON.
 */
export async function fetchClaudeVisionJsonText(params: {
  system: string;
  userText: string;
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  maxTokens?: number;
}): Promise<ClaudeVisionJsonResult> {
  let anthropic: ReturnType<typeof getAnthropic>;
  try {
    anthropic = getAnthropic();
  } catch {
    return { ok: false, error: "missing_key" };
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const candidates = claudeMessageModelCandidates();
      let msg: Message | undefined;
      for (const model of candidates) {
        try {
          msg = await anthropic.messages.create({
            model,
            max_tokens: params.maxTokens ?? 1024,
            temperature: 0.1,
            stream: false,
            system: params.system,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: params.mediaType,
                      data: params.imageBase64,
                    },
                  },
                  { type: "text", text: params.userText },
                ],
              },
            ],
          });
          break;
        } catch (e) {
          if (e instanceof APIError && e.status === 404) continue;
          throw e;
        }
      }
      if (!msg) return { ok: false, error: "no_model" };
      const block = msg.content.find((c) => c.type === "text");
      if (!block || block.type !== "text") return { ok: false, error: "no_text" };
      return { ok: true, text: block.text };
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr && lastErr instanceof Error && lastErr.message.includes("ANTHROPIC_API_KEY")) {
    return { ok: false, error: "missing_key" };
  }
  return { ok: false, error: "request_failed" };
}
