"use client";

import { Briefcase, UserRound } from "lucide-react";
import { getSession, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { PaymentModal } from "@/components/payments/PaymentModal";
import {
  SUBSCRIPTION_PLAN_PRICES_SAR,
  type SubscriptionPlanKey,
} from "@/lib/payments/pricing";

type AccountPick = "EMPLOYER" | "JOBSEEKER";

export function UpgradeConfirm({
  selectedPlan,
}: {
  selectedPlan: "professional" | "premium" | null;
}) {
  const t = useTranslations("subscription");
  const tp = useTranslations("payments");
  const tc = useTranslations("common");
  const router = useRouter();
  const { update } = useSession();
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pickOpen, setPickOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const upgradedPlanSlug = useRef<"professional" | "premium" | null>(null);
  const [rolePending, setRolePending] = useState<AccountPick | null>(null);

  const planKey: SubscriptionPlanKey | null =
    selectedPlan === "professional"
      ? "PROFESSIONAL"
      : selectedPlan === "premium"
        ? "PREMIUM"
        : null;

  const finalizeToDashboard = useCallback(
    async (pick: AccountPick) => {
      setErr(null);
      setRolePending(pick);
      try {
        const res = await fetch("/api/account/role-choice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ role: pick }),
        });
        if (!res.ok) throw new Error("role_failed");
        await update();
        const dest = pick === "EMPLOYER" ? "/dashboard/employer" : "/dashboard/job-seeker";
        const slug = upgradedPlanSlug.current;
        router.push(slug ? `${dest}?upgraded=${slug}` : dest);
        router.refresh();
      } catch {
        setErr(t("upgradeError"));
      } finally {
        setRolePending(null);
      }
    },
    [router, update, t],
  );

  async function afterPaymentSuccess() {
    await update();
    const slug = upgradedPlanSlug.current;
    const sess = await getSession();
    const r = sess?.user?.role;
    if (r === "ADMIN") {
      router.push(slug ? `/dashboard/admin?upgraded=${slug}` : "/dashboard/admin");
      router.refresh();
      return;
    }
    if (r === "EMPLOYER" || r === "JOBSEEKER") {
      const dest =
        r === "EMPLOYER" ? "/dashboard/employer" : "/dashboard/job-seeker";
      router.push(slug ? `${dest}?upgraded=${slug}` : dest);
      router.refresh();
      return;
    }
    setPickOpen(true);
  }

  function onConfirm() {
    setErr(null);
    if (!selectedPlan || !planKey) return;
    upgradedPlanSlug.current = selectedPlan;
    setShowPaymentModal(true);
  }

  const busy = pending || rolePending !== null;

  return (
    <div>
      <button
        type="button"
        onClick={onConfirm}
        disabled={!selectedPlan || pending || pickOpen}
        className={cn(
          "inline-flex min-h-11 items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-colors",
          selectedPlan ? "bg-white text-[#0D2137] hover:bg-white/90" : "bg-white/20 text-white/60",
        )}
      >
        {pending ? t("upgrading") : tp("payAndUpgrade")}
      </button>
      {err ? <p className="mt-3 text-sm text-red-200">{err}</p> : null}

      {planKey ? (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title={tp("upgradeTitle", { plan: t(selectedPlan!) })}
          baseAmount={SUBSCRIPTION_PLAN_PRICES_SAR[planKey]}
          description={tp("subscriptionDescription", { plan: t(selectedPlan!) })}
          metadata={{
            type: "SUBSCRIPTION",
            plan: planKey,
          }}
          onSuccess={() => {
            startTransition(async () => {
              await afterPaymentSuccess();
            });
          }}
        />
      ) : null}

      {pickOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-role-picker-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
            <h2 id="upgrade-role-picker-title" className="text-xl font-extrabold text-[#0D2137]">
              {t("upgradeChooseRoleTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{t("upgradeChooseRoleSubtitle")}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void finalizeToDashboard("EMPLOYER")}
                className="flex min-h-[7.5rem] flex-col items-start rounded-xl border-2 border-[#0F4C75]/25 bg-[#F8FAFC] px-4 py-4 text-start transition-colors hover:border-[#0F4C75]/50 hover:bg-white disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#0F4C75]">
                  <Briefcase className="h-5 w-5" aria-hidden />
                </span>
                <span className="mt-3 font-bold text-[#0D2137]">{t("upgradeChooseEmployer")}</span>
                <span className="mt-1 text-xs leading-snug text-[#6B7280]">{t("upgradeChooseEmployerHint")}</span>
                {rolePending === "EMPLOYER" ? (
                  <span className="mt-2 text-xs font-semibold text-brand-teal">{tc("loading")}</span>
                ) : null}
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void finalizeToDashboard("JOBSEEKER")}
                className="flex min-h-[7.5rem] flex-col items-start rounded-xl border-2 border-emerald-700/25 bg-emerald-50/40 px-4 py-4 text-start transition-colors hover:border-brand-teal/50 hover:bg-white disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E1F5EE] text-brand-teal">
                  <UserRound className="h-5 w-5" aria-hidden />
                </span>
                <span className="mt-3 font-bold text-[#0D2137]">{t("upgradeChooseJobSeeker")}</span>
                <span className="mt-1 text-xs leading-snug text-[#6B7280]">{t("upgradeChooseJobSeekerHint")}</span>
                {rolePending === "JOBSEEKER" ? (
                  <span className="mt-2 text-xs font-semibold text-brand-teal">{tc("loading")}</span>
                ) : null}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
