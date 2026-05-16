"use client";

import axios from "axios";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SendTalentPoolInviteModal } from "@/components/employer/SendTalentPoolInviteModal";
import { talentPoolReasonLabelKey } from "@/lib/talent-pool/reason-label-key";

type Row = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  professionalTitle: string | null;
  assessmentScore: number | null;
  interviewScore: number | null;
  reason: string;
  skillsMatched: string[];
  createdAt: string;
  proctoringSuspendedUntil: string | null;
  proctoringCooldownActive: boolean;
};

export function EmployerTalentPoolClient() {
  const t = useTranslations("employerTalentPool");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [minA, setMinA] = useState("");
  const [maxA, setMaxA] = useState("");
  const [minI, setMinI] = useState("");
  const [maxI, setMaxI] = useState("");
  const [skills, setSkills] = useState("");
  const [reason, setReason] = useState<
    | ""
    | "INTERVIEW_LOW_SCORE"
    | "EMPLOYER_DECLINED"
    | "PROCTORING_VIOLATION"
    | "ASSESSMENT_LOW_SCORE"
    | "NO_ASSESSMENT"
    | "NOT_SELECTED_30_DAYS"
  >("");
  const [msg, setMsg] = useState<string | null>(null);
  const [inviteRow, setInviteRow] = useState<Row | null>(null);
  const inviteName = inviteRow ? inviteRow.name?.trim() || inviteRow.email : "";

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
    setMsg(null);
    try {
      const p = new URLSearchParams();
      if (minA.trim()) p.set("minAssessment", minA.trim());
      if (maxA.trim()) p.set("maxAssessment", maxA.trim());
      if (minI.trim()) p.set("minInterview", minI.trim());
      if (maxI.trim()) p.set("maxInterview", maxI.trim());
      if (skills.trim()) p.set("skills", skills.trim());
      if (reason) p.set("reason", reason);
      const res = await axios.get<{ success: boolean; data: { items: Row[] } }>(
        `/api/employer/talent-pool?${p.toString()}`,
      );
      setItems(res.data?.data?.items ?? []);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, [minA, maxA, minI, maxI, skills, reason]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  if (loading && !items.length) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (err) return <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={load} />;

  return (
    <div className="space-y-6">
      {inviteRow ? (
        <SendTalentPoolInviteModal
          open
          onClose={() => setInviteRow(null)}
          candidateId={inviteRow.userId}
          candidateName={inviteName}
        />
      ) : null}
      {msg ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{msg}</p>
      ) : null}

      <div className="flex flex-wrap gap-3 rounded-xl border border-[#EEF2F7] bg-white p-4">
        <input
          className="min-h-10 w-24 rounded border px-2 text-sm"
          placeholder={t("minAs")}
          value={minA}
          onChange={(e) => setMinA(e.target.value)}
        />
        <input
          className="min-h-10 w-24 rounded border px-2 text-sm"
          placeholder={t("maxAs")}
          value={maxA}
          onChange={(e) => setMaxA(e.target.value)}
        />
        <input
          className="min-h-10 w-24 rounded border px-2 text-sm"
          placeholder={t("minIv")}
          value={minI}
          onChange={(e) => setMinI(e.target.value)}
        />
        <input
          className="min-h-10 w-24 rounded border px-2 text-sm"
          placeholder={t("maxIv")}
          value={maxI}
          onChange={(e) => setMaxI(e.target.value)}
        />
        <input
          className="min-h-10 min-w-[140px] flex-1 rounded border px-2 text-sm"
          placeholder={t("skillsPh")}
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />
        <select
          className="min-h-10 rounded border bg-white px-2 text-sm"
          value={reason}
          onChange={(e) => setReason(e.target.value as typeof reason)}
        >
          <option value="">{t("reasonAll")}</option>
          <option value="INTERVIEW_LOW_SCORE">{t("reasonInterview")}</option>
          <option value="EMPLOYER_DECLINED">{t("reasonDeclined")}</option>
          <option value="PROCTORING_VIOLATION">{t("reasonProctoring")}</option>
          <option value="ASSESSMENT_LOW_SCORE">{t("reasonAssessmentLow")}</option>
          <option value="NO_ASSESSMENT">{t("reasonNoAssessment")}</option>
          <option value="NOT_SELECTED_30_DAYS">{t("reasonNotSelected30")}</option>
        </select>
        <Button type="button" variant="secondary" className="min-h-10" onClick={() => void load()}>
          {tc("filter")}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#EEF2F7] bg-white shadow-sm">
        <table className="min-w-full text-start text-sm">
          <thead className="bg-[#F8FAFC] text-xs font-bold uppercase text-[#6B7280]">
            <tr>
              <th className="px-3 py-3">{t("colCandidate")}</th>
              <th className="px-3 py-3">{t("colAs")}</th>
              <th className="px-3 py-3">{t("colIv")}</th>
              <th className="px-3 py-3">{t("colWhy")}</th>
              <th className="px-3 py-3">{t("colStatus")}</th>
              <th className="px-3 py-3">{t("colSkills")}</th>
              <th className="px-3 py-3">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t border-[#F1F5F9]">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <InitialsAvatar name={r.name} email={r.email} />
                    <div>
                      <p className="font-semibold text-[#0D2137]">{r.name?.trim() || r.email}</p>
                      <p className="text-xs text-[#6B7280]">{r.professionalTitle ?? "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">{r.assessmentScore ?? "—"}</td>
                <td className="px-3 py-3">{r.interviewScore ?? "—"}</td>
                <td className="px-3 py-3 text-xs">{t(talentPoolReasonLabelKey(r.reason))}</td>
                <td className="px-3 py-3 text-xs text-[#374151]">
                  {r.reason === "PROCTORING_VIOLATION" ? (
                    r.proctoringCooldownActive && r.proctoringSuspendedUntil ? (
                      <span className="text-rose-800">
                        {t("statusCooldown", {
                          datetime: new Date(r.proctoringSuspendedUntil).toLocaleString(
                            isRtl ? "ar" : "en-GB",
                            { dateStyle: "medium", timeStyle: "short" },
                          ),
                        })}
                      </span>
                    ) : (
                      <span className="text-emerald-800">{t("statusReassessmentReady")}</span>
                    )
                  ) : (
                    "—"
                  )}
                </td>
                <td className="max-w-[200px] px-3 py-3 text-xs text-[#374151]">{r.skillsMatched.slice(0, 6).join(", ") || "—"}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/dashboard/employer/talent-pool/${encodeURIComponent(r.userId)}`}
                      className="text-xs font-semibold text-[#7C3AED] underline"
                    >
                      {t("viewProfile")}
                    </Link>
                    <Link
                      href={`/dashboard/employer/messages?to=${encodeURIComponent(r.userId)}`}
                      className="text-xs font-semibold text-brand-teal underline"
                    >
                      {t("messageShort")}
                    </Link>
                    <button
                      type="button"
                      className="text-start text-xs font-semibold text-[#0F4C75] underline"
                      onClick={() => setInviteRow(r)}
                    >
                      {t("nominate")}
                    </button>
                    <button
                      type="button"
                      className="text-start text-xs font-semibold text-[#0F4C75] underline"
                      onClick={() => setMsg(t("trainingStub"))}
                    >
                      {t("recommendTraining")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length ? <p className="p-8 text-center text-sm text-[#6B7280]">{t("empty")}</p> : null}
      </div>
    </div>
  );
}
