"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { PAYMENT_METADATA_STORAGE_KEY } from "@/components/payments/PaymentForm";
import type { PaymentMetadataInput } from "@/lib/payments/fulfill";
import {
  clearPaymentReturnContext,
  loadPaymentReturnContext,
} from "@/lib/payments/return-context";
import { dashboardPathForRole } from "@/lib/subscription";
import { hardNavigate } from "@/lib/auth-redirect";

async function verifyWithRetries(
  paymentId: string,
  metadata: PaymentMetadataInput,
  attempts = 5,
): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ paymentId, metadata }),
    });
    if (res.ok) return true;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return false;
}

export default function PaymentCompleteClient() {
  const t = useTranslations("payments");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();
  const paymentId = searchParams.get("id");
  const status = searchParams.get("status");
  const [message, setMessage] = useState(t("verifying"));

  useEffect(() => {
    if (!paymentId) {
      setMessage(t("missingPaymentId"));
      return;
    }

    if (status && status !== "paid") {
      setMessage(t("paymentFailed"));
      return;
    }

    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(PAYMENT_METADATA_STORAGE_KEY);
    } catch {
      raw = null;
    }

    if (!raw) {
      setMessage(t("missingPaymentContext"));
      return;
    }

    let metadata: PaymentMetadataInput;
    try {
      metadata = JSON.parse(raw) as PaymentMetadataInput;
    } catch {
      setMessage(t("missingPaymentContext"));
      return;
    }

    void (async () => {
      const ok = await verifyWithRetries(paymentId, metadata);
      if (!ok) {
        setMessage(t("verifyFailed"));
        return;
      }

      try {
        sessionStorage.removeItem(PAYMENT_METADATA_STORAGE_KEY);
      } catch {
        /* ignore */
      }

      const returnCtx = loadPaymentReturnContext();
      clearPaymentReturnContext();

      if (returnCtx?.finalizeSignup) {
        await fetch("/api/profile/onboarding", {
          method: "POST",
          credentials: "include",
        });
        await update({
          onboardingComplete: true,
          role: returnCtx.dashboardRole,
        });
      } else {
        await update();
      }

      const role =
        returnCtx?.dashboardRole ??
        String(session?.user?.role ?? "JOBSEEKER").toUpperCase();
      const navLocale = returnCtx?.locale ?? locale;

      if (metadata.type === "SUBSCRIPTION") {
        hardNavigate(dashboardPathForRole(role), navLocale);
        return;
      }
      if (metadata.type === "RECRUITMENT_FEE") {
        hardNavigate("/dashboard/employer/candidates", navLocale);
        return;
      }
      if (metadata.type === "MENTOR_SESSION") {
        hardNavigate("/dashboard/job-seeker/sessions", navLocale);
        return;
      }
      hardNavigate(dashboardPathForRole(role), navLocale);
    })();
  }, [paymentId, status, session?.user?.role, update, locale, t]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-[#EFF6FF] border-t-[#0F4C75]" />
      <p className="text-sm text-[#374151]">{message}</p>
    </main>
  );
}
