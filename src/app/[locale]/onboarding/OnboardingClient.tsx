"use client";

import { Briefcase, Building2, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { UserRole } from "@/types";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function OnboardingClient() {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [pending, setPending] = useState(false);

  async function finish() {
    if (!session?.user) return;
    setPending(true);
    try {
      const res = await fetch("/api/profile/onboarding", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        return;
      }
      await update();
      const role = session.user.role;
      const next =
        role === UserRole.EMPLOYER
          ? "/dashboard/employer"
          : role === UserRole.ADMIN
            ? "/dashboard/admin"
            : "/dashboard/job-seeker";
      router.push(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (status === "loading" || !session?.user) {
    return <LoadingSpinner size="full" label={tc("loading")} />;
  }

  const isEmployer = session.user.role === UserRole.EMPLOYER;

  function stepRow(text: string, href: string) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-[#EEF2F7] bg-white px-4 py-3 shadow-sm">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-brand-teal" aria-hidden />
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="text-sm font-semibold text-[#0D2137] underline-offset-4 hover:text-brand-teal hover:underline"
          >
            {text}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-10 px-4 py-14">
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" priority />
        </div>
        <div className="mb-6 flex justify-center">
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-brand-lightTeal text-brand-teal">
            {isEmployer ? <Building2 className="h-10 w-10" aria-hidden /> : <Briefcase className="h-10 w-10" />}
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0D2137]">
          {isEmployer ? t("titleEmployer") : t("titleJobSeeker")}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#667085]">
          {isEmployer ? t("subtitleEmployer") : t("subtitleJobSeeker")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {!isEmployer ? (
          <>
            {stepRow(t("stepJsProfile"), "/dashboard/job-seeker/profile")}
            {stepRow(t("stepJsCv"), "/dashboard/job-seeker/cv-builder")}
            {stepRow(t("stepJsJobs"), "/dashboard/job-seeker/jobs")}
            {stepRow(t("stepJsAssessment"), "/dashboard/job-seeker/assessment")}
          </>
        ) : (
          <>
            {stepRow(t("stepEmProfile"), "/dashboard/employer/profile")}
            {stepRow(t("stepEmPost"), "/dashboard/employer/post-job")}
            {stepRow(t("stepEmCandidates"), "/dashboard/employer/candidates")}
          </>
        )}
      </div>

      <div className="flex flex-wrap justify-center">
        <Button
          type="button"
          variant="primary"
          className="min-h-11 min-w-[220px]"
          loading={pending}
          disabled={pending}
          onClick={() => void finish()}
        >
          {pending ? t("finishing") : t("cta")}
        </Button>
      </div>
    </div>
  );
}
