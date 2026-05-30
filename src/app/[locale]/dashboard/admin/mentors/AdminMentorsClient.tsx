"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

type MentorRow = {
  id: string;
  title: string | null;
  hourlyRate: number | null;
  expertise: unknown;
  industries: unknown;
  isApproved: boolean;
  isActive: boolean;
  averageRating: number;
  totalSessions: number;
  totalEarnings: number;
  rejectedReason: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: string;
  };
  _count: { sessions: number };
};

function tags(v: unknown): string {
  if (!Array.isArray(v)) return "—";
  return v.slice(0, 3).map(String).join(", ") || "—";
}

export function AdminMentorsClient() {
  const t = useTranslations("adminMentors");
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [pending, setPending] = useState<MentorRow[]>([]);
  const [approved, setApproved] = useState<MentorRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/mentors", { credentials: "include" });
    const j = (await res.json()) as {
      success?: boolean;
      data?: { pending: MentorRow[]; approved: MentorRow[] };
    };
    if (j.success && j.data) {
      setPending(j.data.pending);
      setApproved(j.data.approved);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/mentors/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        credentials: "include",
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/mentors/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/mentors/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setRejectId(null);
      setRejectReason("");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const rows = tab === "pending" ? pending : approved;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-[#E5E7EB]">
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${tab === "pending" ? "border-brand-teal text-brand-teal" : "border-transparent text-[#6B7280]"}`}
          onClick={() => setTab("pending")}
        >
          {t("pendingTab")} ({pending.length})
        </button>
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${tab === "approved" ? "border-brand-teal text-brand-teal" : "border-transparent text-[#6B7280]"}`}
          onClick={() => setTab("approved")}
        >
          {t("approvedTab")} ({approved.length})
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-start text-sm">
          <thead className="bg-[#F8FAFC] text-xs font-bold uppercase text-[#6B7280]">
            <tr>
              <th className="px-3 py-2">{t("colMentor")}</th>
              {tab === "pending" ? (
                <>
                  <th className="px-3 py-2">{t("colApplied")}</th>
                  <th className="px-3 py-2">{t("colExpertise")}</th>
                  <th className="px-3 py-2">{t("colRate")}</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2">{t("colSessions")}</th>
                  <th className="px-3 py-2">{t("colRating")}</th>
                  <th className="px-3 py-2">{t("colEarnings")}</th>
                </>
              )}
              <th className="px-3 py-2">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-[#EEF2F7]">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar src={m.user.image} name={m.user.name} email={m.user.email} size="sm" />
                    <div>
                      <p className="font-medium">{m.user.name ?? m.user.email}</p>
                      <p className="text-xs text-[#6B7280]">{m.title ?? "—"}</p>
                    </div>
                  </div>
                </td>
                {tab === "pending" ? (
                  <>
                    <td className="px-3 py-2 text-xs text-[#6B7280]">
                      {new Date(m.user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-xs">{tags(m.expertise)}</td>
                    <td className="px-3 py-2">SAR {m.hourlyRate ?? "—"}</td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2">{m._count.sessions}</td>
                    <td className="px-3 py-2">{m.averageRating.toFixed(1)}</td>
                    <td className="px-3 py-2">SAR {Math.round(m.totalEarnings)}</td>
                  </>
                )}
                <td className="px-3 py-2">
                  {tab === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" loading={busyId === m.id} onClick={() => void approve(m.id)}>
                        {t("approve")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyId === m.id}
                        onClick={() => setRejectId(m.id)}
                      >
                        {t("reject")}
                      </Button>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
                        checked={m.isActive}
                        disabled={busyId === m.id}
                        onChange={() => void toggleActive(m.id, !m.isActive)}
                      />
                      <span className="text-xs font-medium text-[#374151]">
                        {m.isActive ? t("active") : t("inactive")}
                      </span>
                    </label>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">{t("empty")}</p> : null}
      </div>

      {rejectId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="font-bold text-[#0D2137]">{t("rejectTitle")}</h3>
            <textarea
              className="mt-3 w-full rounded-lg border p-3 text-sm"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("rejectPlaceholder")}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejectId(null)}>
                {t("cancel")}
              </Button>
              <Button type="button" loading={busyId === rejectId} onClick={() => void reject(rejectId)}>
                {t("confirmReject")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
