"use client";

import { useState, useTransition, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { signInWithGoogle } from "@/lib/google-oauth";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { loginSchema } from "@/lib/validations";
import { BRAND_COLORS } from "@/lib/constants";
import { AuthShell } from "@/components/auth/AuthShell";
import { ClientHydrationGate } from "@/components/ui/ClientHydrationGate";
import { ClearSessionButton } from "@/components/auth/ClearSessionButton";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { fetchPostAuthPath, hardNavigate, markOnboardingComplete } from "@/lib/auth-redirect";
import { dashboardPathForRole } from "@/lib/subscription";
import type { LoginFormData } from "@/types";
import type { ZodIssue } from "zod";

/** Same-origin only; strip locale prefix for next-intl `router.push`. */
function intlPathFromCallback(raw: string | null, locale: string): string | undefined {
  if (!raw?.trim()) return undefined;
  let pathname = "";
  let search = "";
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      if (typeof window !== "undefined" && u.origin !== window.location.origin) return undefined;
      pathname = u.pathname;
      search = u.search;
    } else {
      const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
      const path = raw.startsWith("/") ? raw : `/${raw}`;
      const u = new URL(path, base);
      pathname = u.pathname;
      search = u.search;
    }
  } catch {
    return undefined;
  }
  if (!pathname.startsWith("/")) return undefined;
  const combined = pathname + search;
  const prefix = `/${locale}`;
  if (combined === prefix || combined.startsWith(`${prefix}/`)) {
    const rest = combined.slice(prefix.length);
    return rest.length ? rest : "/";
  }
  return combined;
}

type FieldErrors = Partial<Record<keyof LoginFormData, string>>;

export default function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { status: sessionStatus, update } = useSession();
  const isRTL = locale === "ar" || locale === "ur";
  const oauthReturn = searchParams.get("from") === "oauth";
  const urlPlan = searchParams.get("plan");

  useEffect(() => {
    if (!oauthReturn || sessionStatus !== "authenticated") return;
    void (async () => {
      await update();
      let path = await fetchPostAuthPath();
      if (path === "/onboarding") {
        try {
          await markOnboardingComplete(update);
          const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
          const json = (await res.json()) as { user?: { role?: string } };
          path = dashboardPathForRole(String(json.user?.role ?? "JOBSEEKER"));
        } catch {
          /* keep onboarding path */
        }
      }
      hardNavigate(path, locale);
    })();
  }, [oauthReturn, sessionStatus, locale, update]);

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = loginSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      parsed.error.issues.forEach((err: ZodIssue) => {
        const field = err.path[0] as keyof LoginFormData;
        errors[field] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      try {
        const result = await signIn("credentials", {
          email: parsed.data.email,
          password: parsed.data.password,
          redirect: false,
        });

        if (result?.error) {
          setServerError(t("auth.invalidCredentials"));
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const fromCallback = intlPathFromCallback(params.get("callbackUrl"), locale);
        const target = fromCallback ?? (await fetchPostAuthPath());
        hardNavigate(target, locale);
      } catch {
        setServerError(t("common.error"));
      }
    });
  }

  async function handleGoogleSignIn() {
    startTransition(async () => {
      try {
        await signInWithGoogle({
          callbackUrl: `/${locale}/auth/login?from=oauth`,
        });
      } catch {
        setServerError(t("common.error"));
      }
    });
  }

  return (
    <AuthShell isRtl={isRTL} slogan={t("common.slogan")}>
      <h2 className="mb-1 text-xl font-semibold text-white">{t("auth.login")}</h2>
      <p className="mb-6 text-sm text-gray-400">{t("auth.subtitleLogin")}</p>

      {serverError ? (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-400">
          {serverError}
        </div>
      ) : null}

      <ClientHydrationGate
        fallback={
          <div className="space-y-4" aria-hidden>
            <div className="h-[4.5rem] animate-pulse rounded-lg bg-[#333]" />
            <div className="h-[4.5rem] animate-pulse rounded-lg bg-[#333]" />
            <div className="h-10 animate-pulse rounded-lg bg-[#333]" />
          </div>
        }
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4" suppressHydrationWarning>
          <div suppressHydrationWarning>
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
              autoComplete="current-password"
              className="w-full rounded-lg border border-[#444] bg-brand-primary px-4 py-2.5 text-white placeholder-gray-600 transition-colors focus:border-brand-accent focus:outline-none disabled:opacity-50"
              placeholder={t("auth.placeholderPassword")}
            />
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
            ) : null}
            <p className="mt-2 text-end">
              <Link href="/auth/forgot-password" className="text-xs text-brand-teal hover:underline">
                {t("auth.forgotPasswordLink")}
              </Link>
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: BRAND_COLORS.accent }}
          >
            {isPending ? t("auth.loggingIn") : t("auth.login")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#333]" />
          <span className="text-xs text-gray-500">{t("auth.orContinueWith")}</span>
          <div className="h-px flex-1 bg-[#333]" />
        </div>

        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#444] py-2.5 font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
        >
          <GoogleIcon />
          {t("auth.loginWithGoogle")}
        </button>
      </ClientHydrationGate>

      <div className="mt-6 flex justify-center">
        <ClearSessionButton locale={locale} className="text-amber-400/90" />
      </div>

      <div className="mt-8 space-y-3 border-t border-[#333] pt-6">
        <p className="text-center text-sm text-gray-400">{t("auth.noAccount")}</p>
        <Link
          href={
            urlPlan === "free" || urlPlan === "professional" || urlPlan === "premium"
              ? { pathname: "/auth/register", query: { plan: urlPlan } }
              : "/auth/register"
          }
          className="flex w-full items-center justify-center rounded-lg border-2 border-brand-teal/60 py-2.5 text-sm font-semibold text-brand-teal transition-colors hover:bg-brand-teal/10"
        >
          {t("auth.register")}
        </Link>
      </div>
    </AuthShell>
  );
}
