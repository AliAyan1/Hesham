"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardWelcomeBannerProps = {
  eyebrow: string;
  title: ReactNode;
  subtitle: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Premium gradient hero used on all dashboards (Linear-inspired). */
export function DashboardWelcomeBanner({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: DashboardWelcomeBannerProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-8 rounded-[16px] p-8 text-white shadow-lg transition-[box-shadow]",
        "md:flex-row md:items-center md:justify-between",
        "gradient-welcome-banner",
        className,
      )}
      aria-labelledby="dashboard-welcome-title"
    >
      <div className="max-w-xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1D9E75]">
          {eyebrow}
        </p>
        <h2 id="dashboard-welcome-title" className="text-2xl font-bold md:text-[24px]">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-white/70">{subtitle}</p>
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap md:w-auto md:justify-end">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
