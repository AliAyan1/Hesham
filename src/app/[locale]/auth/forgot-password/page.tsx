"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { BRAND_COLORS } from "@/lib/constants";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isRTL = locale === "ar" || locale === "ur";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(t("forgotPasswordInvalidEmail"));
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: parsed.data.email }),
        });
        if (!res.ok) {
          setError(t("forgotPasswordError"));
          return;
        }
        setSent(true);
      } catch {
        setError(t("forgotPasswordError"));
      }
    });
  }

  return (
    <AuthShell isRtl={isRTL} slogan={tCommon("slogan")}>
      <h2 className="mb-1 text-xl font-semibold text-white">{t("forgotPasswordTitle")}</h2>
      <p className="mb-6 text-sm text-gray-400">{t("forgotPasswordSubtitle")}</p>
      {sent ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {t("forgotPasswordSent")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">{t("email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              autoComplete="email"
              className="w-full rounded-lg border border-[#444] bg-brand-primary px-4 py-2.5 text-white placeholder-gray-600 focus:border-brand-accent focus:outline-none disabled:opacity-50"
              placeholder={t("placeholderEmail")}
            />
          </div>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: BRAND_COLORS.accent }}
          >
            {isPending ? t("forgotPasswordSending") : t("forgotPasswordSubmit")}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/auth/login" className="text-brand-teal hover:underline">
          {t("forgotPasswordBackToLogin")}
        </Link>
      </p>
    </AuthShell>
  );
}
