"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Row = {
  id: string;
  status: string;
  scheduledAt: string | null;
  duration: number;
  price: number;
  hasRecording: boolean;
  recordingUrl: string | null;
  mentor: { name: string | null };
  mentee: { name: string | null };
};

export default function AdminSessionsClient() {
  const t = useTranslations("session");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetch(`/api/admin/sessions${q}`, { credentials: "include" });
    const j = (await res.json()) as { success?: boolean; data?: { sessions: Row[] } };
    if (j.success && j.data?.sessions) setRows(j.data.sessions);
  }

  useEffect(() => {
    void load();
  }, [status]);

  return (
    <div className="space-y-4">
      <select className="min-h-11 rounded-lg border px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">{t("allStatuses")}</option>
        <option value="PENDING">PENDING</option>
        <option value="CONFIRMED">CONFIRMED</option>
        <option value="IN_PROGRESS">IN_PROGRESS</option>
        <option value="COMPLETED">COMPLETED</option>
        <option value="CANCELLED">CANCELLED</option>
      </select>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="p-3">{t("date")}</th>
              <th className="p-3">Mentor</th>
              <th className="p-3">Mentee</th>
              <th className="p-3">{t("status")}</th>
              <th className="p-3">{t("recording")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : "—"}</td>
                <td className="p-3">{r.mentor.name ?? "—"}</td>
                <td className="p-3">{r.mentee.name ?? "—"}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3">
                  {r.hasRecording && r.recordingUrl ? (
                    <a href={r.recordingUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#0F4C75] underline">
                      {t("viewRecording")}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
