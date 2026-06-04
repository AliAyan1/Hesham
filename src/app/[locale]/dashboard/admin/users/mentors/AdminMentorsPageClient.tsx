"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAdminPolling } from "@/hooks/useAdminPolling";

type MentorRow = {
  id: string;
  isApproved: boolean;
  isActive: boolean;
  hourlyRate: number | null;
  totalSessions: number;
  averageRating: number;
  totalEarnings: number;
  rejectedReason: string | null;
  createdAt: string;
  expertise: unknown;
  user: { id: string; name: string | null; image: string | null; email: string };
};

export default function AdminMentorsPageClient({ title }: { title: string }) {
  const t = useTranslations("adminPanel.usersPage");
  const tc = useTranslations("common");
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [pending, setPending] = useState<MentorRow[]>([]);
  const [approved, setApproved] = useState<MentorRow[]>([]);
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

  const { lastUpdated, isLoading, refresh } = useAdminPolling(load, 30000);

  async function approve(mentorId: string) {
    await fetch("/api/admin/mentors/approve", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentorId }),
    });
    await refresh();
  }

  async function reject(mentorId: string, reason: string) {
    await fetch("/api/admin/mentors/reject", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentorId, reason }),
    });
    await refresh();
  }

  const rows = tab === "pending" ? pending : approved;

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} lastUpdated={lastUpdated} isLoading={isLoading} onRefresh={refresh} />
      <div className="flex gap-2">
        <TabButton active={tab === "pending"} onClick={() => setTab("pending")} badge={pending.length}>
          {t("tabPending")}
        </TabButton>
        <TabButton active={tab === "approved"} onClick={() => setTab("approved")}>
          {t("tabApproved")}
        </TabButton>
      </div>
      {!rows.length && !isLoading ? (
        <p className="text-sm text-[#6B7280]">{t("empty")}</p>
      ) : isLoading && !rows.length ? (
        <LoadingSpinner label={tc("loading")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 text-start">{t("colName")}</th>
                <th className="px-3 py-2">Rate</th>
                <th className="px-3 py-2">Sessions</th>
                <th className="px-3 py-2 text-end">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <InitialsAvatar name={m.user.name} email={m.user.email} size="sm" />
                      {m.user.name}
                    </div>
                  </td>
                  <td className="px-3 py-2">SAR {m.hourlyRate ?? "—"}</td>
                  <td className="px-3 py-2">{m.totalSessions}</td>
                  <td className="px-3 py-2 text-end">
                    {tab === "pending" ? (
                      <>
                        <button type="button" className="me-2 text-xs font-semibold text-[#1D9E75]" onClick={() => void approve(m.id)}>Approve</button>
                        <button type="button" className="text-xs font-semibold text-red-600" onClick={() => setRejectId(m.id)}>Reject</button>
                      </>
                    ) : (
                      <span className="text-xs text-[#6B7280]">★ {m.averageRating.toFixed(1)} · SAR {Math.round(m.totalEarnings)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rejectId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5">
            <textarea className="w-full rounded border p-2 text-sm" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <button type="button" className="mt-2 rounded bg-red-600 px-4 py-2 text-sm text-white" onClick={() => void reject(rejectId, rejectReason).then(() => setRejectId(null))}>Reject</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-[#0F4C75] text-white" : "bg-white border text-[#0D2137]"}`}
    >
      {children}
      {badge != null && badge > 0 ? (
        <span className="ms-2 rounded-full bg-orange-500 px-1.5 text-xs text-white">{badge}</span>
      ) : null}
    </button>
  );
}
