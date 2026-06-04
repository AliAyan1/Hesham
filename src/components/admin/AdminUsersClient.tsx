"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import type { AdminUserRow, AdminUsersListPayload } from "@/types/admin";

export function AdminUsersClient({
  role,
  title,
}: {
  role: "job-seeker" | "employer";
  title: string;
}) {
  const t = useTranslations("adminPanel.usersPage");
  const tAdmin = useTranslations("adminPanel");
  const tc = useTranslations("common");
  const [data, setData] = useState<AdminUsersListPayload | null>(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [assessmentStatus, setAssessmentStatus] = useState("");

  const load = useCallback(async () => {
    setError(false);
    const qs = new URLSearchParams({
      role,
      page: String(page),
      pageSize: "20",
    });
    if (search) qs.set("search", search);
    if (plan) qs.set("plan", plan);
    if (assessmentStatus) qs.set("assessmentStatus", assessmentStatus);
    const res = await fetch(`/api/admin/users?${qs}`, { credentials: "include" });
    if (!res.ok) {
      setError(true);
      return;
    }
    const json = (await res.json()) as { success?: boolean; data?: AdminUsersListPayload };
    if (json.success && json.data) setData(json.data);
    else setError(true);
  }, [role, page, search, plan, assessmentStatus]);

  const { lastUpdated, isLoading, refresh } = useAdminPolling(load, 30000);

  useEffect(() => {
    void refresh();
  }, [page, refresh]);

  async function updateUser(
    userId: string,
    patch: { subscriptionTier?: string; suspended?: boolean },
  ) {
    await fetch("/api/admin/users", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });
    await refresh();
  }

  async function deleteUser(userId: string) {
    if (!confirm(tAdmin("confirmDelete"))) return;
    await fetch(`/api/admin/users?userId=${userId}`, {
      method: "DELETE",
      credentials: "include",
    });
    await refresh();
  }

  if (error && !data) {
    return <ErrorState title={tc("error")} onRetry={() => void refresh()} retryLabel={tc("retry")} />;
  }
  if (!data) return <LoadingSpinner size="full" label={tc("loading")} />;

  const stats = data.stats;
  const headerStats =
    role === "job-seeker"
      ? `Total: ${stats.total ?? data.total} | Free: ${stats.free ?? 0} | Pro: ${stats.pro ?? 0} | Premium: ${stats.premium ?? 0}`
      : `Total: ${data.total}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        onRefresh={refresh}
      />
      <p className="text-sm font-medium text-[#6B7280]">{headerStats}</p>

      <div className="flex flex-wrap gap-2">
        <input
          className="min-h-10 flex-1 rounded-lg border px-3 text-sm"
          placeholder={t("searchPh")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void refresh()}
        />
        {role === "job-seeker" ? (
          <>
            <select
              className="rounded-lg border px-2 text-sm"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="">{t("planAll")}</option>
              <option value="free">{t("planFree")}</option>
              <option value="pro">{t("planPro")}</option>
              <option value="premium">{t("planPremium")}</option>
            </select>
            <select
              className="rounded-lg border px-2 text-sm"
              value={assessmentStatus}
              onChange={(e) => setAssessmentStatus(e.target.value)}
            >
              <option value="">{t("assessmentAll")}</option>
              <option value="completed">{t("assessmentDone")}</option>
              <option value="not_taken">{t("assessmentNone")}</option>
            </select>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg bg-[#0F4C75] px-4 py-2 text-sm font-semibold text-white"
        >
          {tc("search")}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F8FAFC] text-xs font-bold uppercase text-[#6B7280]">
            <tr>
              <th className="px-3 py-2 text-start">{t("colName")}</th>
              {role === "job-seeker" ? (
                <th className="px-3 py-2">{t("colPlan")}</th>
              ) : null}
              {role === "job-seeker" ? (
                <th className="px-3 py-2">{t("colScore")}</th>
              ) : (
                <th className="px-3 py-2">{t("colJobs")}</th>
              )}
              <th className="px-3 py-2">
                {role === "job-seeker" ? t("colApplications") : t("colApplications")}
              </th>
              <th className="px-3 py-2">{t("colJoined")}</th>
              <th className="px-3 py-2">{t("colStatus")}</th>
              <th className="px-3 py-2 text-end">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[#6B7280]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              data.items.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  role={role}
                  onSuspend={() =>
                    updateUser(u.id, { suspended: u.status !== "SUSPENDED" })
                  }
                  onTier={(tier) => updateUser(u.id, { subscriptionTier: tier })}
                  onDelete={() => deleteUser(u.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          disabled={page <= 1}
          className="text-sm font-medium text-[#0F4C75] disabled:opacity-40"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t("prev")}
        </button>
        <span className="text-sm text-[#6B7280]">
          {page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}
        </span>
        <button
          type="button"
          disabled={page * data.pageSize >= data.total}
          className="text-sm font-medium text-[#0F4C75] disabled:opacity-40"
          onClick={() => setPage((p) => p + 1)}
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}

function UserRow({
  user,
  role,
  onSuspend,
  onTier,
  onDelete,
}: {
  user: AdminUserRow;
  role: "job-seeker" | "employer";
  onSuspend: () => void;
  onTier: (tier: string) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("adminPanel.usersPage");
  const [open, setOpen] = useState(false);
  const planLabel =
    user.subscriptionTier === "PROFESSIONAL"
      ? "Pro"
      : user.subscriptionTier === "PREMIUM"
        ? "Premium"
        : "Free";

  return (
    <tr className="border-t border-[#EEF2F7]">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <InitialsAvatar name={user.name} email={user.email} size="sm" />
          <div>
            <p className="font-medium">{user.name ?? "—"}</p>
            <p className="text-xs text-[#6B7280]">{user.email}</p>
          </div>
        </div>
      </td>
      {role === "job-seeker" ? (
        <td className="px-3 py-2">
          <span className="rounded-full bg-[#0F4C75]/10 px-2 py-0.5 text-xs font-semibold text-[#0F4C75]">
            {planLabel}
          </span>
        </td>
      ) : null}
      <td className="px-3 py-2">
        {role === "job-seeker"
          ? user.assessmentScore ?? t("notTaken")
          : user.jobsPostedCount}
      </td>
      <td className="px-3 py-2">{user.applicationsCount}</td>
      <td className="px-3 py-2 text-xs">
        {new Date(user.joinedAt).toLocaleDateString()}
      </td>
      <td className="px-3 py-2">
        <span
          className={
            user.status === "SUSPENDED"
              ? "text-red-600 text-xs font-semibold"
              : "text-emerald-700 text-xs font-semibold"
          }
        >
          {user.status === "SUSPENDED" ? t("suspended") : t("active")}
        </span>
      </td>
      <td className="relative px-3 py-2 text-end">
        <button
          type="button"
          className="text-xs font-semibold text-[#0F4C75]"
          onClick={() => setOpen((o) => !o)}
        >
          ⋮
        </button>
        {open ? (
          <div className="absolute end-0 z-10 mt-1 w-40 rounded-lg border bg-white py-1 shadow-lg text-start text-xs">
            {role === "job-seeker" ? (
              <>
                <button type="button" className="block w-full px-3 py-1.5 hover:bg-gray-50" onClick={() => { onTier("FREE"); setOpen(false); }}>Free</button>
                <button type="button" className="block w-full px-3 py-1.5 hover:bg-gray-50" onClick={() => { onTier("PROFESSIONAL"); setOpen(false); }}>Pro</button>
                <button type="button" className="block w-full px-3 py-1.5 hover:bg-gray-50" onClick={() => { onTier("PREMIUM"); setOpen(false); }}>Premium</button>
              </>
            ) : null}
            <button type="button" className="block w-full px-3 py-1.5 hover:bg-gray-50" onClick={() => { onSuspend(); setOpen(false); }}>
              {user.status === "SUSPENDED" ? t("active") : t("suspended")}
            </button>
            <button type="button" className="block w-full px-3 py-1.5 text-red-600 hover:bg-red-50" onClick={() => { onDelete(); setOpen(false); }}>
              Delete
            </button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}
