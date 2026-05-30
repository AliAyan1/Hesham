"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

type EarningsData = {
  totalEarnings: number;
  earningsThisMonth: number;
  pendingPayout: number;
  lastPayoutAmount: number | null;
  lastPayoutDate: string | null;
  sessions: Array<{
    id: string;
    date: string | null;
    duration: number;
    price: number;
    mentorEarning: number;
    payoutStatus: string;
    mentee: { name: string | null };
  }>;
  payoutHistory: Array<{
    id: string;
    amount: number;
    status: string;
    reference: string | null;
    date: string;
  }>;
};

export default function MentorEarningsClient() {
  const t = useTranslations("session");
  const tm = useTranslations("mentor");
  const [data, setData] = useState<EarningsData | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/mentor/earnings", { credentials: "include" })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: EarningsData }>)
      .then((j) => {
        if (j.success && j.data) setData(j.data);
      });
  }, []);

  async function requestPayout() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/mentor/payout-request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, accountHolder, iban }),
      });
      const j = (await res.json()) as { success?: boolean; error?: string };
      if (!j.success) {
        setMsg(j.error ?? t("payoutFailed"));
        return;
      }
      setMsg(t("payoutRequested"));
      const reload = await fetch("/api/mentor/earnings", { credentials: "include" });
      const rj = (await reload.json()) as { success?: boolean; data?: EarningsData };
      if (rj.success && rj.data) setData(rj.data);
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <p className="text-sm text-[#6B7280]">{tm("loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-[#0D2137]">{t("earnings")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("totalAllTime")} value={`SAR ${Math.round(data.totalEarnings)}`} />
        <Stat label={t("thisMonth")} value={`SAR ${Math.round(data.earningsThisMonth)}`} />
        <Stat label={t("pending")} value={`SAR ${Math.round(data.pendingPayout)}`} />
        <Stat
          label={t("lastPayout")}
          value={
            data.lastPayoutAmount != null
              ? `SAR ${Math.round(data.lastPayoutAmount)}`
              : "—"
          }
        />
      </div>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="font-bold text-[#0D2137]">{t("payout")}</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          {t("pending")}: SAR {Math.round(data.pendingPayout)}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input className="min-h-11 rounded-lg border px-3 text-sm" placeholder={t("bankName")} value={bankName} onChange={(e) => setBankName(e.target.value)} />
          <input className="min-h-11 rounded-lg border px-3 text-sm" placeholder={t("accountHolder")} value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
          <input className="min-h-11 rounded-lg border px-3 text-sm" placeholder="IBAN" value={iban} onChange={(e) => setIban(e.target.value)} />
        </div>
        {msg ? <p className="mt-2 text-sm text-[#0F4C75]">{msg}</p> : null}
        <Button type="button" className="mt-4" loading={busy} disabled={data.pendingPayout < 1} onClick={() => void requestPayout()}>
          {t("payout")}
        </Button>
      </section>

      <section>
        <h2 className="mb-3 font-bold">{t("sessionsTable")}</h2>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gray-50 text-start text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="p-3">{t("date")}</th>
                <th className="p-3">{t("candidate")}</th>
                <th className="p-3">{t("duration")}</th>
                <th className="p-3">{t("price")}</th>
                <th className="p-3">{t("yourEarning")}</th>
                <th className="p-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.date ? new Date(s.date).toLocaleDateString() : "—"}</td>
                  <td className="p-3">{s.mentee.name ?? "—"}</td>
                  <td className="p-3">{s.duration}</td>
                  <td className="p-3">{Math.round(s.price)}</td>
                  <td className="p-3">{Math.round(s.mentorEarning)}</td>
                  <td className="p-3">{s.payoutStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold">{t("payoutHistory")}</h2>
        <ul className="space-y-2 text-sm">
          {data.payoutHistory.map((p) => (
            <li key={p.id} className="rounded-lg border bg-white p-3">
              {new Date(p.date).toLocaleDateString()} · SAR {Math.round(p.amount)} · {p.status}
              {p.reference ? ` · ${p.reference}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs text-[#6B7280]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#0D2137]">{value}</p>
    </div>
  );
}
