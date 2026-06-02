"use client";

import { Briefcase, Building2, CheckCircle2, Clock, FileText, Brain } from "lucide-react";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { UserRole } from "@/types";
import { hardNavigate } from "@/lib/auth-redirect";
import { dashboardPathForRole } from "@/lib/subscription";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function OnboardingClient() {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const locale = useLocale();
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
      await update({ onboardingComplete: true });
      const role = String(session.user.role ?? "").toUpperCase();
      const next = dashboardPathForRole(role);
      hardNavigate(next, locale);
    } finally {
      setPending(false);
    }
  }

  if (status === "loading" || !session?.user) {
    return <LoadingSpinner size="full" label={tc("loading")} />;
  }

  const role = String(session.user.role ?? "").toUpperCase();
  const isEmployer = role === UserRole.EMPLOYER;
  const isMentor = role === UserRole.MENTOR;

  function stepCard(icon: React.ReactNode, title: string, body: string, href: string, cta: string) {
    return (
      <div className="rounded-2xl border border-[#EEF2F7] bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#0F4C75]">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-[#0D2137]">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#667085]">{body}</p>
            <Link
              href={href}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0F4C75] hover:underline"
            >
              {cta}
              <span aria-hidden className="rtl:rotate-180">→</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100dvh-68px)] px-4 py-10"
      style={{
        backgroundImage: "radial-gradient(#0F4C7512 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo size="md" priority />
          </div>
          <p className="text-xs font-semibold text-[#6B7280]">{t("progress", { current: 1, total: 3 })}</p>
        </div>

        <div className="mt-10 rounded-3xl bg-white/80 p-6 backdrop-blur-sm sm:p-10">
          {!isMentor ? (
            <>
              <h1 className="text-3xl font-black tracking-tight text-[#0D2137]">
                {isEmployer ? t("titleEmployerNew") : t("titleJobSeekerNew")}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[#667085]">
                {isEmployer ? t("subtitleEmployerNew") : t("subtitleJobSeekerNew")}
              </p>

              <div className="mt-8 grid gap-4">
                {isEmployer ? (
                  <>
                    {stepCard(<Building2 className="h-6 w-6" aria-hidden />, t("emStep1Title"), t("emStep1Body"), "/dashboard/employer/profile", t("emStep1Cta"))}
                    {stepCard(<Briefcase className="h-6 w-6" aria-hidden />, t("emStep2Title"), t("emStep2Body"), "/dashboard/employer/post-job", t("emStep2Cta"))}
                    {stepCard(<CheckCircle2 className="h-6 w-6" aria-hidden />, t("emStep3Title"), t("emStep3Body"), "/dashboard/employer/candidates", t("emStep3Cta"))}
                  </>
                ) : (
                  <>
                    {stepCard(<Briefcase className="h-6 w-6" aria-hidden />, t("jsStep1Title"), t("jsStep1Body"), "/dashboard/job-seeker/profile", t("jsStep1Cta"))}
                    {stepCard(<FileText className="h-6 w-6" aria-hidden />, t("jsStep2Title"), t("jsStep2Body"), "/dashboard/job-seeker/cv-builder", t("jsStep2Cta"))}
                    {stepCard(<Brain className="h-6 w-6" aria-hidden />, t("jsStep3Title"), t("jsStep3Body"), "/dashboard/job-seeker/assessment", t("jsStep3Cta"))}
                  </>
                )}
              </div>

              <div className="mt-8 flex flex-col items-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  className="min-h-11 w-full sm:w-[320px]"
                  loading={pending}
                  disabled={pending}
                  onClick={() => void finish()}
                >
                  {pending ? t("finishing") : t("cta")}
                </Button>

                <button
                  type="button"
                  onClick={() => void finish()}
                  className="text-sm font-semibold text-[#0F4C75] hover:underline"
                >
                  {t("skip")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDF3E3] text-[#C9973A]">
                  <Clock className="h-7 w-7" aria-hidden />
                </span>
                <div>
                  <h1 className="text-2xl font-black text-[#0D2137]">{t("mentorTitle")}</h1>
                  <p className="mt-1 text-sm text-[#667085]">{t("mentorSubtitle")}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#C9973A]/30 bg-[#FDF3E3]/40 p-5">
                <p className="text-sm font-semibold text-[#0D2137]">{t("mentorPendingTitle")}</p>
                <p className="mt-2 text-sm text-[#6B7280]">{t("mentorPendingBody")}</p>
              </div>

              <div className="mt-6 grid gap-3">
                <ChecklistRow text={t("mentorCheck1")} />
                <ChecklistRow text={t("mentorCheck2")} />
                <ChecklistRow text={t("mentorCheck3")} />
                <ChecklistRow text={t("mentorCheck4")} />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/dashboard/mentor/profile"
                  className="flex min-h-11 items-center justify-center rounded-xl bg-[#0F4C75] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0D2137]"
                >
                  {t("mentorProfileCta")}
                </Link>
                <button
                  type="button"
                  onClick={() => void finish()}
                  disabled={pending}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#0D2137] hover:bg-gray-50 disabled:opacity-50"
                >
                  {pending ? t("finishing") : t("mentorDashCta")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EFF6FF] text-[#0F4C75]" aria-hidden>
        ✓
      </span>
      <p className="text-sm text-[#0D2137]">{text}</p>
    </div>
  );
}
