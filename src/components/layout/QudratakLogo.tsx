import { Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type QudratakLogoProps = {
  locale: string;
  className?: string;
  compact?: boolean;
};

/** Wordmark for dark headers — no white-box PNG. */
export function QudratakLogo({ locale, className, compact }: QudratakLogoProps) {
  const isAr = locale === "ar";

  return (
    <Link
      href="/qudrahtech"
      className={cn("inline-flex shrink-0 items-center gap-2 text-white", className)}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-lg bg-[#C9A84C]/15",
          compact ? "h-9 w-9" : "h-10 w-10",
        )}
      >
        <Zap
          className={cn("text-[#C9A84C]", compact ? "h-5 w-5" : "h-6 w-6")}
          fill="currentColor"
          strokeWidth={1.5}
          aria-hidden
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn("font-bold tracking-tight", compact ? "text-lg" : "text-xl")}>
          {isAr ? "قدرتك" : "Qudrahtech"}
        </span>
        {!compact ? (
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-white/50">
            {isAr ? "مبادرة باسالم" : "By Basalim"}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
