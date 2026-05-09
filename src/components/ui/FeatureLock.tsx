import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export type RequiredPlan = "professional" | "premium";

type FeatureLockProps = {
  locked: boolean;
  title: string;
  requiredPlan: RequiredPlan;
  priceLabel?: string;
  className?: string;
  children: ReactNode;
};

export function FeatureLock({
  locked,
  title,
  requiredPlan,
  priceLabel,
  className,
  children,
}: FeatureLockProps) {
  return (
    <div className={cn("relative", className)}>
      <div className={cn(locked && "pointer-events-none select-none blur-[1px] opacity-70")}>
        {children}
      </div>
      {locked ? (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-[#0D2137]/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 p-5 text-white shadow-xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10" aria-hidden>
                🔒
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm text-white/75">
                  Available on{" "}
                  <span className="font-semibold">
                    {requiredPlan === "professional" ? "Professional" : "Premium"}
                  </span>{" "}
                  Plan
                  {priceLabel ? <span className="text-white/60"> · {priceLabel}</span> : null}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0D2137] transition-colors hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
              >
                Upgrade Now →
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

