import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AdminStatCard({
  label,
  value,
  sub,
  subClassName,
  Icon,
  borderColor,
  children,
}: {
  label: string;
  value: string | number;
  sub?: ReactNode;
  subClassName?: string;
  Icon: LucideIcon;
  borderColor: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="rounded-xl border bg-white p-5 shadow-sm"
      style={{ borderColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-[#0D2137]">{value}</p>
          {sub ? (
            <p className={cn("mt-1 text-sm", subClassName ?? "text-[#6B7280]")}>{sub}</p>
          ) : null}
          {children}
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${borderColor}18`, color: borderColor }}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}
