"use client";

import axios from "axios";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { TalentPoolInviteDto } from "@/lib/talent-pool/talent-pool-types";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function JobSeekerInvitesClient() {
  const t = useTranslations("jobSeekerInvites");
  const tc = useTranslations("common");
  const [items, setItems] = useState<TalentPoolInviteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [gate, setGate] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
    try {
      const res = await axios.get<{ success: boolean; data: { items: TalentPoolInviteDto[] } }>(
        "/api/job-seeker/talent-pool-invites",
      );
      setItems(res.data?.data?.items ?? []);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function accept(id: string) {
    setActingId(id);
    setGate(null);
    try {
      const res = await axios.post<{ success: boolean; data: { gate: string } }>(
        `/api/job-seeker/talent-pool-invites/${encodeURIComponent(id)}/accept`,
      );
      const g = res.data?.data?.gate;
      if (g === "needs_assessment") setGate("needs_assessment");
      else if (g === "needs_score") setGate("needs_score");
      else if (g === "expired") setGate("expired");
      else await load();
    } catch {
      setGate("error");
    } finally {
      setActingId(null);
    }
  }

  async function decline(id: string) {
    setActingId(id);
    await axios.post(`/api/job-seeker/talent-pool-invites/${encodeURIComponent(id)}/decline`);
    await load();
    setActingId(null);
  }

  if (loading) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (err) return <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={load} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0D2137]">{t("title")}</h1>
      <p className="text-sm text-[#6B7280]">{t("subtitle")}</p>

      {gate === "needs_assessment" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>{t("gateNeedsAssessment")}</p>
          <Link href="/dashboard/job-seeker/assessment" className="mt-2 inline-block font-semibold text-brand-teal underline">
            {t("startAssessment")}
          </Link>
        </div>
      ) : null}
      {gate === "needs_score" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>{t("gateNeedsScore")}</p>
          <Link href="/dashboard/job-seeker/assessment" className="mt-2 inline-block font-semibold text-brand-teal underline">
            {t("retakeAssessment")}
          </Link>
        </div>
      ) : null}

      {!items.length ? (
        <p className="text-sm text-[#6B7280]">{t("empty")}</p>
      ) : (
        <ul className="space-y-4">
          {items.map((inv) => (
            <li key={inv.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="font-bold text-[#0D2137]">{inv.jobTitle}</p>
              <p className="text-sm text-[#6B7280]">{inv.companyName}</p>
              <p className="mt-2 text-xs text-[#6B7280]">
                {t("statusLabel")}: {t(`status_${inv.status}` as "status_PENDING_ASSESSMENT")}
              </p>
              <p className="text-xs text-[#6B7280]">
                {t("expires", {
                  date: new Date(inv.expiresAt).toLocaleDateString(),
                })}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  loading={actingId === inv.id}
                  onClick={() => void accept(inv.id)}
                >
                  {t("accept")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={actingId === inv.id}
                  onClick={() => void decline(inv.id)}
                >
                  {t("decline")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
