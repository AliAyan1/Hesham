"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

type Pending = {
  id: string;
  amount: number;
  bankName: string;
  accountHolder: string;
  iban: string;
  createdAt: string;
  mentor: { name: string | null };
};

export default function AdminPayoutsClient() {
  const t = useTranslations("session");
  const [pending, setPending] = useState<Pending[]>([]);
  const [history, setHistory] = useState<Array<{ id: string; amount: number; reference: string | null; processedAt: string | null; mentor: { name: string | null } }>>([]);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/payouts", { credentials: "include" });
    const j = (await res.json()) as {
      success?: boolean;
      data?: { pending: Pending[]; history: typeof history };
    };
    if (j.success && j.data) {
      setPending(j.data.pending);
      setHistory(j.data.history);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markPaid(id: string) {
    const reference = refs[id]?.trim();
    if (!reference) return;
    setBusyId(id);
    try {
      await fetch("/api/admin/payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId: id, reference }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-bold">{t("pendingPayouts")}</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[#6B7280]">—</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <li key={p.id} className="rounded-xl border bg-white p-4 text-sm">
                <p className="font-semibold">{p.mentor.name ?? "—"} · SAR {Math.round(p.amount)}</p>
                <p className="text-[#6B7280]">
                  {p.bankName} · {p.accountHolder} · {p.iban}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    className="min-h-11 flex-1 rounded-lg border px-3"
                    placeholder={t("reference")}
                    value={refs[p.id] ?? ""}
                    onChange={(e) => setRefs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  />
                  <Button type="button" size="sm" loading={busyId === p.id} onClick={() => void markPaid(p.id)}>
                    {t("markPaid")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 font-bold">{t("payoutHistory")}</h2>
        <ul className="space-y-2 text-sm">
          {history.map((p) => (
            <li key={p.id} className="rounded-lg border p-3">
              {p.mentor.name} · SAR {Math.round(p.amount)} · {p.reference ?? "—"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
