"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { calculateVAT } from "@/lib/moyasar";
import { PaymentForm } from "./PaymentForm";

type ModalStatus = "idle" | "processing" | "success" | "error";

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
  onSuccess,
}: PaymentModalProps) {
  const t = useTranslations("payments");
  const [status, setStatus] = useState<ModalStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    void fetch("/api/payments/config", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ isTestMode?: boolean }>)
      .then((j) => setIsTestMode(j.isTestMode === true))
      .catch(() => setIsTestMode(false));
  }, []);

  const { vat, total } = useMemo(() => {
    const breakdown = calculateVAT(baseAmount);
    return { vat: breakdown.vat, total: breakdown.total };
  }, [baseAmount]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      sessionStorage.setItem("qt-moyasar-payment-metadata", JSON.stringify(metadata));
    } catch {
      /* ignore */
    }
  }, [isOpen, metadata]);

  const handleSuccess = useCallback(async (paymentId: string) => {
    setStatus("processing");
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ paymentId, metadata }),
        });
        if (res.ok) {
          setStatus("success");
          window.setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
          return;
        }
      } catch {
        /* retry */
      }
      if (attempt < 5) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    setStatus("error");
    setErrorMsg(t("verifyFailed"));
  }, [metadata, onClose, onSuccess, t]);

  const handleError = useCallback((error: string) => {
    setStatus("error");
    setErrorMsg(error);
  }, []);

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

        {status === "success" ? (
          <div className="py-8 text-center">
            <p className="text-4xl" aria-hidden>
              ✅
            </p>
            <p className="mt-3 font-semibold text-[#1D9E75]">{t("successTitle")}</p>
            <p className="mt-2 text-sm text-[#6B7280]">{t("successSubtitle")}</p>
          </div>
        ) : (
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

            {isTestMode ? (
              <div className="mb-4 rounded-lg border border-[#FDE68A] bg-[#FEF9C3] px-3 py-2.5 text-xs text-[#854D0E]">
                {t("testModeBanner")}
              </div>
            ) : null}

            {errorMsg ? (
              <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEE2E2] px-3 py-2.5 text-sm text-[#991B1B]">
                {errorMsg}
              </div>
            ) : null}

            {status === "processing" ? (
              <div className="py-6 text-center">
                <div
                  className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-[#EFF6FF] border-t-[#0F4C75]"
                  aria-hidden
                />
                <p className="text-sm text-[#6B7280]">{t("verifying")}</p>
              </div>
            ) : (
              <PaymentForm
                amount={total}
                description={description}
                metadata={metadata}
                isTestMode={isTestMode}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
