import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TrendDir = "up" | "down" | "neutral";

export type StatIconTone = "profile" | "applications" | "matches" | "assessment";

const toneCircleClasses: Record<StatIconTone, string> = {
  profile: "bg-brand-lightBlue text-brand-blue",
  applications: "bg-brand-lightTeal text-brand-teal",
  matches: "bg-brand-goldMuted text-brand-gold",
  assessment: "bg-[#DCE9F2] text-brand-blue",
};

export interface StatCardProps {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  iconTone?: StatIconTone;
  trend?: { dir: TrendDir; text: string };
  footer?: ReactNode;
  /** Override default numeric styling (text-4xl) for longer copy */
  valueClassName?: string;
  className?: string;
}

function TrendIcon({ dir }: { dir: "up" | "down" }) {
  if (dir === "up") {
    return (
      <svg
        className="h-4 w-4 text-brand-teal"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4 text-red-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

export function StatCard({
  icon,
  value,
  label,
  iconTone = "profile",
  trend,
  footer,
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
            toneCircleClasses[iconTone],
          )}
          aria-hidden
        >
          {icon}
        </div>
        {trend && trend.dir !== "neutral" ? (
          <div className="flex items-center gap-1 text-xs font-medium text-gray-600">
            <TrendIcon dir={trend.dir} />
            <span>{trend.text}</span>
          </div>
        ) : null}
      </div>
      <div>
        <div className={cn("text-brand-navy", valueClassName ?? "text-4xl font-extrabold leading-none tracking-tight")}>
          {value}
        </div>
        <p className="mt-1 text-sm font-medium text-gray-600">{label}</p>
        {footer ? <div className="mt-3">{footer}</div> : null}
      </div>
    </article>
  );
}
