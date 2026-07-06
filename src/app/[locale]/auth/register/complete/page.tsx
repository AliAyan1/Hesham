"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import axios from "axios";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { dashboardPathForRole } from "@/lib/subscription";
import { finishGoogleSignup, hardNavigate } from "@/lib/auth-redirect";
import { planFromStorage } from "@/lib/register-plan-storage";
import { savePaymentReturnContext, clearPaymentReturnContext } from "@/lib/payments/return-context";
import {
  SUBSCRIPTION_PLAN_PRICES_SAR,
  type SubscriptionPlanKey,
} from "@/lib/payments/pricing";
import type { PublicPlatformSettings } from "@/lib/settings-types";
import { useSearchParams } from "next/navigation";

type RoleChoice = "JOBSEEKER" | "EMPLOYER" | "MENTOR";
type PlanChoice = "free" | "professional" | "premium";

function planFromUrl(raw: string | null): PlanChoice | null {
  const v = raw?.toLowerCase();
  if (v === "free" || v === "professional" || v === "premium") return v;
  return null;
}

function planToKey(plan: PlanChoice): SubscriptionPlanKey | null {
  if (plan === "professional") return "PROFESSIONAL";
  if (plan === "premium") return "PREMIUM";
  return null;
}

export default function RegisterCompletePage() {
  const t = useTranslations();
  const tAuth = useTranslations("auth");
  const tp = useTranslations("payments");
  const locale = useLocale();
  const isRTL = locale === "ar" || locale === "ur";
  const sp = useSearchParams();
  const { data: session, status, update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [moyasarConfigured, setMoyasarConfigured] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingRole, setPendingRole] = useState<RoleChoice | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [planPrices, setPlanPrices] = useState(SUBSCRIPTION_PLAN_PRICES_SAR);

  useEffect(() => {
    void fetch("/api/settings/public", { cache: "no-store" })
      .then((r) => r.json() as Promise<PublicPlatformSettings>)
      .then((settings) => {
        setPlanPrices({
          PROFESSIONAL: settings.proPlanPrice,
          PREMIUM: settings.premiumPlanPrice,
        });
      })
      .catch(() => undefined);
  }, []);

  const urlPlan = useMemo(() => planFromUrl(sp.get("plan")), [sp]);
  const urlRole = useMemo(() => sp.get("role")?.toUpperCase() ?? null, [sp]);

  const [role, setRole] = useState<RoleChoice>(() => {
    if (urlRole === "EMPLOYER" || urlRole === "MENTOR" || urlRole === "JOBSEEKER") return urlRole;
    return "JOBSEEKER";
  });
  const [plan, setPlan] = useState<PlanChoice>(() => urlPlan ?? planFromStorage() ?? "free");

  useEffect(() => {
    if (urlPlan) setPlan(urlPlan);
  }, [urlPlan]);

  useEffect(() => {
    void fetch("/api/payments/config", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ configured?: boolean }>)
      .then((j) => setMoyasarConfigured(j.configured === true))
      .catch(() => setMoyasarConfigured(false));
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user || showPayment || finishing) return;
    if (session.user.onboardingComplete) {
      const r = String(session.user.role ?? "JOBSEEKER").toUpperCase();
      hardNavigate(dashboardPathForRole(r), locale);
      return;
    }

    const tier = String(session.user.subscriptionTier ?? "FREE").toUpperCase();
    const hasPaidTier = tier === "PROFESSIONAL" || tier === "PREMIUM";
    const userRole = String(session.user.role ?? "").toUpperCase();
    if (hasPaidTier && userRole && userRole !== "ADMIN") {
      setFinishing(true);
      void finishGoogleSignup(userRole, update, locale, null);
    }
  }, [status, session?.user, locale, showPayment, finishing, update]);

  async function complete() {
    setError(null);
    startTransition(async () => {
      try {
        await axios.post("/api/account/role-choice", { role });

        let paymentsConfigured = moyasarConfigured;
        try {
          const cfg = await fetch("/api/payments/config", { cache: "no-store" });
          const j = (await cfg.json()) as { configured?: boolean };
          paymentsConfigured = j.configured === true;
        } catch {
          /* use cached flag */
        }

        const needsPayment =
          paymentsConfigured &&
          (plan === "professional" || plan === "premium");

        if (needsPayment) {
          savePaymentReturnContext({
            dashboardRole: role,
            locale,
            finalizeSignup: true,
          });
          setPendingRole(role);
          setShowPayment(true);
          return;
        }

        if (role === "JOBSEEKER") {
          await axios.post("/api/upgrade", { plan });
        }

        await finishGoogleSignup(
          role,
          update,
          locale,
          role === "JOBSEEKER" ? plan : null,
        );
      } catch {
        setError(t("common.error"));
      }
    });
  }

  const paymentPlanKey = planToKey(plan);

  if (status === "loading" || finishing) {
    return (
      <AuthShell isRtl={isRTL} slogan={t("common.slogan")}>
        <p className="py-12 text-center text-sm text-gray-400">{t("common.loading")}</p>
      </AuthShell>
    );
  }

  if (status !== "authenticated") {
    return (
      <AuthShell isRtl={isRTL} slogan={t("common.slogan")}>
        <p className="text-center text-sm text-gray-400">{tAuth("registerFlow.completeNeedLogin")}</p>
        <Link href="/login" className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-teal px-4 py-3 text-sm font-semibold text-white">
          {tAuth("login")}
        </Link>
      </AuthShell>
    );
  }

  const name = session?.user?.name ?? tAuth("registerFlow.completeFallbackName");

  return (
    <>
      <AuthShell isRtl={isRTL} slogan={t("common.slogan")}>
        <h2 className="mb-1 text-xl font-semibold text-white">{tAuth("registerFlow.completeTitle", { name })}</h2>
        <p className="mb-6 text-sm text-gray-400">{tAuth("registerFlow.completeSubtitle")}</p>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-400">{error}</div>
        ) : null}

        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <RoleCard active={role === "JOBSEEKER"} onClick={() => setRole("JOBSEEKER")} title={tAuth("registerFlow.pathJobSeekerTitle")} subtitle={tAuth("registerFlow.pathJobSeekerDesc")} tone="jobseeker" />
            <RoleCard active={role === "EMPLOYER"} onClick={() => setRole("EMPLOYER")} title={tAuth("registerFlow.pathEmployerTitle")} subtitle={tAuth("registerFlow.pathEmployerDesc")} tone="employer" />
            <RoleCard active={role === "MENTOR"} onClick={() => setRole("MENTOR")} title={tAuth("registerFlow.pathMentorTitle")} subtitle={tAuth("registerFlow.pathMentorDesc")} tone="mentor" />
          </div>

          {role === "JOBSEEKER" || plan !== "free" ? (
            <div className="rounded-xl border border-[#333] bg-[#111] p-4">
              <p className="text-sm font-semibold text-white">{tAuth("registerFlow.step2Title")}</p>
              <p className="mt-1 text-xs text-gray-400">{tAuth("registerFlow.step2SubtitlePaid")}</p>
              <div className="mt-3 flex flex-col gap-2">
                <PlanChip active={plan === "free"} onClick={() => setPlan("free")} label={tAuth("registerFlow.planFreeLabel")} price={tAuth("registerFlow.planFreePrice")} />
                <PlanChip active={plan === "professional"} onClick={() => setPlan("professional")} label={tAuth("registerFlow.planProLabel")} price={tAuth("registerFlow.planProPrice")} />
                <PlanChip active={plan === "premium"} onClick={() => setPlan("premium")} label={tAuth("registerFlow.planPremiumLabel")} price={tAuth("registerFlow.planPremiumPrice")} />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={isPending}
            onClick={complete}
            className="mt-2 w-full rounded-lg bg-brand-teal py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? tAuth("registerFlow.completeWorking") : tAuth("registerFlow.completeCta")}
          </button>
        </div>
      </AuthShell>

      {paymentPlanKey && pendingRole ? (
        <PaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          title={tp("signupPaymentTitle", { plan: t(`subscription.${plan}`) })}
          baseAmount={planPrices[paymentPlanKey]}
          description={tp("subscriptionDescription", { plan: t(`subscription.${plan}`) })}
          metadata={{
            type: "SUBSCRIPTION",
            plan: paymentPlanKey,
          }}
          onSuccess={() => {
            void (async () => {
              setFinishing(true);
              setShowPayment(false);
              clearPaymentReturnContext();
              await update();
              await finishGoogleSignup(pendingRole, update, locale, null);
            })();
          }}
        />
      ) : null}
    </>
  );
}

