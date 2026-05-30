"use client";

import { useState } from "react";
import axios, { isAxiosError } from "axios";
import { FileDown, Link2, Lock, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import type { JdTailorResult, TailoredCvDraft } from "@/lib/cv/tailored-draft";
import { hasAccess } from "@/lib/subscription";
import type { SubscriptionTier } from "@/types";

type Props = {
  tier: SubscriptionTier;
  onOpenUpgrade: () => void;
};

function readApiError(e: unknown): string | undefined {
  if (!isAxiosError(e)) return undefined;
  const data = e.response?.data;
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return undefined;
}

export function JdTailoredResumePanel({ tier, onOpenUpgrade }: Props) {
  const t = useTranslations("cv.jdTailor");
  const ts = useTranslations("subscription");
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";

  const canUse = hasAccess(tier, "ai_cv_jd_tailor");
  const canAllTemplates = hasAccess(tier, "cv_templates_all");

  const [jobUrl, setJobUrl] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JdTailorResult | null>(null);
  const [template, setTemplate] = useState<"professional" | "modern" | "creative">("professional");

  async function onGenerate() {
    if (!canUse) {
      onOpenUpgrade();
      return;
    }
    const jd = jobDescription.trim();
    if (jd.length < 80) {
      setError(t("errors.jdTooShort"));
      return;
    }
    setError(null);
    setGenerating(true);
    setResult(null);
    try {
      const res = await axios.post("/api/cv/tailor-for-job", {
        jobDescription: jd,
        jobPostUrl: jobUrl.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        companyName: company.trim() || undefined,
      });
      const body = res.data as { success?: boolean; data?: JdTailorResult; error?: string };
      if (!res.data || body.success === false || !body.data) {
        setError(typeof body.error === "string" ? body.error : t("errors.generateFailed"));
        return;
      }
      setResult(body.data);
    } catch (e) {
      setError(readApiError(e) ?? t("errors.generateFailed"));
    } finally {
      setGenerating(false);
    }
  }

  async function onDownload(tailored: TailoredCvDraft) {
    if (!canUse) {
      onOpenUpgrade();
      return;
    }
    const tpl = template === "professional" || canAllTemplates ? template : "professional";
    setDownloading(true);
    setError(null);
    try {
      const slug = (result?.jobTitleDetected ?? "resume")
        .toLowerCase()
        .replace(/[^\w]+/g, "-")
        .slice(0, 40);
      const res = await axios.post(
        "/api/cv/generate-pdf",
        {
          template: tpl,
          tailoredDraft: tailored,
          downloadName: `resume-${slug}`,
        },
        { responseType: "blob" },
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume-${slug}-${tpl}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("errors.pdfFailed"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section
      className="rounded-2xl border-2 border-[#1D9E75]/30 bg-gradient-to-br from-[#F0FDF9] to-white p-6 shadow-sm"
      dir={isRtl ? "rtl" : "ltr"}
      aria-labelledby="jd-tailor-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1D9E75] text-white"
            aria-hidden
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h3 id="jd-tailor-heading" className="text-lg font-bold text-[#0D2137]">
              {t("title")}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">{t("subtitle")}</p>
            <p className="mt-2 text-xs font-semibold text-[#1D9E75]">{t("planBadge")}</p>
          </div>
        </div>
        {!canUse ? (
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#C9973A]/40 bg-white px-4 text-sm font-semibold text-[#0D2137]"
          >
            <Lock className="h-4 w-4 text-[#B45309]" aria-hidden />
            {ts("upgrade")}
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block lg:col-span-2">
          <span className="text-sm font-semibold text-[#0D2137]">{t("fields.jobDescription")}</span>
          <span className="ms-1 text-red-500">*</span>
          <textarea
            className="mt-2 min-h-[160px] w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder={t("fields.jobDescriptionPlaceholder")}
            disabled={!canUse}
          />
          <span className="mt-1 block text-xs text-[#6B7280]">{t("fields.jobDescriptionHint")}</span>
        </label>

        <label className="block">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-[#0D2137]">
            <Link2 className="h-4 w-4 text-[#6B7280]" aria-hidden />
            {t("fields.jobUrl")}
          </span>
          <input
            type="url"
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder={t("fields.jobUrlPlaceholder")}
            disabled={!canUse}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[#0D2137]">{t("fields.jobTitle")}</span>
          <input
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder={t("fields.jobTitlePlaceholder")}
            disabled={!canUse}
          />
        </label>

        <label className="block lg:col-span-2 sm:max-w-md">
          <span className="text-sm font-semibold text-[#0D2137]">{t("fields.company")}</span>
          <input
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder={t("fields.companyPlaceholder")}
            disabled={!canUse}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          type="button"
          loading={generating}
          disabled={generating || !canUse}
          onClick={() => void onGenerate()}
        >
          {t("generateCta")}
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {result ? (
        <div className="mt-6 space-y-4 rounded-xl border border-[#1D9E75]/25 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                {t("result.roleLabel")}
              </p>
              <p className="text-lg font-bold text-[#0D2137]">{result.jobTitleDetected}</p>
              {result.companyDetected ? (
                <p className="text-sm text-[#6B7280]">{result.companyDetected}</p>
              ) : null}
            </div>
            <p className="text-3xl font-extrabold text-[#1D9E75]">
              {t("result.matchScore", { score: String(result.matchScore) })}
            </p>
          </div>

          <p className="text-sm leading-relaxed text-[#374151]">
            {isRtl && result.matchSummaryAr.trim() ? result.matchSummaryAr : result.matchSummary}
          </p>

          {result.keywordsMatched.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-[#0D2137]">{t("result.keywordsMatched")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.keywordsMatched.slice(0, 12).map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-[#E1F5EE] px-2.5 py-1 text-xs font-medium text-[#065f46]"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-gray-100 bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase text-[#6B7280]">{t("result.previewTitle")}</p>
            <p className="mt-2 text-sm font-semibold text-[#0D2137]">
              {result.tailoredDraft.professionalTitle}
            </p>
            <p className="mt-2 line-clamp-4 text-sm text-[#6B7280]">{result.tailoredDraft.summary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-[#0D2137]">
              {t("result.template")}
              <select
                className="ms-2 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                value={template}
                onChange={(e) =>
                  setTemplate(e.target.value as "professional" | "modern" | "creative")
                }
              >
                <option value="professional">Professional</option>
                <option value="modern" disabled={!canAllTemplates}>
                  Modern{!canAllTemplates ? " 🔒" : ""}
                </option>
                <option value="creative" disabled={!canAllTemplates}>
                  Creative{!canAllTemplates ? " 🔒" : ""}
                </option>
              </select>
            </label>
            <Button
              type="button"
              variant="primary"
              loading={downloading}
              disabled={downloading}
              onClick={() => void onDownload(result.tailoredDraft)}
            >
              <FileDown className="me-2 inline h-4 w-4" aria-hidden />
              {t("downloadCta")}
            </Button>
          </div>

          <p className="text-xs text-[#6B7280]">{t("result.separateNote")}</p>
        </div>
      ) : null}

      {!canUse ? (
        <p className="mt-4 text-sm text-[#6B7280]">
          {t("lockedHint")}{" "}
          <Link href="/pricing" className="font-semibold text-brand-teal underline">
            {ts("upgrade")}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
