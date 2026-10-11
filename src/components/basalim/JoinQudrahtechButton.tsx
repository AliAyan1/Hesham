"use client";

import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Rocket } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  QUDRAH_PLATFORM_NAME,
  QUDRAH_PLATFORM_NAME_AR,
} from "@/lib/basalim-public";

type JoinQudrahtechButtonProps = {
  /** Primary gold (hero) vs compact (header). */
  variant?: "primary" | "header" | "outline";
  className?: string;
  onClick?: () => void;
};

export function JoinQudrahtechButton({
  variant = "primary",
  className,
  onClick,
}: JoinQudrahtechButtonProps) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const label = isAr
    ? `انضم إلى ${QUDRAH_PLATFORM_NAME_AR}`
    : `Join ${QUDRAH_PLATFORM_NAME}`;

  const styles =
    variant === "primary"
      ? "bg-[#C9A84C] text-[#0D1F2D] shadow-md hover:brightness-105"
      : variant === "header"
        ? "bg-[#C9A84C] text-[#0D1F2D] hover:brightness-105 px-4 py-2.5 text-sm"
        : "border-2 border-[#C9A84C] bg-transparent text-[#C9A84C] hover:bg-[#C9A84C]/10";

  return (
    <Link
      href="/auth/register"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[48px] touch-manipulation items-center justify-center gap-2 rounded-md px-7 py-3.5 text-sm font-bold transition-all",
        styles,
        className,
      )}
    >
      <Rocket className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
