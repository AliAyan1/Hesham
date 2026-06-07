"use client";

import Image from "next/image";
import { useState, useTransition, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { signInWithGoogle } from "@/lib/google-oauth";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { loginSchema } from "@/lib/validations";
import { BRAND_COLORS } from "@/lib/constants";
import { ClientHydrationGate } from "@/components/ui/ClientHydrationGate";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import {
  fetchPostAuthPath,
  hardNavigate,
  waitForAuthenticatedSession,
} from "@/lib/auth-redirect";
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
  const tAuth = useTranslations("auth.loginRedesign");
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
      const path = await fetchPostAuthPath();
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

        if (!result?.ok || result.error) {
          setServerError(t("auth.invalidCredentials"));
          return;
        }

        await update();
        const sessionReady = await waitForAuthenticatedSession(40);
        if (!sessionReady.ok) {
          // signIn succeeded — cookie may lag; navigate so middleware reads the JWT
          const fallback = await fetchPostAuthPath().catch(() => "/dashboard/job-seeker");
          hardNavigate(fallback, locale);
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
        await signInWithGoogle({ callbackUrl: `/${locale}/auth/login?from=oauth` });
      } catch {
        setServerError(t("common.error"));
      }
    });
  }

  return (
    <div className="min-h-[100dvh]" dir={isRTL ? "rtl" : "ltr"}>
      <div className="grid min-h-[100dvh] lg:grid-cols-2">
        {/* Left panel (desktop) */}
        <div className="hidden items-center justify-center bg-gradient-to-br from-[#0F4C75] to-[#0D2137] p-10 text-white lg:flex">
          <div className="w-full max-w-md">
            <div className="flex justify-center">
              <Image src="/logo.png" alt="QudrahTech" width={220} height={70} priority className="h-auto w-auto" />
            </div>
            <p className="mt-8 text-center text-xl font-semibold">{tAuth("tagline")}</p>
            <p className="mt-2 text-center text-sm text-white/70">{tAuth("taglineAr")}</p>

            <div className="mt-10 grid gap-3 rounded-2xl border border-white/15 bg-white/5 p-6 text-sm">
              <StatLine value={tAuth("stat1Value")} label={tAuth("stat1Label")} />
              <StatLine value={tAuth("stat2Value")} label={tAuth("stat2Label")} />
              <StatLine value={tAuth("stat3Value")} label={tAuth("stat3Label")} />
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex items-center justify-center bg-white p-6">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Image src="/logo.png" alt="QudrahTech" width={180} height={58} priority className="h-auto w-auto" />
            </div>

            <h1 className="text-2xl font-black text-[#0D2137]">{tAuth("title")}</h1>
            <p className="mt-2 text-sm text-[#6B7280]">{tAuth("subtitle")}</p>

            {serverError ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {serverError}
              </div>
            ) : null}

            <div className="mt-6">
              <ClientHydrationGate
                fallback={
                  <div className="space-y-4" aria-hidden>
                    <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                    <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                    <div className="h-11 animate-pulse rounded-xl bg-gray-100" />
                  </div>
                }
              >
                <form onSubmit={handleSubmit} noValidate className="space-y-4" suppressHydrationWarning>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#0D2137]">{t("auth.email")}</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={isPending}
                      autoComplete="email"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#0D2137] placeholder-gray-400 focus:border-[#0F4C75] focus:outline-none disabled:opacity-50"
                      placeholder={t("auth.placeholderEmail")}
                    />
                    {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="mb-1 block text-sm font-semibold text-[#0D2137]">{t("auth.password")}</label>
                      <Link href="/forgot-password" className="text-xs font-semibold text-[#0F4C75] hover:underline">
                        {t("auth.forgotPasswordLink")}
                      </Link>
                    </div>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isPending}
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#0D2137] placeholder-gray-400 focus:border-[#0F4C75] focus:outline-none disabled:opacity-50"
                      placeholder={t("auth.placeholderPassword")}
                    />
                    {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex w-full items-center justify-center rounded-xl py-3 font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
                    style={{ backgroundColor: BRAND_COLORS.accent }}
                  >
                    {isPending ? tAuth("signingIn") : t("auth.login")}
                  </button>
                </form>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-500">{t("auth.orContinueWith")}</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <button
                  type="button"
                  onClick={() => void handleGoogleSignIn()}
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 font-semibold text-[#0D2137] hover:bg-gray-50 disabled:opacity-50"
                >
                  <GoogleIcon />
                  {t("auth.loginWithGoogle")}
                </button>
              </ClientHydrationGate>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-6">
              <p className="text-center text-sm text-[#6B7280]">{t("auth.noAccount")}</p>
              <Link
                href={
                  urlPlan === "free" || urlPlan === "professional" || urlPlan === "premium"
                    ? { pathname: "/register", query: { plan: urlPlan } }
                    : "/register"
                }
                className="mt-3 flex w-full items-center justify-center rounded-xl border-2 border-[#0F4C75] py-3 text-sm font-semibold text-[#0F4C75] hover:bg-[#EFF6FF]"
              >
                {tAuth("getStarted")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatLine({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-lg font-black">{value}</span>
      <span className="text-sm text-white/75">{label}</span>
    </div>
  );
}
