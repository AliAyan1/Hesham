"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { MoyasarPaymentResult } from "@/types/moyasar";

/** 2.0.x returns 403 on Moyasar CDN — 1.14.0 is the current stable bundle. */
const MOYASAR_JS = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";
const MOYASAR_CSS = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
export const PAYMENT_METADATA_STORAGE_KEY = "qt-moyasar-payment-metadata";

let moyasarAssetsPromise: Promise<void> | null = null;

function loadMoyasarAssets(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Moyasar requires a browser"));
  }
  if (window.Moyasar) {
    return Promise.resolve();
  }
  if (moyasarAssetsPromise) {
    return moyasarAssetsPromise;
  }

  moyasarAssetsPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${MOYASAR_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MOYASAR_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(
      `script[src="${MOYASAR_JS}"]`,
    ) as HTMLScriptElement | null;

    const onReady = () => {
      if (window.Moyasar) resolve();
      else reject(new Error("Moyasar global missing after script load"));
    };

    if (existing) {
      if (window.Moyasar) {
        resolve();
        return;
      }
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", () => reject(new Error("script error")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = MOYASAR_JS;
    script.async = true;
    script.onload = onReady;
    script.onerror = () => reject(new Error("script error"));
    document.head.appendChild(script);
  });

  return moyasarAssetsPromise;
}

interface PaymentFormProps {
  amount: number;
  description: string;
  metadata: Record<string, string>;
  isTestMode?: boolean;
  applePayEnabled?: boolean;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

export function PaymentForm({
  amount,
  description,
  metadata,
  isTestMode = false,
  applePayEnabled = false,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const t = useTranslations("payments");
  const formId = useId().replace(/:/g, "");
  const elementClass = `mysr-form-${formId}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);

  const metadataKey = JSON.stringify(metadata);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    try {
      sessionStorage.setItem(PAYMENT_METADATA_STORAGE_KEY, metadataKey);
    } catch {
      /* ignore */
    }
  }, [metadataKey]);

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

    let cancelled = false;
    const container = containerRef.current;
    const parsedMetadata = JSON.parse(metadataKey) as Record<string, string>;

    void loadMoyasarAssets()
      .then(() => {
        if (cancelled || !containerRef.current || !window.Moyasar) {
          if (!cancelled) onErrorRef.current(t("formLoadFailed"));
          return;
        }

        container.innerHTML = "";
        const halalas = Math.round(amount * 100);
        const origin = window.location.origin;

        const methods = applePayEnabled ? ["creditcard", "applepay"] : ["creditcard"];

        window.Moyasar.init({
          element: `.${elementClass}`,
          amount: halalas,
          currency: "SAR",
          country: "SA",
          description,
          publishable_api_key: publishableKey,
          callback_url: `${origin}/api/payments/callback`,
          supported_networks: ["mada", "visa", "mastercard"],
          methods,
          metadata: parsedMetadata,
          ...(applePayEnabled
            ? {
                apple_pay: {
                  country: "SA",
                  label: "QudrahTech",
                  validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
                },
              }
            : {}),
          on_completed: async (payment: MoyasarPaymentResult) => {
            onSuccessRef.current(payment.id);
            return true;
          },
          on_failure: (error: MoyasarPaymentResult | string) => {
            const msg =
              typeof error === "string"
                ? error
                : (error.source?.message ?? t("paymentFailed"));
            onErrorRef.current(msg);
          },
        });
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current(t("formLoadFailed"));
      });

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [
    amount,
    description,
    metadataKey,
    elementClass,
    t,
    publishableKey,
    loadingKey,
    applePayEnabled,
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
      <p className="mt-3 text-center text-xs text-[#6B7280]">
        {isTestMode ? t("secureNote") : t("secureNoteLive")}
      </p>
    </div>
  );
}
