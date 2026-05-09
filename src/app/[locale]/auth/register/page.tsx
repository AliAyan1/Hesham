"use client";

import { useMemo, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import axios from "axios";
import { registerSchema } from "@/lib/validations";
import { BRAND_COLORS } from "@/lib/constants";
import { Logo } from "@/components/ui/Logo";
import { UserRole } from "@/types";
import type { RegisterFormData } from "@/types";
import type { ZodIssue } from "zod";

type FieldErrors = Partial<Record<keyof RegisterFormData, string>>;
type FlowPhase = "role" | "plan" | "account";
type PlanChoice = "free" | "professional" | "premium";

/** Heuristic meter: 0 = weak … 3 = strong (separate from server validation rules). */
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

export default function RegisterPage() {
  const t = useTranslations();
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const isRTL = locale === "ar" || locale === "ur";

  const urlPlan = useMemo(() => {
    const raw = searchParams.get("plan")?.toLowerCase();
    if (raw === "professional" || raw === "premium") return raw as "professional" | "premium";
    return null;
  }, [searchParams]);

  const urlPlanFree = useMemo(
    () => searchParams.get("plan")?.toLowerCase() === "free",
    [searchParams],
  );

  const [phase, setPhase] = useState<FlowPhase>("role");
  /** Plan from the multi-step picker (URL `plan=` takes precedence in `effectiveSignupPlan`). */
  const [pickedPlan, setPickedPlan] = useState<PlanChoice | null>(null);

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

  const pwdMeter = passwordStrengthMeter(formData.password);

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
    if (formData.role === UserRole.EMPLOYER) {
      setPhase("account");
      return;
    }
    if (urlPlan === "professional" || urlPlan === "premium" || urlPlanFree) {
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
    if (
      formData.role === UserRole.EMPLOYER ||
      urlPlan === "professional" ||
      urlPlan === "premium" ||
      urlPlanFree
    ) {
      setPhase("role");
      return;
    }
    setPhase("plan");
  }

  function effectiveSignupPlan(): "professional" | "premium" | undefined {
    if (urlPlan === "professional" || urlPlan === "premium") return urlPlan;
    if (pickedPlan === "professional" || pickedPlan === "premium") return pickedPlan;
    return undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
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
          const p = effectiveSignupPlan();
          await axios.post("/api/auth/register", {
            ...parsed.data,
            ...(p ? { plan: p } : {}),
          });

          const result = await signIn("credentials", {
            email: formData.email,
            password: formData.password,
            redirect: false,
          });

          if (result?.error) {
            setServerError(t("auth.invalidCredentials"));
            return;
          }

          const welcome = effectiveSignupPlan();
          router.push(welcome ? `/dashboard?welcome=${welcome}` : "/dashboard");
          router.refresh();
        } catch (err: unknown) {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            setServerError(t("auth.emailTaken"));
          } else {
            setServerError(t("common.error"));
          }
        }
      });
    } catch {
      setServerError(t("common.error"));
    }
  }

  async function handleGoogleSignIn() {
    try {
      startTransition(async () => {
        try {
          await signIn("google", { callbackUrl: `/${locale}/dashboard` });
        } catch {
          setServerError(t("common.error"));
        }
      });
    } catch {
      setServerError(t("common.error"));
    }
  }

  const strengthText =
    pwdMeter <= 1
      ? tAuth("registerFlow.strengthWeak")
      : pwdMeter === 2
        ? tAuth("registerFlow.strengthFair")
        : tAuth("registerFlow.strengthStrong");

  const strengthBarWidth = pwdMeter <= 1 ? "33%" : pwdMeter === 2 ? "66%" : "100%";

  const roleOptions = [
    { value: UserRole.JOBSEEKER, label: t("auth.jobSeeker") },
    { value: UserRole.EMPLOYER, label: t("auth.employer") },
  ];

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-8"
      style={{ backgroundColor: BRAND_COLORS.primary }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <Logo variant="dark" size="lg" className="max-w-[260px]" priority />
          </div>
          <p className="text-sm text-gray-400">{t("common.slogan")}</p>
        </div>

        <div className="rounded-2xl border border-[#333] bg-[#242424] p-8 shadow-xl">
          {urlPlan === "professional" || urlPlan === "premium" || urlPlanFree ? (
            <div
              className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
                urlPlan === "professional"
                  ? "border-[#1D9E75]/30 bg-[#1D9E75]/10 text-[#A7F3D0]"
                  : urlPlan === "premium"
                    ? "border-[#C9973A]/35 bg-[#C9973A]/10 text-[#FDE68A]"
                    : "border-[#0F4C75]/25 bg-[#EFF6FF] text-[#93C5FD]"
              }`}
              role="status"
            >
              {urlPlan === "professional"
                ? t("subscription.signupProfessionalBanner")
                : urlPlan === "premium"
                  ? t("subscription.signupPremiumBanner")
                  : t("subscription.signupFreeBanner")}
            </div>
          ) : null}
          <h2 className="mb-1 text-xl font-semibold text-white">{t("auth.register")}</h2>
          <p className="mb-6 text-sm text-gray-400">{t("auth.subtitleRegister")}</p>

          <div className="mb-5 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            <span className={phase === "role" ? "text-brand-teal" : ""}>1 · {tAuth("registerFlow.roleTitle")}</span>
            {formData.role === UserRole.JOBSEEKER && !urlPlan && !urlPlanFree ? (
              <span className={phase === "plan" ? "text-brand-teal" : ""}>2 · {tAuth("registerFlow.planTitle")}</span>
            ) : null}
            <span className={phase === "account" ? "text-brand-teal" : ""}>3 · {tAuth("registerFlow.accountTitle")}</span>
          </div>

          {serverError ? (
            <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-400">{serverError}</div>
          ) : null}

          {phase === "role" ? (
            <div className="space-y-5">
              <p className="text-center text-lg font-semibold text-white">{tAuth("registerFlow.roleTitle")}</p>
              <div className="grid gap-3">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleRoleSelect(opt.value)}
                    className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                      formData.role === opt.value
                        ? "border-brand-teal bg-brand-lightTeal text-brand-teal"
                        : "border-[#444] text-gray-200 hover:border-[#666]"
                    }`}
                  >
                    <span className="font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={continueFromRole}
                className="w-full rounded-lg py-3 font-semibold text-white hover:opacity-90"
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
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => pickPlan("professional")}
                  className="rounded-xl border border-[#1D9E75]/40 bg-[#1D9E75]/15 py-3 text-sm font-bold text-[#A7F3D0]"
                >
                  {tAuth("registerFlow.planProfessional")}
                </button>
                <button
                  type="button"
                  onClick={() => pickPlan("premium")}
                  className="rounded-xl border border-[#C9973A]/35 bg-[#C9973A]/12 py-3 text-sm font-bold text-[#FDE68A]"
                >
                  {tAuth("registerFlow.planPremium")}
                </button>
                <button
                  type="button"
                  onClick={() => pickPlan("free")}
                  className="rounded-xl border border-[#444] py-3 text-sm font-semibold text-gray-300 hover:border-[#666]"
                >
                  {tAuth("registerFlow.planFree")}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPhase("role")}
                className="w-full text-sm text-gray-400 hover:text-white"
              >
                {t("common.back")}
              </button>
            </div>
          ) : null}

          {phase === "account" ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <p className="text-center text-sm font-semibold text-white">{tAuth("registerFlow.accountTitle")}</p>
              <button type="button" onClick={backFromAccount} className="text-xs text-gray-400 hover:text-white">
                ← {t("common.back")}
              </button>

              <div>
                <label className="mb-1 block text-sm text-gray-300">{t("auth.name")}</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isPending}
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
                {isPending ? t("auth.creatingAccount") : t("auth.register")}
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#333]" />
                <span className="text-xs text-gray-500">{t("auth.orContinueWith")}</span>
                <div className="h-px flex-1 bg-[#333]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#444] py-2.5 font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
              >
                <GoogleIcon />
                {t("auth.loginWithGoogle")}
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
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
