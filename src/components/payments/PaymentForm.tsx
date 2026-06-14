"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { MoyasarPaymentResult } from "@/types/moyasar";

const MOYASAR_JS = "https://cdn.moyasar.com/mpf/2.0.0/moyasar.js";
const MOYASAR_CSS = "https://cdn.moyasar.com/mpf/2.0.0/moyasar.css";
export const PAYMENT_METADATA_STORAGE_KEY = "qt-moyasar-payment-metadata";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);

  useEffect(() => {
    try {
      sessionStorage.setItem(PAYMENT_METADATA_STORAGE_KEY, JSON.stringify(metadata));
    } catch {
      /* ignore */
    }
  }, [metadata]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const baked = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY?.trim();
      if (baked) {
        if (!cancelled) {
          setPublishableKey(baked);
          setLoadingKey(false);
        }
        return;
      }
      try {
        const res = await fetch("/api/payments/config", { cache: "no-store" });
        const json = (await res.json()) as { publishableKey?: string | null };
        if (!cancelled) {
          setPublishableKey(json.publishableKey?.trim() || null);
          setLoadingKey(false);
        }
      } catch {
        if (!cancelled) {
          setPublishableKey(null);
          setLoadingKey(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loadingKey || !publishableKey || !containerRef.current) return;

    let script: HTMLScriptElement | null = null;
    let link: HTMLLinkElement | null = null;
    let destroyed = false;

    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = MOYASAR_CSS;
    document.head.appendChild(link);

    const initForm = () => {
      if (destroyed || !window.Moyasar) return;
      const halalas = Math.round(amount * 100);
      const origin = window.location.origin;

      window.Moyasar.init({
        element: `.${elementClass}`,
        amount: halalas,
        currency: "SAR",
        description,
        publishable_api_key: publishableKey,
        callback_url: `${origin}/api/payments/callback`,
        methods: ["creditcard"],
        metadata,
        on_completed: async (payment: MoyasarPaymentResult) => {
          onSuccess(payment.id);
          return true;
        },
        on_failure: (error: MoyasarPaymentResult | string) => {
          const msg =
            typeof error === "string"
              ? error
              : error.source?.message ?? t("paymentFailed");
          onError(msg);
        },
      });
    };

    if (window.Moyasar) {
      initForm();
    } else {
      script = document.createElement("script");
      script.src = MOYASAR_JS;
      script.async = true;
      script.onload = initForm;
      script.onerror = () => onError(t("formLoadFailed"));
      document.head.appendChild(script);
    }

    return () => {
      destroyed = true;
      if (script?.parentNode) script.parentNode.removeChild(script);
      if (link?.parentNode) link.parentNode.removeChild(link);
    };
  }, [
    amount,
    description,
    metadata,
    onSuccess,
    onError,
    elementClass,
    t,
    publishableKey,
    loadingKey,
  ]);

  if (loadingKey) {
    return <p className="py-4 text-center text-sm text-[#6B7280]">{t("loadingForm")}</p>;
  }

  if (!publishableKey) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {t("missingPublishableKey")}
      </p>
    );
  }

  return (
    <div>
      <div className={elementClass} ref={containerRef} />
      <p className="mt-3 text-center text-xs text-[#6B7280]">{t("secureNote")}</p>
    </div>
  );
}
