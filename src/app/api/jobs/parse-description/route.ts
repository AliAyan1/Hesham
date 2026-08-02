import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { extractTextFromFile, isSupportedCvMime } from "@/lib/cv/extract-text";
import { fetchClaudeJsonText } from "@/lib/ai/claude-json";
import { parseJsonFromModel } from "@/lib/ai/parse-model-json";
import type { ApiResponse } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_BYTES = 8 * 1024 * 1024;

const outSchema = z.object({
  description: z.string().min(1).max(12000),
  descriptionAr: z.string().max(12000).optional().default(""),
  requirements: z.array(z.string().max(800)).max(80).optional().default([]),
  benefits: z.array(z.string().max(800)).max(80).optional().default([]),
});

function mimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
  return "";
}

function fallbackFromRawText(raw: string): z.infer<typeof outSchema> {
  const text = raw.replace(/\r\n/g, "\n").trim().slice(0, 12000);
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const reqIdx = lines.findIndex((l) =>
    /^(requirements|responsibilities|what you.?ll need|qualifications|المتطلبات|المسؤوليات)/i.test(l),
  );
  const benIdx = lines.findIndex((l) =>
    /^(benefits|perks|what we offer|المزايا|المنافع)/i.test(l),
  );

  let requirements: string[] = [];
  let benefits: string[] = [];
  let bodyEnd = lines.length;

  if (reqIdx >= 0) {
    const end = benIdx > reqIdx ? benIdx : lines.length;
    requirements = lines
      .slice(reqIdx + 1, end)
      .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter((l) => l.length > 2)
      .slice(0, 40);
    bodyEnd = Math.min(bodyEnd, reqIdx);
  }
  if (benIdx >= 0) {
    benefits = lines
      .slice(benIdx + 1)
      .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter((l) => l.length > 2)
      .slice(0, 40);
    bodyEnd = Math.min(bodyEnd, benIdx);
  }

  const description = lines.slice(0, bodyEnd).join("\n\n").trim() || text;

  return {
    description: description.slice(0, 12000),
    descriptionAr: "",
    requirements,
    benefits,
  };
}

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<
    ApiResponse<{
      description: string;
      descriptionAr: string;
      requirements: string[];
      benefits: string[];
    }>
  >
> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "file_required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: "file_too_large" }, { status: 400 });
  }

  const mime = file.type && file.type !== "application/octet-stream" ? file.type : mimeFromName(file.name);
  if (!isSupportedCvMime(mime)) {
    return NextResponse.json({ success: false, error: "unsupported_type" }, { status: 400 });
  }
  if (mime === "application/msword") {
    return NextResponse.json({ success: false, error: "doc_not_supported" }, { status: 400 });
  }

  const typedFile = new File([await file.arrayBuffer()], file.name, { type: mime });

  let extracted = "";
  try {
    const { text, kind } = await extractTextFromFile(typedFile);
    if (kind === "doc") {
      return NextResponse.json({ success: false, error: "doc_not_supported" }, { status: 400 });
    }
    extracted = text.replace(/\u0000/g, "").trim();
  } catch (err) {
    console.error("[jobs/parse-description] extract failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    const xref = /xref|FormatError|Invalid PDF/i.test(msg);
    return NextResponse.json(
      { success: false, error: xref ? "pdf_corrupt" : "extract_failed" },
      { status: 422 },
    );
  }

  if (extracted.length < 40) {
    return NextResponse.json({ success: false, error: "empty_document" }, { status: 422 });
  }

  const claude = await fetchClaudeJsonText({
    system:
      "You structure employer job-description documents into clean posting fields. Output one JSON object only. No markdown.",
    user:
      `Parse this job description document into posting fields.\n` +
      `Return ONLY JSON:\n` +
      `{"description":"English job overview (2–4 paragraphs)","descriptionAr":"Arabic translation of description","requirements":["bullet","..."],"benefits":["bullet","..."]}\n` +
      `If the source is Arabic-only, put Arabic in descriptionAr and provide a solid English description.\n` +
      `requirements/benefits should be concise bullet lines without leading dashes.\n\n` +
      `DOCUMENT:\n${extracted.slice(0, 14000)}`,
    maxTokens: 6000,
  });

  if (claude.ok) {
    try {
      const json = parseJsonFromModel(claude.text);
      const v = outSchema.safeParse(json);
      if (v.success) {
        return NextResponse.json(
          {
            success: true,
            data: {
              description: v.data.description.trim(),
              descriptionAr: (v.data.descriptionAr ?? "").trim(),
              requirements: v.data.requirements ?? [],
              benefits: v.data.benefits ?? [],
            },
          },
          { status: 200 },
        );
      }
      console.warn("[jobs/parse-description] invalid AI shape");
    } catch (err) {
      console.error("[jobs/parse-description] AI parse failed:", err);
    }
  } else {
    console.error("[jobs/parse-description] Claude unavailable:", claude.error);
  }

  const fallback = fallbackFromRawText(extracted);
  return NextResponse.json({ success: true, data: fallback }, { status: 200 });
}
