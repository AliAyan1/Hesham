import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { extractText as unpdfExtractText, getDocumentProxy } from "unpdf";

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

function looksLikePdf(buf: Buffer, fileName: string, mime: string): boolean {
  if (mime === "application/pdf") return true;
  if (fileName.toLowerCase().endsWith(".pdf")) return true;
  return buf.length >= 5 && buf.subarray(0, 5).toString("utf8") === "%PDF-";
}

function looksLikeDocx(buf: Buffer, fileName: string, mime: string): boolean {
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return true;
  if (fileName.toLowerCase().endsWith(".docx")) return true;
  // ZIP/OOXML magic
  return buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b;
}

/** Last-resort scrape of printable strings from PDF bytes (handles some corrupt XRef PDFs). */
function scrapePdfStrings(buf: Buffer): string {
  const raw = buf.toString("latin1");
  const chunks: string[] = [];

  // Extract text inside parentheses in content streams (simple PDF text operators).
  const paren = /(?:Tj|TJ)\s*$|(?:\((?:\\.|[^\\)])*\))/gm;
  // Broader: capture parenthetical strings that look like words
  const re = /\(((?:\\.|[^\\)]){3,})\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const s = m[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, " ")
      .replace(/\\([()\\])/g, "$1")
      .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(Number.parseInt(oct, 8)))
      .trim();
    if (s && /[\p{L}\p{N}]/u.test(s)) chunks.push(s);
  }

  // Also pull UTF-16BE hex strings often used in PDFs: <FEFF...>
  const hexRe = /<((?:FEFF|fffe)?[0-9A-Fa-f]{8,})>/g;
  while ((m = hexRe.exec(raw)) !== null) {
    const hex = m[1];
    if (hex.length % 2 !== 0) continue;
    try {
      const bytes = Buffer.from(hex, "hex");
      let text = "";
      if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        for (let i = 2; i + 1 < bytes.length; i += 2) {
          text += String.fromCharCode((bytes[i]! << 8) | bytes[i + 1]!);
        }
      } else {
        text = bytes.toString("utf8");
      }
      text = text.replace(/\u0000/g, "").trim();
      if (text.length >= 3 && /[\p{L}\p{N}]/u.test(text)) chunks.push(text);
    } catch {
      /* ignore */
    }
  }

  void paren;
  return chunks.join(" ").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

async function extractPdfText(buf: Buffer): Promise<string> {
  const errors: unknown[] = [];

  // 1) unpdf (modern PDF.js serverless build) — more tolerant of odd PDFs
  try {
    const data = new Uint8Array(buf);
    const pdf = await getDocumentProxy(data, {
      // Keep going past recoverable parse errors when possible
      stopAtErrors: false,
    } as Parameters<typeof getDocumentProxy>[1]);
    const { text } = await unpdfExtractText(pdf, { mergePages: true });
    const merged = (typeof text === "string" ? text : text.join("\n")).trim();
    if (merged.length >= 20) return merged;
  } catch (err) {
    errors.push(err);
  }

  // 2) pdf-parse (legacy) as secondary
  try {
    const out = await pdfParse(buf);
    const t = (out.text ?? "").trim();
    if (t.length >= 20) return t;
  } catch (err) {
    errors.push(err);
  }

  // 3) Binary scrape for corrupt XRef / damaged PDFs
  const scraped = scrapePdfStrings(buf);
  if (scraped.length >= 40) return scraped;

  const detail = errors
    .map((e) => (e instanceof Error ? e.message : String(e)))
    .filter(Boolean)
    .slice(0, 2)
    .join(" | ");
  throw new Error(detail || "PDF text extraction failed");
}

export async function extractTextFromFile(
  file: File,
): Promise<{ text: string; kind: "pdf" | "docx" | "doc" }> {
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "";
  const name = file.name || "";

  if (looksLikePdf(buf, name, mime)) {
    const text = await extractPdfText(buf);
    return { text, kind: "pdf" };
  }

  if (looksLikeDocx(buf, name, mime) || mime.includes("wordprocessingml")) {
    const out = await mammoth.extractRawText({ buffer: buf });
    return { text: out.value ?? "", kind: "docx" };
  }

  if (mime === "application/msword" || name.toLowerCase().endsWith(".doc")) {
    return { text: "", kind: "doc" };
  }

  // Fallback: try PDF then DOCX by content
  if (buf.subarray(0, 5).toString("utf8") === "%PDF-") {
    const text = await extractPdfText(buf);
    return { text, kind: "pdf" };
  }

  return { text: "", kind: "doc" };
}
