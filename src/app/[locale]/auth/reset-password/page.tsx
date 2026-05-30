"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { BRAND_COLORS } from "@/lib/constants";
import { z } from "zod";

const schema = z
  .object({
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isRTL = locale === "ar" || locale === "ur";
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError(t("resetPasswordInvalidLink"));
      return;
    }
    const parsed = schema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message;
      setError(msg === "Passwords do not match" ? t("resetPasswordMismatch") : t("resetPasswordWeak"));
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: parsed.data.password }),
        });
        const body = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !body.success) {
          setError(body.error === "Invalid or expired reset link" ? t("resetPasswordInvalidLink") : t("resetPasswordError"));
          return;
        }
        router.push("/auth/login?reset=1");
      } catch {
        setError(t("resetPasswordError"));
      }
    });
  }

  if (!token) {
    return (
      <AuthShell isRtl={isRTL} slogan={tCommon("slogan")}>
        <h2 className="mb-1 text-xl font-semibold text-white">{t("resetPasswordTitle")}</h2>
        <p className="mb-4 text-sm text-gray-400">{t("resetPasswordSubtitle")}</p>
        <p className="text-sm text-red-400">{t("resetPasswordInvalidLink")}</p>
        <Link href="/auth/forgot-password" className="mt-4 inline-block text-sm text-brand-teal hover:underline">
          {t("forgotPasswordTitle")}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell isRtl={isRTL} slogan={tCommon("slogan")}>
      <h2 className="mb-1 text-xl font-semibold text-white">{t("resetPasswordTitle")}</h2>
      <p className="mb-6 text-sm text-gray-400">{t("resetPasswordSubtitle")}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-gray-300">{t("password")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
            autoComplete="new-password"
            className="w-full rounded-lg border border-[#444] bg-brand-primary px-4 py-2.5 text-white placeholder-gray-600 focus:border-brand-accent focus:outline-none disabled:opacity-50"
            placeholder={t("placeholderPasswordRule")}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-300">{t("confirmPassword")}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isPending}
            autoComplete="new-password"
            className="w-full rounded-lg border border-[#444] bg-brand-primary px-4 py-2.5 text-white placeholder-gray-600 focus:border-brand-accent focus:outline-none disabled:opacity-50"
          />
        </div>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: BRAND_COLORS.accent }}
        >
          {isPending ? t("resetPasswordSaving") : t("resetPasswordSubmit")}
        </button>
      </form>
    </AuthShell>
  );
}
