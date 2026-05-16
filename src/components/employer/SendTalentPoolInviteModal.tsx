"use client";

import axios from "axios";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type JobOption = { id: string; title: string };

type Props = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  defaultJobId?: string;
};

export function SendTalentPoolInviteModal({
  open,
  onClose,
  candidateId,
  candidateName,
  defaultJobId,
}: Props) {
  const t = useTranslations("employerTalentPool");
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobId, setJobId] = useState(defaultJobId ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const res = await axios.get<{ success: boolean; data: { items: JobOption[] } }>(
        "/api/employer/jobs",
      );
      const list = (res.data?.data?.items ?? []).filter((j) => j.id);
      setJobs(list);
      if (!jobId && list[0]) setJobId(defaultJobId ?? list[0].id);
    } catch {
      setJobs([]);
    }
  }, [defaultJobId, jobId]);

  useEffect(() => {
    if (open) {
      setSent(false);
      setErr(null);
      void loadJobs();
    }
  }, [open, loadJobs]);

  useEffect(() => {
    if (defaultJobId) setJobId(defaultJobId);
  }, [defaultJobId]);

  if (!open) return null;

  async function sendInvite() {
    if (!jobId) return;
    setLoading(true);
    setErr(null);
    try {
      await axios.post("/api/employer/talent-pool/invite", {
        candidateId,
        jobId,
      });
      setSent(true);
    } catch {
      setErr(t("inviteSendError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[#0D2137]">{t("inviteModalTitle")}</h3>
        <p className="mt-2 text-sm text-[#374151]">
          {t("inviteModalBody", { name: candidateName })}
        </p>

        {sent ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {t("inviteSentSuccess")}
          </p>
        ) : (
          <>
            <label className="mt-4 block text-sm font-medium text-[#374151]">
              {t("inviteSelectJob")}
            </label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
            {err ? <p className="mt-2 text-sm text-rose-700">{err}</p> : null}
          </>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("inviteModalClose")}
          </Button>
          {!sent ? (
            <Button type="button" loading={loading} disabled={!jobId} onClick={() => void sendInvite()}>
              {t("inviteSend")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
