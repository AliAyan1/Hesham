"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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

  useEffect(() => {
    void fetch("/api/mentor/earnings", { credentials: "include" })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: EarningsData }>)
      .then((j) => {
        if (j.success && j.data) setData(j.data);
      });
  }, []);

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

      <section className="rounded-xl border border-[#C9973A]/30 bg-[#FDF3E3] p-6">
        <h2 className="font-bold text-[#0D2137]">{tm("payoutSection")}</h2>
        <p className="mt-2 text-sm text-[#374151]">
          {tm("pendingPayout")}: SAR {Math.round(data.pendingPayout)}
        </p>
        <p className="mt-3 text-sm text-[#6B7280]">{t("payoutAdminNote")}</p>
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

      {data.payoutHistory.length > 0 ? (
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
      ) : null}
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
