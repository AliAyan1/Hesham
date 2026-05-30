"use client";

import { useEffect } from "react";
import { Lock, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export type CvUpsellKind = "upload" | "ai" | "ats" | "templates" | "atsRebuild" | "jdTailor";

type CvUpgradeSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  upgradeLabel: string;
  closeAriaLabel: string;
};

export function CvUpgradeSheet({
  open,
  onClose,
  title,
  body,
  upgradeLabel,
  closeAriaLabel,
}: CvUpgradeSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[200] bg-black/40"
        aria-label={closeAriaLabel}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed end-0 top-0 z-[201] flex h-full max-h-[100dvh] w-[min(100%,22rem)] flex-col border-[#e5e7eb] bg-white shadow-xl",
          "border-s",
          "motion-safe:animate-[cv-upsell-in_220ms_ease-out]",
        )}
        style={{ animationFillMode: "both" }}
        role="dialog"
        aria-modal
        aria-labelledby="cv-upgrade-sheet-title"
      >
        <style>{`@keyframes cv-upsell-in{from{opacity:0}to{opacity:1}}`}</style>
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div id="cv-upgrade-sheet-title" className="flex min-w-0 items-center gap-2 text-[#0D2137]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FDF8EE]">
              <Lock className="h-4 w-4 text-[#B45309]" strokeWidth={2} aria-hidden />
            </span>
            <span className="text-sm font-bold leading-snug">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-[#6B7280] transition-colors hover:bg-gray-100"
            aria-label={closeAriaLabel}
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm leading-relaxed text-[#6B7280]">{body}</div>
        <footer className="border-t border-gray-100 p-4">
          <Link
            href="/pricing"
            onClick={onClose}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0D2137] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0F4C75] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
          >
            {upgradeLabel}
          </Link>
        </footer>
      </aside>
    </>
  );
}
