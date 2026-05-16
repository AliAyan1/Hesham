"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { SubscriptionTier } from "@/types";

export function EmployerHiringStarter({
  tier,
  canAiJobDescription,
}: {
  tier: SubscriptionTier;
  canAiJobDescription: boolean;
}) {
  const td = useTranslations("dashboard");
  const ts = useTranslations("subscription");

  const tierLabel =
    tier === SubscriptionTier.PREMIUM
      ? ts("premium")
      : tier === SubscriptionTier.PROFESSIONAL
        ? ts("professional")
        : ts("free");

  const tierPlanLineClass =
    tier === SubscriptionTier.PREMIUM
      ? "text-[#92400E]"
      : tier === SubscriptionTier.PROFESSIONAL
        ? "text-[#0F4C75]"
        : "text-[#374151]";

  return (
    <div className={cn("grid gap-4", canAiJobDescription ? "lg:grid-cols-2" : "max-w-md")}>
      <section
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        aria-labelledby="employer-plan-heading"
      >
        <p
          id="employer-plan-heading"
          className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]"
        >
          {td("employerStarterPlanLabel")}
        </p>
        <p className={cn("mt-3 text-xl font-bold", tierPlanLineClass)}>{tierLabel}</p>
      </section>

      {canAiJobDescription ? (
        <section
          className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-[#F0FDF4] to-white p-6 shadow-sm"
          aria-labelledby="employer-ai-jd-heading"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
              <Sparkles className="h-5 w-5 text-brand-teal" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="employer-ai-jd-heading" className="text-lg font-bold text-[#0D2137]">
                {td("employerStarterAiTitle")}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">
                {td("employerStarterAiBodyIncluded")}
              </p>
              <p className={cn("mt-4 text-sm font-semibold", tierPlanLineClass)}>
                {td("employerStarterAiPlanLine", { plan: tierLabel })}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