function RoleCard({
  active,
  onClick,
  title,
  subtitle,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  tone: "jobseeker" | "employer" | "mentor";
}) {
  const style =
    tone === "mentor"
      ? active
        ? "border-[#C9973A] bg-[#FDF3E3]/10 ring-1 ring-[#C9973A]"
        : "border-[#444] hover:border-[#C9973A]"
      : tone === "employer"
        ? active
          ? "border-[#1D9E75] bg-[#E1F5EE] ring-1 ring-[#1D9E75]"
          : "border-[#444] hover:border-[#1D9E75]"
        : active
          ? "border-[#0F4C75] bg-[#EFF6FF] ring-1 ring-[#0F4C75]"
          : "border-[#444] hover:border-[#0F4C75]";

  const lightActive = active && tone !== "mentor";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${style}`}
    >
      <p className={`text-sm font-bold leading-snug ${lightActive ? "text-[#0D2137]" : "text-white"}`}>{title}</p>
      <p className={`mt-2 text-xs leading-relaxed ${lightActive ? "text-gray-600" : "text-gray-400"}`}>{subtitle}</p>
    </button>
  );
}

function PlanChip({
  active,
  onClick,
  label,
  price,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  price: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left transition-colors ${
        active ? "border-brand-teal bg-brand-lightTeal/10" : "border-[#333] hover:border-[#555]"
      }`}
    >
      <p className="text-sm font-bold text-white">{label}</p>
      <p className="mt-1 text-xs text-gray-400">{price}</p>
    </button>
  );
}
