"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import type {
  AdminActivityItem,
  AdminStatsPayload,
  FlaggedAssessmentRow,
  FlaggedInterviewRow,
  PendingMentorRow,
  PendingPayoutRow,
} from "@/types/admin";

export function AdminDashboardPending({
  data,
  onApproveMentor,
  onRejectMentor,
  onPayPayout,
}: {
  data: AdminStatsPayload;
  onApproveMentor: (mentorId: string) => Promise<void>;
  onRejectMentor: (mentorId: string, reason: string) => Promise<void>;
  onPayPayout: (payoutId: string, reference: string) => Promise<void>;
}) {
  const t = useTranslations("adminPanel");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [payId, setPayId] = useState<string | null>(null);
  const [payRef, setPayRef] = useState("");

  return (
    <div className="space-y-6">
      <PendingCard
        title={t("pending.mentors")}
        badge={data.pendingMentors.length}
        badgeClass="bg-orange-100 text-orange-800"
        empty={t("pending.noMentors")}
        showTable={data.pendingMentors.length > 0}
      >
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="py-2 text-start">{t("pending.colMentor")}</th>
              <th className="py-2 text-start">{t("pending.colExpertise")}</th>
              <th className="py-2 text-start">{t("pending.colApplied")}</th>
              <th className="py-2 text-end">{t("pending.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {data.pendingMentors.map((m) => (
              <MentorRow
                key={m.id}
                row={m}
                onApprove={() => onApproveMentor(m.id)}
                onReject={() => setRejectId(m.id)}
              />
            ))}
          </tbody>
        </table>
      </PendingCard>

      <PendingCard
        title={t("pending.flaggedAssessments")}
        badge={data.flaggedAssessments.length}
        badgeClass="bg-red-100 text-red-800"
        empty={t("pending.noneFlaggedAssessments")}
        showTable={data.flaggedAssessments.length > 0}
      >
        <FlaggedTable rows={data.flaggedAssessments} type="assessment" />
      </PendingCard>

      <PendingCard
        title={t("pending.flaggedInterviews")}
        badge={data.flaggedInterviews.length}
        badgeClass="bg-red-100 text-red-800"
        empty={t("pending.noneFlaggedInterviews")}
        showTable={data.flaggedInterviews.length > 0}
      >
        <FlaggedTable rows={data.flaggedInterviews} type="interview" />
      </PendingCard>

      <PendingCard
        title={t("pending.payouts")}
        badge={`SAR ${data.pendingPayoutsTotal}`}
        badgeClass="bg-amber-100 text-amber-900"
        empty={t("pending.noPayouts")}
        showTable={data.pendingPayouts.length > 0}
      >
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="py-2 text-start">{t("pending.colMentor")}</th>
              <th className="py-2 text-start">{t("pending.colSessions")}</th>
              <th className="py-2 text-start">{t("pending.colAmount")}</th>
              <th className="py-2 text-start">IBAN</th>
              <th className="py-2 text-end">{t("pending.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {data.pendingPayouts.map((p) => (
              <tr key={p.id} className="border-t border-[#EEF2F7]">
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <InitialsAvatar name={p.name ?? "?"} email="" size="sm" />
                    {p.name}
                  </div>
                </td>
                <td className="py-2">{p.sessionsCount}</td>
                <td className="py-2 font-semibold">SAR {Math.round(p.amount)}</td>
                <td className="py-2 font-mono text-xs">{p.iban}</td>
                <td className="py-2 text-end">
                  <button
                    type="button"
                    onClick={() => setPayId(p.id)}
                    className="rounded-lg bg-[#C9973A] px-3 py-1 text-xs font-semibold text-white"
                  >
                    {t("pending.markPaid")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PendingCard>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-[#0D2137]">{t("pending.activityFeed")}</h3>
        <ActivityFeed items={data.activity} />
      </div>

      {rejectId ? (
        <Modal title={t("pending.rejectMentor")} onClose={() => setRejectId(null)}>
          <textarea
            className="w-full rounded-lg border p-2 text-sm"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t("pending.rejectReasonPh")}
          />
          <button
            type="button"
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              void onRejectMentor(rejectId, rejectReason).then(() => {
                setRejectId(null);
                setRejectReason("");
              });
            }}
          >
            {t("pending.confirmReject")}
          </button>
        </Modal>
      ) : null}

      {payId ? (
        <Modal title={t("pending.payModalTitle")} onClose={() => setPayId(null)}>
          <input
            className="w-full rounded-lg border p-2 text-sm"
            value={payRef}
            onChange={(e) => setPayRef(e.target.value)}
            placeholder={t("pending.referencePh")}
          />
          <button
            type="button"
            className="mt-3 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              void onPayPayout(payId, payRef).then(() => {
                setPayId(null);
                setPayRef("");
              });
            }}
          >
            {t("pending.confirmPayment")}
          </button>
        </Modal>
      ) : null}
    </div>
  );
}

