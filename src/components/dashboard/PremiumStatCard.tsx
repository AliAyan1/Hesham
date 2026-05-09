import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PremiumStatCardProps = {
  borderClass: string;
  iconBgClass: string;
  iconColorClass: string;
  Icon: LucideIcon;
  value: ReactNode;
  label: string;
  footer?: ReactNode;
  /** Min height for numeric value row */
  className?: string;
  valueClassName?: string;
};

/** Stat tile with accent start border and circular icon (Stripe-style). */
export function PremiumStatCard({
  borderClass,
  iconBgClass,
  iconColorClass,
  Icon,
  value,
  label,
  footer,
  className,
  valueClassName,
}: PremiumStatCardProps) {
  return (
    <article
      className={cn(
        "relative flex flex-col gap-4 overflow-hidden rounded-[12px] border border-[#F1F5F9] bg-white p-6",
        "shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-md",
        borderClass,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform duration-200",
            "group-hover:scale-[1.02]",
            iconBgClass,
          )}
          aria-hidden
        >
          <Icon className={cn("h-6 w-6", iconColorClass)} strokeWidth={2} />
        </div>
      </div>
      <div className="min-h-[3rem] space-y-1">
        <div
          className={cn(
            "text-[48px] font-bold leading-none tracking-tight text-[#0D2137]",
            valueClassName,
          )}
        >
          {value}
        </div>
        <p className="text-sm text-[#6B7280]">{label}</p>
        {footer ? <div className="text-sm">{footer}</div> : null}
      </div>
    </article>
  );
}
