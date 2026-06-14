"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PaymentHistoryRow } from "@/lib/payments/fulfill";
import type { PaymentStatus, PaymentType } from "@prisma/client";

export function PaymentsHistoryClient() {
  const t = useTranslations("payments");
  const [rows, setRows] = useState<PaymentHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/payments/history", { credentials: "include", cache: "no-store" })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { payments: PaymentHistoryRow[] } }>)
      .then((j) => {
        if (j.success && j.data?.payments) setRows(j.data.payments);
      })
      .finally(() => setLoading(false));
  }, []);

  function typeLabel(type: PaymentType): string {
    if (type === "SUBSCRIPTION") return t("typeSubscription");
    if (type === "RECRUITMENT_FEE") return t("typeRecruitment");
    if (type === "MENTOR_SESSION") return t("typeMentorSession");
    return type;
  }

  function statusLabel(status: PaymentStatus): string {
    if (status === "PAID") return t("statusPaid");
    if (status === "PENDING") return t("statusPending");
    if (status === "FAILED") return t("statusFailed");
    if (status === "REFUNDED") return t("statusRefunded");
    return status;
  }

  function statusClass(status: PaymentStatus): string {
    if (status === "PAID") return "bg-emerald-100 text-emerald-800";
    if (status === "FAILED") return "bg-red-100 text-red-800";
    if (status === "REFUNDED") return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-700";
  }

  if (loading) {
    return <p className="text-sm text-[#6B7280]">{t("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#0D2137]">{t("historyTitle")}</h1>
        <p className="mt-1 text-sm text-[#6B7280]">{t("historySubtitle")}</p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-white p-6 text-sm text-[#6B7280]">{t("historyEmpty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-[#F8FAFC] text-start text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">{t("colDate")}</th>
                <th className="px-4 py-3">{t("colDescription")}</th>
                <th className="px-4 py-3">{t("colAmount")}</th>
                <th className="px-4 py-3">{t("colStatus")}</th>
                <th className="px-4 py-3">{t("colReceipt")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 whitespace-nowrap text-[#374151]">
                    {new Date(row.paidAt ?? row.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-[#374151]">{typeLabel(row.type)}</td>
                  <td className="px-4 py-3 font-medium text-[#0D2137]">
                    {row.currency} {row.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.moyasarPaymentId ? (
                      <button
                        type="button"
                        className="text-sm font-medium text-[#0F4C75] hover:underline"
                        onClick={() => setReceiptId(row.moyasarPaymentId)}
                      >
                        {t("viewReceipt")}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {receiptId ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#0D2137]">{t("receiptTitle")}</h2>
            <p className="mt-3 break-all font-mono text-sm text-[#374151]">{receiptId}</p>
            <button
              type="button"
              className="mt-6 w-full rounded-lg bg-[#0F4C75] py-2.5 text-sm font-semibold text-white"
              onClick={() => setReceiptId(null)}
            >
              {t("close")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
