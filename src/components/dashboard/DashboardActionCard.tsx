import type { LucideIcon } from "lucide-react";
import { ArrowRight, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export type DashboardActionCardProps = {
  href: string;
  title: string;
  description: string;
  iconBgClass: string;
  iconColorClass: string;
  Icon: LucideIcon;
  /** When set, navigates to `upgradeHref` (default `/pricing`) and shows lock affordance. */
  locked?: boolean;
  upgradeHref?: string;
};

export function DashboardActionCard({
  href,
  title,
  description,
  iconBgClass,
  iconColorClass,
  Icon,
  locked,
  upgradeHref = "/pricing",
}: DashboardActionCardProps) {
  const dest = locked ? upgradeHref : href;

  return (
    <Link
      href={dest}
      className={cn(
        "group relative flex min-h-[44px] h-full flex-col rounded-xl border border-[#F1F5F9] bg-white p-6 shadow-sm",
        "transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md",
        locked && "border-amber-200/90 bg-[#FFFBEB]",
      )}
    >
      <div className={cn("mb-5 flex h-14 w-14 items-center justify-center rounded-full", iconBgClass)}>
        <Icon className={cn("h-7 w-7", iconColorClass)} strokeWidth={2} aria-hidden />
      </div>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-base font-semibold text-[#0D2137]">{title}</h4>
        {locked ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            <Lock className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[13px] leading-snug text-[#6B7280]">{description}</p>
      <span className="mt-auto flex items-center pt-6 text-brand-teal" aria-hidden>
        <ArrowRight className="h-5 w-5 transition-transform ms-auto group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
      </span>
    </Link>
  );
}
