import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export type SupportedCvMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/msword";

export function isSupportedCvMime(mime: string): mime is SupportedCvMime {
  return (
    mime === "application/pdf" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/msword"
  );
}

export async function extractTextFromFile(
  file: File,
): Promise<{ text: string; kind: "pdf" | "docx" | "doc" }> {
  const buf = Buffer.from(await file.arrayBuffer());
  if (file.type === "application/pdf") {
    const out = await pdfParse(buf);
    return { text: out.text ?? "", kind: "pdf" };
  }
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const out = await mammoth.extractRawText({ buffer: buf });
    return { text: out.value ?? "", kind: "docx" };
  }
  // .doc parsing reliably requires native helpers; we gate with a clear error upstream.
  return { text: "", kind: "doc" };
}

