"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAdminPolling } from "@/hooks/useAdminPolling";

type Pending = {
  id: string;
  amount: number;
  bankName: string;
  iban: string;
  createdAt: string;
  mentor: { name: string | null; image?: string | null };
};

type History = {
  id: string;
  amount: number;
  reference: string | null;
  processedAt: string | null;
  mentor: { name: string | null };
};

export default function AdminPayoutsPageClient({ title }: { title: string }) {
  const t = useTranslations("adminPanel.payoutsPage");
  const tc = useTranslations("common");
  const [tab, setTab] = useState<"pending" | "completed">("pending");
  const [pending, setPending] = useState<Pending[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [modalId, setModalId] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [transferDate, setTransferDate] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/payouts", { credentials: "include" });
    const j = (await res.json()) as {
      success?: boolean;
      data?: { pending: Pending[]; history: History[] };
    };
    if (j.success && j.data) {
      setPending(j.data.pending);
      setHistory(j.data.history);
    }
  }, []);

  const { lastUpdated, isLoading, refresh } = useAdminPolling(load, 30000);

  const pendingTotal = pending.reduce((s, p) => s + p.amount, 0);

  async function pay() {
    if (!modalId || !reference.trim()) return;
    await fetch("/api/admin/payouts/pay", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payoutId: modalId,
        reference: reference.trim(),
        transferDate: transferDate || undefined,
      }),
    });
    setModalId(null);
    setReference("");
    await refresh();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} lastUpdated={lastUpdated} isLoading={isLoading} onRefresh={refresh} />
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("pending")} className={tabBtn(tab === "pending")}>{t("tabPending")}</button>
        <button type="button" onClick={() => setTab("completed")} className={tabBtn(tab === "completed")}>{t("tabCompleted")}</button>
      </div>
      {tab === "pending" ? (
        <>
          <p className="text-sm font-semibold text-amber-800">{t("pendingTotal", { amount: Math.round(pendingTotal) })}</p>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-[#6B7280]">
                <tr>
                  <th className="px-3 py-2 text-start">Mentor</th>
                  <th className="px-3 py-2">{t("gross")}</th>
                  <th className="px-3 py-2">{t("fee")}</th>
                  <th className="px-3 py-2">{t("net")}</th>
                  <th className="px-3 py-2">IBAN</th>
                  <th className="px-3 py-2 text-end">{t("payNow")}</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => {
                  const fee = p.amount * 0.25;
                  const net = p.amount - fee;
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <InitialsAvatar name={p.mentor.name} email="mentor@qudrahtech.com" size="sm" />
                          {p.mentor.name}
                        </div>
                      </td>
                      <td className="px-3 py-2">SAR {Math.round(p.amount)}</td>
                      <td className="px-3 py-2">SAR {Math.round(fee)}</td>
                      <td className="px-3 py-2 font-semibold">SAR {Math.round(net)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{p.iban}</td>
                      <td className="px-3 py-2 text-end">
                        <button type="button" className="rounded bg-[#C9973A] px-2 py-1 text-xs text-white" onClick={() => setModalId(p.id)}>{t("payNow")}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : isLoading ? (
        <LoadingSpinner label={tc("loading")} />
      ) : (
        <ul className="space-y-2">
          {history.map((h) => (
            <li key={h.id} className="rounded-lg border bg-white p-3 text-sm">
              {h.mentor.name} · SAR {Math.round(h.amount)} · Ref {h.reference ?? "—"} · {h.processedAt ? new Date(h.processedAt).toLocaleDateString() : "—"}
            </li>
          ))}
        </ul>
      )}
      {modalId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5">
            <input className="mb-2 w-full rounded border p-2 text-sm" placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
            <input type="date" className="mb-2 w-full rounded border p-2 text-sm" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
            <button type="button" className="rounded bg-[#1D9E75] px-4 py-2 text-sm text-white" onClick={() => void pay()}>Confirm</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function tabBtn(active: boolean): string {
  return `rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-[#0F4C75] text-white" : "border bg-white"}`;
}