function MentorRow({
  row,
  onApprove,
  onReject,
}: {
  row: PendingMentorRow;
  onApprove: () => void;
  onReject: () => void;
}) {
  const t = useTranslations("adminPanel");
  return (
    <tr className="border-t border-[#EEF2F7]">
      <td className="py-2">
        <div className="flex items-center gap-2">
          <InitialsAvatar name={row.name} email={row.email} size="sm" />
          {row.name}
        </div>
      </td>
      <td className="py-2 text-xs text-[#6B7280]">
        {[...row.expertise, ...row.industries].slice(0, 3).join(" · ") || "—"}
      </td>
      <td className="py-2 text-xs">{new Date(row.appliedAt).toLocaleDateString()}</td>
      <td className="py-2 text-end">
        <button type="button" onClick={onApprove} className="me-2 rounded-lg bg-[#1D9E75] px-2 py-1 text-xs font-semibold text-white">
          {t("pending.approve")}
        </button>
        <button type="button" onClick={onReject} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white">
          {t("pending.reject")}
        </button>
      </td>
    </tr>
  );
}

function FlaggedTable({
  rows,
  type,
}: {
  rows: (FlaggedAssessmentRow | FlaggedInterviewRow)[];
  type: "assessment" | "interview";
}) {
  const t = useTranslations("adminPanel");
  const href =
    type === "assessment"
      ? "/dashboard/admin/assessments"
      : "/dashboard/admin/interviews";
  return (
    <table className="min-w-full text-sm">
      <thead className="text-xs uppercase text-[#6B7280]">
        <tr>
          <th className="py-2 text-start">{t("pending.colCandidate")}</th>
          <th className="py-2 text-start">{t("pending.colDate")}</th>
          <th className="py-2 text-start">{t("pending.colFlags")}</th>
          <th className="py-2 text-end">{t("pending.colActions")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-red-100 bg-red-50/40">
            <td className="py-2">
              <div className="flex items-center gap-2">
                <InitialsAvatar name={r.name} email="candidate@qudrahtech.com" size="sm" />
                {r.name}
              </div>
            </td>
            <td className="py-2 text-xs">
              {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "—"}
            </td>
            <td className="py-2 text-red-700">{r.flagCount}</td>
            <td className="py-2 text-end">
              <a href={href} className="text-xs font-semibold text-[#0F4C75] underline">
                {t("pending.review")}
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ActivityFeed({ items }: { items: AdminActivityItem[] }) {
  const t = useTranslations("adminPanel");
  if (items.length === 0) {
    return <p className="text-sm text-[#6B7280]">{t("pending.noActivity")}</p>;
  }
  return (
    <ul className="max-h-80 space-y-2 overflow-y-auto">
      {items.map((item) => (
        <li key={item.id} className="flex gap-2 text-sm text-[#374151]">
          <span aria-hidden>{item.emoji}</span>
          <span className="flex-1">{item.message}</span>
          <time className="shrink-0 text-xs text-[#9CA3AF]">
            {formatTimeAgo(item.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}

function formatTimeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return `${h}h`;
}

function PendingCard({
  title,
  badge,
  badgeClass,
  empty,
  showTable,
  children,
}: {
  title: string;
  badge: string | number;
  badgeClass: string;
  empty: string;
  showTable: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-bold text-[#0D2137]">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badgeClass}`}>
          {badge}
        </span>
      </div>
      {showTable ? children : <p className="text-sm text-[#6B7280]">{empty}</p>}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-bold text-[#0D2137]">{title}</h4>
          <button type="button" onClick={onClose} className="text-[#6B7280]">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
