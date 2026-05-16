"use client";

import { Briefcase, Building2, Check, Crown, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import axios from "axios";
import { registerSchema } from "@/lib/validations";
import { BRAND_COLORS } from "@/lib/constants";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { UserRole } from "@/types";
import type { RegisterFormData } from "@/types";
import { dashboardPathForRole } from "@/lib/subscription";
import { hrefUpgradePremium, hrefUpgradeProfessional } from "@/lib/i18n-hrefs";
import type { ZodIssue } from "zod";

type FieldErrors = Partial<Record<keyof RegisterFormData, string>>;
type FlowPhase = "role" | "plan" | "account";
type PlanChoice = "free" | "professional" | "premium";

function passwordStrengthMeter(password: string): 0 | 1 | 2 | 3 {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else if (/[A-Za-z]/.test(password)) score += 0.5;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score >= 5) return 3;
  if (score >= 3.5) return 2;
  if (score >= 2) return 1;
  return password.length === 0 ? 0 : 1;
}

function planFromUrl(raw: string | null): PlanChoice | null {
  const v = raw?.toLowerCase();
  if (v === "free" || v === "professional" || v === "premium") return v;
  return null;
}

export default function RegisterPage() {
  const t = useTranslations();
  const tAuth = useTranslations("auth");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const isRTL = locale === "ar" || locale === "ur";
  const { data: session, status: sessionStatus } = useSession();

  const urlPlan = useMemo(() => planFromUrl(searchParams.get("plan")), [searchParams]);

  /** If `/api/auth/session` never resolves (network / dev HMR), unblock the register UI. */
  const [sessionFetchTimedOut, setSessionFetchTimedOut] = useState(false);
  useEffect(() => {
    if (sessionStatus !== "loading") {
      setSessionFetchTimedOut(false);
      return;
    }
    const id = window.setTimeout(() => setSessionFetchTimedOut(true), 6000);
    return () => {
      window.clearTimeout(id);
      setSessionFetchTimedOut(false);
    };
  }, [sessionStatus]);

  const loggedInReady =
    sessionStatus === "authenticated" &&
    session?.user != null &&
    typeof session.user.id === "string" &&
    session.user.id.trim().length > 0;

  useEffect(() => {
    if (!loggedInReady || !session?.user) return;
    if (urlPlan === "professional") {
      router.replace(hrefUpgradeProfessional);
      return;
    }
    if (urlPlan === "premium") {
      router.replace(hrefUpgradePremium);
      return;
    }
    /** Free / no plan: do not auto-send to dashboard — a stale JWT hits middleware and bounces to login. */
  }, [loggedInReady, session?.user, urlPlan, router]);

  const registerReturnUrl = useMemo(() => {
    const qs = searchParams.toString();
    return `/${locale}/auth/register${qs ? `?${qs}` : ""}`;
  }, [locale, searchParams]);

  const redirectingToPaidUpgrade =
    loggedInReady && (urlPlan === "professional" || urlPlan === "premium");

  const showSignedInFreeChoice =
    loggedInReady && (urlPlan === "free" || urlPlan === null);

  const [phase, setPhase] = useState<FlowPhase>("role");
  const [pickedPlan, setPickedPlan] = useState<PlanChoice | null>(urlPlan);
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: UserRole.JOBSEEKER,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (urlPlan) {
      setPickedPlan(urlPlan);
    }
  }, [urlPlan]);

  const pwdMeter = passwordStrengthMeter(formData.password);

  const stepIndex = phase === "role" ? 1 : phase === "plan" ? 2 : 3;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError(null);
  }

  function handleRoleSelect(role: UserRole) {
    setFormData((prev) => ({ ...prev, role }));
    setServerError(null);
  }

  function continueFromRole() {
    if (urlPlan) {
      setPickedPlan(urlPlan);
      setPhase("account");
      return;
    }
    setPhase("plan");
  }

  function pickPlan(next: PlanChoice) {
    setPickedPlan(next);
    setPhase("account");
  }

  function backFromAccount() {
    setServerError(null);
    setFieldErrors({});
    setPhase(urlPlan ? "role" : "plan");
  }

  function backFromPlan() {
    setServerError(null);
    setPhase("role");
  }

  function resolvedPlan(): PlanChoice {
    return pickedPlan ?? urlPlan ?? "free";
  }

  const signupPlanBanner = resolvedPlan();

  const canUseGoogleSignup =
    formData.role === UserRole.JOBSEEKER && resolvedPlan() === "free";

  async function handleGoogleRegister() {
    startTransition(async () => {
      try {
        await signIn("google", { callbackUrl: `/${locale}/onboarding` });
      } catch {
        setServerError(t("common.error"));
      }
    });
  }

  if (sessionStatus === "loading" && !sessionFetchTimedOut) {
    return (
      <AuthShell isRtl={isRTL} slogan={t("common.slogan")}>
        <p className="py-12 text-center text-sm text-gray-400">{t("common.loading")}</p>
      </AuthShell>
    );
  }

  if (redirectingToPaidUpgrade) {
    return (
      <AuthShell isRtl={isRTL} slogan={t("common.slogan")}>
        <p className="py-12 text-center text-sm text-gray-400">{t("common.loading")}</p>
      </AuthShell>
    );
  }

  if (showSignedInFreeChoice && session?.user) {
    const role = (session.user.role as UserRole | undefined) ?? UserRole.JOBSEEKER;
    const dash = dashboardPathForRole(role);
    return (
      <AuthShell isRtl={isRTL} slogan={t("common.slogan")}>
        <p className="text-center text-sm leading-relaxed text-gray-300">
          {tAuth("registerFlow.signedInFreePlanHint")}
        </p>
        <Link
          href={dash}
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: BRAND_COLORS.accent }}
        >
          {tAuth("registerFlow.goToDashboard")}
        </Link>
        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-gray-400 underline decoration-gray-500 underline-offset-4 hover:text-white"
          onClick={() => void signOut({ callbackUrl: registerReturnUrl })}
        >
          {tNav("logout")}
        </button>
      </AuthShell>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = registerSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      parsed.error.issues.forEach((err: ZodIssue) => {
        const field = err.path[0] as keyof RegisterFormData;
        errors[field] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      try {
        const plan = resolvedPlan();
        await axios.post("/api/auth/register", {
          ...parsed.data,
          plan,
        });

        const result = await signIn("credentials", {
          email: parsed.data.email,
          password: parsed.data.password,
          redirect: false,
        });

        if (result?.error) {
          setServerError(t("auth.invalidCredentials"));
          return;
        }

        router.push("/onboarding");
        router.refresh();
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          setServerError(t("auth.emailTaken"));
        } else {
          setServerError(t("common.error"));
        }
      }
    });
  }

  const strengthText =
    pwdMeter <= 1
      ? tAuth("registerFlow.strengthWeak")
      : pwdMeter === 2
        ? tAuth("registerFlow.strengthFair")
        : tAuth("registerFlow.strengthStrong");

  const strengthBarWidth = pwdMeter <= 1 ? "33%" : pwdMeter === 2 ? "66%" : "100%";

  const roleCards = [
    {
      value: UserRole.JOBSEEKER,
      label: t("auth.jobSeeker"),
      hint: tAuth("registerFlow.roleJobSeekerHint"),
      Icon: Briefcase,
    },
    {
      value: UserRole.EMPLOYER,
      label: t("auth.employer"),
      hint: tAuth("registerFlow.roleEmployerHint"),
      Icon: Building2,
    },
  ];

  const planCards: {
    id: PlanChoice;
    label: string;
    hint: string;
    Icon: typeof Sparkles;
    className: string;
  }[] = [
    {
      id: "free",
      label: tAuth("registerFlow.planFree"),
      hint: tAuth("registerFlow.planFreeHint"),
      Icon: Check,
      className: "border-[#0F4C75]/40 bg-[#EFF6FF]/10 text-[#93C5FD]",
    },
    {
      id: "professional",
      label: tAuth("registerFlow.planProfessional"),
      hint: tAuth("registerFlow.planProfessionalHint"),
      Icon: Sparkles,
      className: "border-[#1D9E75]/40 bg-[#1D9E75]/15 text-[#A7F3D0]",
    },
    {
      id: "premium",
      label: tAuth("registerFlow.planPremium"),
      hint: tAuth("registerFlow.planPremiumHint"),
      Icon: Crown,
      className: "border-[#C9973A]/35 bg-[#C9973A]/12 text-[#FDE68A]",
    },
  ];

  return (
    <AuthShell isRtl={isRTL} slogan={t("common.slogan")}>
      <div
        className="mb-6 flex gap-1"
        role="progressbar"
        aria-valuenow={stepIndex}
        aria-valuemin={1}
        aria-valuemax={3}
      >
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${
              n <= stepIndex ? "bg-brand-teal" : "bg-[#444]"
            }`}
          />
        ))}
      </div>

      <h2 className="mb-1 text-xl font-semibold text-white">{t("auth.register")}</h2>
      <p className="mb-6 text-sm text-gray-400">{t("auth.subtitleRegister")}</p>

      <div className="mb-5 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
        <span className={phase === "role" ? "text-brand-teal" : ""}>
          1 · {tAuth("registerFlow.roleTitle")}
        </span>
        <span className={phase === "plan" ? "text-brand-teal" : ""}>
          2 · {tAuth("registerFlow.planTitle")}
        </span>
        <span className={phase === "account" ? "text-brand-teal" : ""}>
          3 · {tAuth("registerFlow.accountTitle")}
        </span>
      </div>

      {serverError ? (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-400">
          {serverError}
        </div>
      ) : null}

      {phase === "role" ? (
        <div className="space-y-5">
          <p className="text-center text-lg font-semibold text-white">{tAuth("registerFlow.roleTitle")}</p>
          <p className="text-center text-sm text-gray-400">{tAuth("registerFlow.roleSubtitle")}</p>
          <div className="grid gap-3">
            {roleCards.map(({ value, label, hint, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRoleSelect(value)}
                className={`flex items-start gap-4 rounded-xl border px-4 py-4 text-left transition-all ${
                  formData.role === value
                    ? "border-brand-teal bg-brand-lightTeal/20 ring-1 ring-brand-teal"
                    : "border-[#444] text-gray-200 hover:border-[#666]"
                }`}
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#333] text-brand-teal">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-bold text-white">{label}</span>
                  <span className="mt-1 block text-xs text-gray-400">{hint}</span>
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={continueFromRole}
            className="w-full rounded-lg py-3 font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: BRAND_COLORS.accent }}
          >
            {tAuth("registerFlow.continue")}
          </button>
        </div>
      ) : null}

      {phase === "plan" ? (
        <div className="space-y-4">
          <p className="text-center text-lg font-semibold text-white">{tAuth("registerFlow.planTitle")}</p>
          <p className="text-center text-sm text-gray-400">{tAuth("registerFlow.planSubtitle")}</p>
          <p className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-2 text-center text-xs text-emerald-300">
            {tAuth("registerFlow.noPaymentNow")}
          </p>
          <div className="grid gap-2">
            {planCards.map(({ id, label, hint, Icon, className }) => (
              <button
                key={id}
                type="button"
                onClick={() => pickPlan(id)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-opacity hover:opacity-95 ${className}`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span>
                  <span className="block text-sm font-bold">{label}</span>
                  <span className="block text-xs opacity-80">{hint}</span>
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={backFromPlan}
            className="w-full text-sm text-gray-400 hover:text-white"
          >
            ← {t("common.back")}
          </button>
        </div>
      ) : null}

      {phase === "account" ? (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
              signupPlanBanner === "professional"
                ? "border-[#1D9E75]/30 bg-[#1D9E75]/10 text-[#A7F3D0]"
                : signupPlanBanner === "premium"
                  ? "border-[#C9973A]/35 bg-[#C9973A]/10 text-[#FDE68A]"
                  : "border-[#0F4C75]/25 bg-[#EFF6FF]/10 text-[#93C5FD]"
            }`}
            role="status"
          >
            {signupPlanBanner === "professional"
              ? t("subscription.signupProfessionalBanner")
              : signupPlanBanner === "premium"
                ? t("subscription.signupPremiumBanner")
                : t("subscription.signupFreeBanner")}
          </div>

          <p className="text-center text-sm font-semibold text-white">
            {formData.role === UserRole.EMPLOYER
              ? tAuth("registerFlow.accountTitleEmployer")
              : tAuth("registerFlow.accountTitle")}
          </p>
          <button type="button" onClick={backFromAccount} className="text-xs text-gray-400 hover:text-white">
            ← {t("common.back")}
          </button>

          {canUseGoogleSignup ? (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#333]" />
                <span className="text-xs text-gray-500">{t("auth.orContinueWith")}</span>
                <div className="h-px flex-1 bg-[#333]" />
              </div>
              <button
                type="button"
                onClick={() => void handleGoogleRegister()}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#444] py-2.5 font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
              >
                <GoogleIcon />
                {t("auth.loginWithGoogle")}
              </button>
            </>
          ) : null}

          <div>
            <label className="mb-1 block text-sm text-gray-300">{t("auth.name")}</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={isPending}
              autoComplete="name"
              className="w-full rounded-lg border border-[#444] bg-brand-primary px-4 py-2.5 text-white placeholder-gray-600 transition-colors focus:border-brand-accent focus:outline-none disabled:opacity-50"
              placeholder={t("auth.placeholderName")}
            />
            {fieldErrors.name ? <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">{t("auth.email")}</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isPending}
              autoComplete="email"
              className="w-full rounded-lg border border-[#444] bg-brand-primary px-4 py-2.5 text-white placeholder-gray-600 transition-colors focus:border-brand-accent focus:outline-none disabled:opacity-50"
              placeholder={t("auth.placeholderEmail")}
            />
            {fieldErrors.email ? <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">{t("auth.password")}</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={isPending}
              autoComplete="new-password"
              className="w-full rounded-lg border border-[#444] bg-brand-primary px-4 py-2.5 text-white placeholder-gray-600 transition-colors focus:border-brand-accent focus:outline-none disabled:opacity-50"
              placeholder={t("auth.placeholderPasswordRule")}
            />
            {formData.password ? (
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-[11px] text-gray-400">
                  <span>{tAuth("registerFlow.passwordStrength")}</span>
                  <span className="text-brand-teal">{strengthText}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#333]">
                  <div
                    className="h-full rounded-full bg-brand-teal transition-all"
                    style={{ width: strengthBarWidth }}
                  />
                </div>
              </div>
            ) : null}
            {fieldErrors.password ? <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">{t("auth.confirmPassword")}</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isPending}
              autoComplete="new-password"
              className="w-full rounded-lg border border-[#444] bg-brand-primary px-4 py-2.5 text-white placeholder-gray-600 transition-colors focus:border-brand-accent focus:outline-none disabled:opacity-50"
              placeholder={t("auth.placeholderConfirmPassword")}
            />
            {fieldErrors.confirmPassword ? (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.confirmPassword}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-lg py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: BRAND_COLORS.accent }}
          >
            {isPending ? t("auth.creatingAccount") : tAuth("registerFlow.createAndGo")}
          </button>

          <p className="mt-6 text-center text-sm text-gray-400">
            {t("auth.hasAccount")}{" "}
            <Link
              href="/auth/login"
              className="font-medium hover:underline"
              style={{ color: BRAND_COLORS.accent }}
            >
              {t("auth.login")}
            </Link>
          </p>
        </form>
      ) : null}
    </AuthShell>
  );
}
