"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PAYMENT_METADATA_STORAGE_KEY } from "./PaymentForm";

type BnplProvider = "tabby" | "tamara";

interface BnplPaymentButtonsProps {
  enabled: { tabby: boolean; tamara: boolean };
  baseAmount: number;
  totalAmount: number;
  description: string;
  metadata: Record<string, string>;
  onError: (message: string) => void;
}

export function BnplPaymentButtons({
  enabled,
  baseAmount,
  totalAmount,
  description,
  metadata,
  onError,
}: BnplPaymentButtonsProps) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const [loading, setLoading] = useState<BnplProvider | null>(null);

  if (!enabled.tabby && !enabled.tamara) return null;

  async function start(provider: BnplProvider) {
    setLoading(provider);
    try {
      try {
        sessionStorage.setItem(PAYMENT_METADATA_STORAGE_KEY, JSON.stringify(metadata));
      } catch {
        /* ignore */
      }

      const endpoint =
        provider === "tabby" ? "/api/payments/tabby/session" : "/api/payments/tamara/session";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          metadata,
          baseAmount,
          totalAmount,
          description,
          locale,
        }),
      });

      const json = (await res.json()) as { redirectUrl?: string; error?: string };
      if (!res.ok || !json.redirectUrl) {
        onError(json.error ?? t("bnplStartFailed"));
        return;
      }

      window.location.href = json.redirectUrl;
    } catch {
      onError(t("bnplStartFailed"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mb-4 space-y-2">
      <p className="text-center text-xs font-medium uppercase tracking-wide text-[#6B7280]">
        {t("payWith")}
      </p>
      {enabled.tabby ? (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void start("tabby")}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#3BFF9D]/40 bg-[#0D2137] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <span className="rounded bg-[#3BFF9D] px-2 py-0.5 text-xs font-bold text-[#0D2137]">
            tabby
          </span>
          {loading === "tabby" ? t("redirecting") : t("payWithTabby")}
        </button>
      ) : null}
      {enabled.tamara ? (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void start("tamara")}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#F5C6D6]/50 bg-gradient-to-r from-[#2D0A1E] to-[#4A1028] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <span className="rounded bg-white px-2 py-0.5 text-xs font-bold text-[#4A1028]">
            tamara
          </span>
          {loading === "tamara" ? t("redirecting") : t("payWithTamara")}
        </button>
      ) : null}
      <p className="text-center text-xs text-[#9CA3AF]">{t("orPayWithCard")}</p>
    </div>
  );
}
