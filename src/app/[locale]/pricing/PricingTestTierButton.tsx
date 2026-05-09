"use client";

import { useLocale, useTranslations } from "next-intl";
import axios from "axios";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Tier = "PROFESSIONAL" | "PREMIUM";

export function PricingTestTierButton({
  tier,
  variant,
  isLoggedIn,
}: {
  tier: Tier;
  variant: "pro" | "premium";
  isLoggedIn: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("pages.pricing");
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!isLoggedIn) {
      const back = encodeURIComponent(`/${locale}/pricing`);
      router.push(`/auth/login?callbackUrl=${back}`);
      return;
    }
    setErr(null);
    startTransition(async () => {
      try {
        await axios.post("/api/test/set-tier", { tier });
        router.push("/dashboard/job-seeker/cv-builder");
      } catch {
        setErr(t("testTierError"));
      }
    });
  }

  const label =
    tier === "PROFESSIONAL" ? t("testCvFeaturesPro") : t("testCvFeaturesPremium");

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={cn(
          "w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal",
          variant === "pro"
            ? "border border-white/40 bg-white/10 text-white hover:bg-white/20 disabled:opacity-60"
            : "border border-[#0F4C75]/30 bg-[#F8FAFC] text-[#0F4C75] hover:bg-[#EFF6FF] disabled:opacity-60",
        )}
      >
        {pending ? "…" : label}
      </button>
      <p
        className={cn(
          "mt-1.5 text-[10px] font-medium uppercase tracking-wider",
          variant === "pro" ? "text-white/50" : "text-[#6B7280]",
        )}
      >
        {t("testDevOnly")}
      </p>
      {err ? (
        <p className={cn("mt-1 text-[11px]", variant === "pro" ? "text-red-200" : "text-red-600")}>
          {err}
        </p>
      ) : null}
    </div>
  );
}
