"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { PAYMENT_METADATA_STORAGE_KEY } from "@/components/payments/PaymentForm";
import type { PaymentMetadataInput } from "@/lib/payments/fulfill";

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update } = useSession();
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

      await update();

      if (metadata.type === "SUBSCRIPTION") {
        router.push("/upgrade?payment=success");
        return;
      }
      if (metadata.type === "RECRUITMENT_FEE") {
        router.push("/dashboard/employer/candidates");
        return;
      }
      if (metadata.type === "MENTOR_SESSION") {
        router.push("/dashboard/job-seeker/sessions");
        return;
      }
      router.push("/dashboard");
    })();
  }, [paymentId, status, router, update, t]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-[#EFF6FF] border-t-[#0F4C75]" />
      <p className="text-sm text-[#374151]">{message}</p>
    </main>
  );
}
