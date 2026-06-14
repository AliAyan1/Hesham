"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import type { MoyasarPaymentResult } from "@/types/moyasar";

const MOYASAR_JS = "https://cdn.moyasar.com/mpf/2.0.0/moyasar.js";
const MOYASAR_CSS = "https://cdn.moyasar.com/mpf/2.0.0/moyasar.css";

interface PaymentFormProps {
  amount: number;
  description: string;
  metadata: Record<string, string>;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

export function PaymentForm({
  amount,
  description,
  metadata,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const t = useTranslations("payments");
  const formId = useId().replace(/:/g, "");
  const elementClass = `mysr-form-${formId}`;
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let script: HTMLScriptElement | null = null;
    let link: HTMLLinkElement | null = null;

    const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY?.trim();
    if (!publishableKey) {
      onError(t("missingPublishableKey"));
      return;
    }

    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = MOYASAR_CSS;
    document.head.appendChild(link);

    script = document.createElement("script");
    script.src = MOYASAR_JS;
    script.async = true;

    script.onload = () => {
      const halalas = Math.round(amount * 100);
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      window.Moyasar?.init({
        element: `.${elementClass}`,
        amount: halalas,
        currency: "SAR",
        description,
        publishable_api_key: publishableKey,
        callback_url: `${origin}/api/payments/callback`,
        methods: ["creditcard", "applepay"],
        metadata,
        on_completed: async (payment: MoyasarPaymentResult) => {
          onSuccess(payment.id);
          return true;
        },
        on_failure: (payment: MoyasarPaymentResult) => {
          onError(payment.source?.message ?? t("paymentFailed"));
        },
      });
    };

    script.onerror = () => onError(t("formLoadFailed"));
    document.head.appendChild(script);

    return () => {
      initialized.current = false;
      if (script?.parentNode) script.parentNode.removeChild(script);
      if (link?.parentNode) link.parentNode.removeChild(link);
    };
  }, [amount, description, metadata, onSuccess, onError, elementClass, t]);

  return (
    <div>
      <div className={elementClass} />
      <p className="mt-3 text-center text-xs text-[#6B7280]">{t("secureNote")}</p>
    </div>
  );
}
