"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { calculateVAT } from "@/lib/payments/vat";
import { PAYMENT_METADATA_STORAGE_KEY } from "@/lib/payments/storage-keys";
import { BnplPaymentButtons } from "./BnplPaymentButtons";

type ModalStatus = "idle" | "processing" | "error";

type PaymentMethodsAvailability = {
  card: boolean;
  applePay: boolean;
  tabby: boolean;
  tamara: boolean;
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  baseAmount: number;
  description: string;
  metadata: Record<string, string>;
  onSuccess: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  title,
  baseAmount,
  description,
  metadata,
  onSuccess: _onSuccess,
}: PaymentModalProps) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const [status, setStatus] = useState<ModalStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [methods, setMethods] = useState<PaymentMethodsAvailability>({
    card: true,
    applePay: true,
    tabby: false,
    tamara: false,
  });

  useEffect(() => {
    void fetch("/api/payments/config", { cache: "no-store" })
      .then(
        (r) =>
          r.json() as Promise<{
            methods?: PaymentMethodsAvailability;
          }>,
      )
      .then((j) => {
        if (j.methods) setMethods(j.methods);
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  const { vat, total } = useMemo(() => {
    const breakdown = calculateVAT(baseAmount);
    return { vat: breakdown.vat, total: breakdown.total };
  }, [baseAmount]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      sessionStorage.setItem(PAYMENT_METADATA_STORAGE_KEY, JSON.stringify(metadata));
    } catch {
      /* ignore */
    }
  }, [isOpen, metadata]);

  const startCardCheckout = useCallback(async () => {
    setStatus("processing");
    setErrorMsg("");
    try {
      const res = await fetch("/api/payment/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: total,
          planId: metadata.plan,
          metadata: {
            type: metadata.type,
            plan: metadata.plan,
            obligationId: metadata.obligationId,
            sessionId: metadata.sessionId,
          },
          locale,
        }),
      });
      const json = (await res.json()) as { paymentUrl?: string; error?: string };
      if (!res.ok || !json.paymentUrl) {
        setStatus("error");
        setErrorMsg(json.error ?? t("sessionStartFailed"));
        return;
      }
      window.location.href = json.paymentUrl;
    } catch {
      setStatus("error");
      setErrorMsg(t("sessionStartFailed"));
    }
  }, [locale, metadata, t, total]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(13,33,55,0.6)] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-7 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 id="payment-modal-title" className="text-lg font-bold text-[#0D2137]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-[#6B7280] hover:text-[#0D2137]"
            aria-label={t("close")}
          >
            ✕
          </button>
        </div>

        <>
          <div className="mb-5 rounded-xl bg-[#F8FAFC] p-4">
            <div className="mb-1.5 flex justify-between text-sm text-[#6B7280]">
              <span>{t("subtotal")}</span>
              <span>
                {t("sar")} {baseAmount.toFixed(2)}
              </span>
            </div>
            <div className="mb-1.5 flex justify-between text-sm text-[#6B7280]">
              <span>{t("vat")}</span>
              <span>
                {t("sar")} {vat.toFixed(2)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-[#E5E7EB] pt-2 text-base font-bold text-[#0D2137]">
              <span>{t("total")}</span>
              <span>
                {t("sar")} {total.toFixed(2)}
              </span>
            </div>
          </div>

          <p className="mb-4 text-center text-xs text-[#6B7280]">{t("secureNoteLive")}</p>

          {errorMsg ? (
            <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEE2E2] px-3 py-2.5 text-sm text-[#991B1B]">
              {errorMsg}
            </div>
          ) : null}

          <BnplPaymentButtons
            enabled={{ tabby: methods.tabby, tamara: methods.tamara }}
            baseAmount={baseAmount}
            totalAmount={total}
            description={description}
            metadata={metadata}
            onError={(msg) => {
              setStatus("error");
              setErrorMsg(msg);
            }}
          />

          {methods.card ? (
            <button
              type="button"
              disabled={status === "processing"}
              onClick={() => void startCardCheckout()}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C75] px-4 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === "processing" ? t("redirecting") : t("payWithCard")}
            </button>
          ) : (
            <p className="text-center text-sm text-[#991B1B]">{t("missingPaymentConfig")}</p>
          )}
        </>
      </div>
    </div>
  );
}
