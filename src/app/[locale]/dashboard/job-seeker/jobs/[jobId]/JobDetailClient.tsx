"use client";

import { Share2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import {
  experienceLevelLabel,
  formatJobSalaryLine,
  parseHiringMeta,
} from "@/lib/jobs/job-detail-display";

type JobEnvelope = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

function DetailFact({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[#0D2137]">{value}</dd>
    </div>
  );
}

export function JobDetailClient({ jobId }: { jobId: string }) {
  const t = useTranslations("jobs");
  const tc = useTranslations("common");
  const dash = useTranslations("dashboard");
  const tp = useTranslations("profile");
  const router = useRouter();
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";

  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [similar, setSimilar] = useState<
    Array<{ id: string; title: string; companyName: string; category: string }>
  >([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [applyOpen, setApplyOpen] = useState(false);
  const [cover, setCover] = useState("");
  const [applyState, setApplyState] = useState<
    "idle" | "pending" | "success" | "dup" | "fail" | "needAssessment" | "talentPoolBlocked"
  >(
    "idle",
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let ac = false;
    void (async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { credentials: "include" });
        const json = (await res.json()) as JobEnvelope;
        if (!res.ok || !json.data) {
          setStatus("error");
          return;
        }
        if (!ac) {
          setJob(json.data);
          setStatus("ready");
          const cat =
            typeof json.data.category === "string" ? json.data.category : "";
          if (cat) {
            const s = await fetch(
              `/api/jobs?category=${encodeURIComponent(cat)}&pageSize=4&page=1`,
              { credentials: "include" },
            );
            const list = (await s.json()) as {
              items?: Array<{ id: string; title: string; category: string; companyName: string }>;
            };
            const items = (list.items ?? []).filter((x) => x.id !== jobId).slice(0, 3);
            if (!ac) setSimilar(items);
          }
        }
      } catch {
        if (!ac) setStatus("error");
      }
    })();
    return () => {
      ac = true;
    };
  }, [jobId]);

  async function submitApply() {
    setApplyState("pending");
    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, coverLetter: cover.trim() || undefined }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.status === 409 || json.error === "already_applied") {
        setApplyState("dup");
        return;
      }
      if (res.status === 403 && json.error === "assessment_required") {
        setApplyState("needAssessment");
        return;
      }
      if (res.status === 403 && json.error === "talent_pool_blocked") {
        setApplyState("talentPoolBlocked");
        return;
      }
      if (!res.ok || !json.success) {
        setApplyState("fail");
        return;
      }
      setApplyState("success");
    } catch {
      setApplyState("fail");
    }
  }

  async function toggleSave() {
    const next = !saved;
    try {
      const res = await fetch("/api/jobs/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, saved: next }),
      });
      if (res.ok) setSaved(next);
    } catch {
      /* ignore */
    }
  }

  function share() {
    void navigator.clipboard.writeText(window.location.href);
  }

  if (status === "loading") {
    return <LoadingSpinner size="full" label={tc("loading")} />;
  }

  if (status === "error" || !job) {
    return <ErrorState title={dash("dashboardLoadError")} retryLabel={tc("retry")} onRetry={() => router.refresh()} />;
  }

  const title =
    isRtl && typeof job.titleAr === "string" && job.titleAr.trim()
      ? job.titleAr
      : String(job.title ?? "");
  const description =
    isRtl && typeof job.descriptionAr === "string" && job.descriptionAr.trim()
      ? job.descriptionAr
      : String(job.description ?? "");
  const companyName = String(job.companyName ?? "");
  const category = String(job.category ?? "");
  const categoryLabel = category
    ? t(`marketplaceCategories.${category}` as never)
    : "";
  const locationRaw =
    isRtl && typeof job.locationAr === "string" && job.locationAr.trim()
      ? job.locationAr
      : job.location == null
        ? ""
        : String(job.location);
  const isRemote = Boolean(job.isRemote);
  const jobType = String(job.type ?? "FULLTIME");
  const typeLabel = t(`jobTypes.${jobType.toLowerCase()}` as never);
  const currency = String(job.currency ?? "SAR");
  const salaryMin = typeof job.salaryMin === "number" ? job.salaryMin : null;
  const salaryMax = typeof job.salaryMax === "number" ? job.salaryMax : null;
  const salaryLine = formatJobSalaryLine({
    salaryMin,
    salaryMax,
    currency,
    notListed: t("salaryNotListed"),
    range: (min, max, cur) => t("publicSalary", { min, max, currency: cur }),
    upTo: (max, cur) => t("publicSalarySingle", { max, currency: cur }),
    from: (min, cur) => t("salaryFrom", { min, currency: cur }),
  });
  const locationDisplay =
    isRemote || !locationRaw.trim()
      ? locationRaw.trim()
        ? `${t("jobTypes.remote")} · ${locationRaw}`
        : t("jobTypes.remote")
      : locationRaw;
  const hiringMeta = parseHiringMeta(job.hiringMeta);
  const expLabels: Record<string, string> = {
    ENTRY: t("postWizard.expEntry"),
    MID: t("postWizard.expMid"),
    SENIOR: t("postWizard.expSenior"),
    LEAD: t("postWizard.expLead"),
  };
  const experienceLine = hiringMeta?.experienceLevel
    ? experienceLevelLabel(hiringMeta.experienceLevel, expLabels)
    : "";
  const yearsLine =
    hiringMeta?.yearsExperience != null
      ? t("yearsRequired", { count: hiringMeta.yearsExperience })
      : "";
  const educationLine = hiringMeta?.educationRequirement ?? "";
  const employer = job.employer as Record<string, unknown> | undefined;
  const employerProfile = employer?.employerProfile as Record<string, unknown> | undefined;
  const industry =
    typeof employerProfile?.industry === "string" ? employerProfile.industry.trim() : "";
  const logoUrl = typeof employerProfile?.logoUrl === "string" ? employerProfile.logoUrl : null;
  const postedAt =
    typeof job.createdAt === "string"
      ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(job.createdAt))
      : "";
  const requirements = asStringArray(job.requirements);
  const benefits = asStringArray(job.benefits);
  const skills = asStringArray(job.skills);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]" dir={isRtl ? "rtl" : "ltr"}>
      <div className="space-y-8">
        <header className="rounded-[14px] border border-[#EEF2F7] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full border border-[#EEF2F7] object-cover"
              />
            ) : (
              <InitialsAvatar name={companyName} email={companyName || "co"} size="md" className="!h-12 !w-12" />
            )}
            <div className="min-w-0 flex-1">
              {categoryLabel ? (
                <Badge size="sm" variant="teal" className="mb-2">
                  {categoryLabel}
                </Badge>
              ) : null}
              <h1 className="text-2xl font-extrabold text-[#0D2137] md:text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                {companyName ? (
                  <span className="font-medium text-[#374151]">
                    {t("companyLabel")}: {companyName}
                  </span>
                ) : null}
                {companyName && (typeLabel || locationDisplay) ? <span className="mx-2">·</span> : null}
                {[typeLabel, locationDisplay].filter(Boolean).join(" · ")}
              </p>
              {salaryLine ? (
                <p className="mt-1 text-sm font-semibold text-[#0D2137]">{salaryLine}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              type="button"
              className="min-h-11 font-semibold"
              onClick={() => setApplyOpen(true)}
            >
              {t("apply")}
            </Button>
            <Button variant="outline" type="button" className="min-h-11 font-semibold" onClick={() => void toggleSave()}>
              {saved ? t("saved") : t("save")}
            </Button>
            <Button variant="ghost" type="button" className="min-h-11 gap-2 font-semibold" onClick={share}>
              <Share2 className="h-4 w-4" aria-hidden />
              {t("share")}
            </Button>
          </div>
        </header>

        <section
          aria-labelledby="jd-overview"
          className="rounded-[14px] border border-[#EEF2F7] bg-white p-6 shadow-sm"
        >
          <h2 id="jd-overview" className="text-lg font-bold text-[#0D2137]">
            {t("detailOverview")}
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailFact label={t("companyLabel")} value={companyName} />
            <DetailFact label={t("detailJobType")} value={typeLabel} />
            <DetailFact label={t("detailLocation")} value={locationDisplay} />
            <DetailFact label={t("detailSalary")} value={salaryLine} />
            <DetailFact label={t("detailExperience")} value={experienceLine} />
            <DetailFact label={t("detailYears")} value={yearsLine} />
            <DetailFact label={t("detailEducation")} value={educationLine} />
            <DetailFact label={t("detailIndustry")} value={industry} />
            <DetailFact label={t("detailPosted")} value={postedAt} />
          </dl>
        </section>

        <section aria-labelledby="jd-desc" className="rounded-[14px] border border-[#EEF2F7] bg-white p-6 shadow-sm">
          <h2 id="jd-desc" className="text-lg font-bold text-[#0D2137]">
            {t("description")}
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#374151]">{description}</p>
        </section>

        {requirements.length ? (
          <section className="rounded-[14px] border border-[#EEF2F7] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#0D2137]">{t("requirements")}</h2>
            <ul className="mt-4 list-disc space-y-2 ps-5 text-sm text-[#374151]">
              {requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {benefits.length ? (
          <section className="rounded-[14px] border border-[#EEF2F7] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#0D2137]">{t("benefits")}</h2>
            <ul className="mt-4 list-disc space-y-2 ps-5 text-sm text-[#374151]">
              {benefits.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {skills.length ? (
          <section className="rounded-[14px] border border-[#EEF2F7] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#0D2137]">{tp("skills")}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map((s) => (
                <Badge key={s} variant="neutral" size="sm">
                  {s}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <aside className="space-y-4">
        <div className="rounded-[14px] border border-[#EEF2F7] bg-white p-4 shadow-sm">
          <h3 className="font-bold text-[#0D2137]">{t("similarJobs")}</h3>
          <ul className="mt-3 space-y-3">
            {similar.map((s) => (
              <li key={s.id}>
                <Link href={`/dashboard/job-seeker/jobs/${s.id}`} className="block text-sm font-semibold text-brand-teal hover:underline">
                  {s.title}
                </Link>
                <p className="text-xs text-[#6B7280]">{s.companyName}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {applyOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#0D2137]">{t("apply")}</h3>
            <p className="mt-2 text-sm text-[#6B7280]">{title}</p>

            <label className="mt-4 block text-sm font-medium text-[#374151]">{t("coverLetterPlaceholder")}</label>
            <textarea
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              rows={6}
              className="mt-2 w-full rounded-lg border border-[#E5E7EB] p-3 text-sm outline-none ring-brand-teal/30 focus-visible:ring-2"
            />

            {applyState === "success" ? (
              <p className="mt-3 text-sm font-semibold text-brand-teal">{t("applySuccess")}</p>
            ) : null}
            {applyState === "dup" ? (
              <p className="mt-3 text-sm font-semibold text-amber-700">{t("alreadyApplied")}</p>
            ) : null}
            {applyState === "needAssessment" ? (
              <p className="mt-3 text-sm font-semibold text-amber-800">
                {t("applyNeedAssessment")}{" "}
                <Link href="/dashboard/job-seeker/assessment" className="text-brand-teal underline">
                  {t("goToAssessment")}
                </Link>
              </p>
            ) : null}
            {applyState === "talentPoolBlocked" ? (
              <p className="mt-3 text-sm font-semibold text-amber-800">
                {t("applyTalentPoolBlocked")}{" "}
                <Link href="/dashboard/job-seeker/invites" className="text-brand-teal underline">
                  {t("viewInvites")}
                </Link>
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" type="button" className="min-h-11" onClick={() => setApplyOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button
                variant="secondary"
                type="button"
                className="min-h-11"
                loading={applyState === "pending"}
                disabled={applyState === "success"}
                onClick={() => void submitApply()}
              >
                {t("submitApplication")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
