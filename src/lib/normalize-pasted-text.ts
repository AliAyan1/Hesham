import type { ClipboardEvent } from "react";

/**
 * Turns PDF/Word/LinkedIn paste (hard wraps mid-sentence) into flowing paragraphs.
 * Keeps blank lines between real paragraphs; joins single line breaks with spaces.
 */
export function normalizePastedPlainText(text: string): string {
  const unified = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ");

  const paragraphs = unified.split(/\n\s*\n+/);

  return paragraphs
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s{2,}/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}

export function insertNormalizedPaste(
  current: string,
  pasted: string,
  selectionStart: number,
  selectionEnd: number,
): { nextValue: string; caret: number } {
  const normalized = normalizePastedPlainText(pasted);
  return {
    nextValue: current.slice(0, selectionStart) + normalized + current.slice(selectionEnd),
    caret: selectionStart + normalized.length,
  };
}

/** Use on summary/bio textareas so PDF/LinkedIn pastes do not keep hard line wraps. */
export function handleProseTextareaPaste(
  e: ClipboardEvent<HTMLTextAreaElement>,
  value: string,
  setValue: (next: string) => void,
): void {
  const plain = e.clipboardData.getData("text/plain");
  if (!plain || !/[\r\n]/.test(plain)) return;

  e.preventDefault();
  const el = e.currentTarget;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const { nextValue, caret } = insertNormalizedPaste(value, plain, start, end);
  setValue(nextValue);
  requestAnimationFrame(() => {
    el.setSelectionRange(caret, caret);
  });
}
