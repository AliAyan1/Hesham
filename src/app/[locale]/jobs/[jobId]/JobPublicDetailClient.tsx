"use client";

import axios from "axios";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function asStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  return [];
}

type JobPayload = {
  id: string;
  title: string;
  titleAr: string | null;
  description: string;
  descriptionAr: string | null;
  category: string;
  type: string;
  location: string | null;
  locationAr: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  requirements: unknown;
  benefits: unknown;
  companyName?: string;
};

export function JobPublicDetailClient() {
  const params = useParams();
  const jobId = typeof params?.jobId === "string" ? params.jobId : "";
  const locale = useLocale();
  const isRTL = locale === "ar" || locale === "ur";
  const tJobs = useTranslations("jobs");
  const tc = useTranslations("common");
  const { data: session } = useSession();

  const [job, setJob] = useState<JobPayload | null>(null);
  const [load, setLoad] = useState<"loading" | "ok" | "err">("loading");

  useEffect(() => {
    let cancel = false;
    setLoad("loading");
    void axios
      .get<{ success: boolean; data: JobPayload }>(`/api/jobs/${encodeURIComponent(jobId)}`)
      .then((res) => {
        if (cancel) return;
        if (res.data.success && res.data.data) {
          setJob(res.data.data);
          setLoad("ok");
        } else setLoad("err");
      })
      .catch(() => {
        if (!cancel) setLoad("err");
      });
    return () => {
      cancel = true;
    };
  }, [jobId]);

  if (load === "loading") return <LoadingSpinner size="full" label={tc("loading")} />;
  if (load === "err" || !job)
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
        <p className="font-semibold text-[#0D2137]">{tc("noResults")}</p>
        <Link href="/jobs" className="mt-4 inline-block text-brand-teal hover:underline">
          {tJobs("browse")}
        </Link>
      </div>
    );

  const title = isRTL && job.titleAr?.trim() ? job.titleAr : job.title;
  const description = isRTL && job.descriptionAr?.trim() ? job.descriptionAr : job.description;
  const loc =
    job.isRemote || !job.location?.trim()
      ? tJobs("postWizard.remoteSummary")
      : isRTL && job.locationAr?.trim()
        ? job.locationAr
        : job.location ?? tJobs("postWizard.remoteSummary");

  const requirements = asStringArray(job.requirements);
  const benefits = asStringArray(job.benefits);

  const currency = job.currency ?? "SAR";
  let salaryLine: string | null = null;
  if (job.salaryMin != null && job.salaryMax != null) {
    salaryLine = tJobs("publicSalary", {
      min: job.salaryMin,
      max: job.salaryMax,
      currency,
    });
  } else if (job.salaryMax != null) {
    salaryLine = tJobs("publicSalarySingle", { max: job.salaryMax, currency });
  }

  const categoryLabel = tJobs(`marketplaceCategories.${job.category}` as never);
  const typeLabel = tJobs(`jobTypes.${String(job.type).toLowerCase()}` as never);

  const applyTarget =
    session?.user?.role === "JOBSEEKER"
      ? `/dashboard/job-seeker/jobs/${job.id}`
      : `/auth/login?callbackUrl=${encodeURIComponent(`/${locale}/dashboard/job-seeker/jobs/${job.id}`)}`;

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
      <header className="border-b border-gray-100 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-teal">{categoryLabel}</p>
        <h1 className="mt-2 text-3xl font-black text-[#0D2137]">{title}</h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          {job.companyName ? (
            <>
              <span className="font-medium text-[#374151]">{tJobs("companyLabel")}: {job.companyName}</span>
              <span className="mx-2">·</span>
            </>
          ) : null}
          {typeLabel} · {loc}
        </p>
        {salaryLine ? <p className="mt-2 text-sm font-semibold text-[#0D2137]">{salaryLine}</p> : null}
      </header>

      <div className="prose prose-sm mt-6 max-w-none whitespace-pre-wrap text-[#374151]">{description}</div>

      {requirements.length ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-[#0D2137]">{tJobs("requirements")}</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#374151]">
            {requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {benefits.length ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-[#0D2137]">{tJobs("benefits")}</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#374151]">
            {benefits.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={applyTarget}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-semibold text-white hover:bg-brand-darkTeal"
        >
          {session?.user?.role === "JOBSEEKER" ? tJobs("publicApplyDashboard") : tJobs("publicLoginToApply")}
        </Link>
        <Link
          href="/jobs"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-brand-blue px-6 text-sm font-medium text-brand-blue hover:bg-brand-lightBlue"
        >
          {tJobs("browse")}
        </Link>
      </div>
    </article>
  );
}
