"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { loginSchema } from "@/lib/validations";
import { BRAND_COLORS } from "@/lib/constants";
import { Logo } from "@/components/ui/Logo";
import type { LoginFormData } from "@/types";
import type { ZodIssue } from "zod";

type FieldErrors = Partial<Record<keyof LoginFormData, string>>;

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const isRTL = locale === "ar" || locale === "ur";

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /** Update local form state and clear per-field errors. */
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError(null);
  }

  /** Validate and sign in using Credentials provider. */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
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
            email: formData.email,
            password: formData.password,
            redirect: false,
          });

          if (result?.error) {
            setServerError(t("auth.invalidCredentials"));
            return;
          }

          router.push("/dashboard");
          router.refresh();
        } catch {
          setServerError(t("common.error"));
        }
      });
    } catch {
      setServerError(t("common.error"));
    }
  }

  /** Sign in with Google OAuth. */
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

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: BRAND_COLORS.primary }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-3 flex justify-center">
            <Logo variant="dark" size="lg" className="max-w-[260px]" priority />
          </div>
          <p className="text-gray-400 text-sm">{t("common.slogan")}</p>
        </div>

        <div className="bg-[#242424] rounded-2xl p-8 shadow-xl border border-[#333]">
          <h2 className="text-xl font-semibold text-white mb-1">
            {t("auth.login")}
          </h2>
          <p className="text-gray-400 text-sm mb-6">{t("auth.subtitleLogin")}</p>

          {serverError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                {t("auth.email")}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isPending}
                className="w-full px-4 py-2.5 bg-brand-primary border border-[#444] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-brand-accent transition-colors disabled:opacity-50"
                placeholder={t("auth.placeholderEmail")}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                {t("auth.password")}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isPending}
                className="w-full px-4 py-2.5 bg-brand-primary border border-[#444] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-brand-accent transition-colors disabled:opacity-50"
                placeholder={t("auth.placeholderPassword")}
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-400">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: BRAND_COLORS.accent }}
            >
              {isPending ? t("auth.loggingIn") : t("auth.login")}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#333]" />
            <span className="text-gray-500 text-xs">{t("auth.orContinueWith")}</span>
            <div className="flex-1 h-px bg-[#333]" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isPending}
            className="w-full py-2.5 rounded-lg border border-[#444] text-white font-medium flex items-center justify-center gap-2 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
          >
            <GoogleIcon />
            {t("auth.loginWithGoogle")}
          </button>

          {/* Switch to register */}
          <p className="text-center text-sm text-gray-400 mt-6">
            {t("auth.noAccount")}{" "}
            <Link
              href="/auth/register"
              className="font-medium hover:underline"
              style={{ color: BRAND_COLORS.accent }}
            >
              {t("auth.register")}
            </Link>
          </p>
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
