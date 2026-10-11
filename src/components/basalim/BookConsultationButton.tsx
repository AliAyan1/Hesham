"use client";

import { useLocale } from "next-intl";
import { BASALIM_CALENDLY_URL } from "@/lib/basalim-public";
import { cn } from "@/lib/cn";
import { CalendarCheck } from "lucide-react";

type BookConsultationButtonProps = {
  variant?: "primary" | "header";
  className?: string;
};

export function BookConsultationButton({
  variant = "primary",
  className,
}: BookConsultationButtonProps) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const label = isAr ? "احجز استشارة" : "Book a Consultation";

  return (
    <a
      href={BASALIM_CALENDLY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex min-h-[48px] touch-manipulation items-center justify-center gap-2 rounded-md bg-[#1A6B5A] font-semibold text-white transition-colors hover:bg-[#155A4A]",
        variant === "primary" ? "px-7 py-3.5 text-sm" : "px-4 py-2.5 text-sm",
        className,
      )}
    >
      <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </a>
  );
}
