"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { BRAND_COLORS } from "@/lib/constants";
import { UserRole } from "@/types";
import {
  clearPendingSignup,
  readPendingSignup,
} from "@/lib/pending-signup-storage";
import { hardNavigate, waitForAuthenticatedSession } from "@/lib/auth-redirect";
import { dashboardPathForRole } from "@/lib/subscription";

export default function VerifyEmailPage() {
  const t = useTranslations("auth.verifyEmail");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRTL = locale === "ar" || locale === "ur";
  const inputRef = useRef<HTMLInputElement>(null);

  const emailFromQuery = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const [email] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [resendPending, startResend] = useTransition();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!emailFromQuery) {
      router.replace("/auth/register");
    }
  }, [emailFromQuery, router]);

  function onCodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    setError(null);
  }

  async function completeSignInAndRedirect(role: string) {
    const pending = readPendingSignup();
    if (!pending || pending.email.toLowerCase() !== email) {
      router.replace(`/auth/login?verified=1&email=${encodeURIComponent(email)}`);
      return;
    }

    const result = await signIn("credentials", {
      email: pending.email,
      password: pending.password,
      redirect: false,
    });

    clearPendingSignup();

    if (!result?.ok) {
      router.replace(`/auth/login?verified=1&email=${encodeURIComponent(email)}`);
      return;
    }

    await waitForAuthenticatedSession(16);
    const normalizedRole = String(role).toUpperCase();
    if (
      pending.plan === "professional" ||
      pending.plan === "premium"
    ) {
      hardNavigate(`/upgrade?plan=${pending.plan}`, locale);
      return;
    }
    const path =
      normalizedRole === UserRole.JOBSEEKER
        ? "/onboarding"
        : dashboardPathForRole(normalizedRole);
    hardNavigate(path, locale);
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError(t("invalidCode"));
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          error?: string;
          role?: string;
          code?: string;
        };

        if (json.code === "database_unavailable") {
          setError(tAuth("serviceUnavailable"));
          return;
        }

        if (!res.ok || !json.success) {
          setError(t("invalidCode"));
          return;
        }

        await completeSignInAndRedirect(json.role ?? UserRole.JOBSEEKER);
      } catch {
        setError(t("invalidCode"));
      }
    });
  }

  function handleResend() {
    setResendMessage(null);
    setError(null);
    startResend(async () => {
      try {
        const res = await fetch("/api/auth/resend-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (res.status === 429) {
          setError(t("resendLimit"));
          return;
        }
        setResendMessage(t("resent"));
      } catch {
        setError(t("resendFailed"));
      }
    });
  }

  return (
    <AuthShell isRtl={isRTL} slogan={tCommon("slogan")}>
      <h2 className="mb-1 text-xl font-semibold text-white">{t("title")}</h2>
      <p className="mb-6 text-sm text-gray-400">
        {t("subtitle")}{" "}
        <span className="font-medium text-white">{email || "…"}</span>
      </p>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-gray-300">{t("codeLabel")}</label>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-[#444] bg-brand-primary px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] text-white placeholder-gray-600 focus:border-brand-accent focus:outline-none disabled:opacity-50"
            placeholder="000000"
          />
        </div>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        {resendMessage ? (
          <p className="text-xs text-emerald-400">{resendMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isPending || code.length !== 6}
          className="w-full rounded-lg py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: BRAND_COLORS.accent }}
        >
          {isPending ? t("verifying") : t("submit")}
        </button>
      </form>

      <button
        type="button"
        disabled={resendPending}
        onClick={() => void handleResend()}
        className="mt-4 w-full text-sm font-medium text-gray-400 underline-offset-2 hover:text-white hover:underline disabled:opacity-50"
      >
        {resendPending ? t("resending") : t("resend")}
      </button>

      <p className="mt-6 text-center text-xs text-gray-500">
        <Link href="/auth/login" className="text-brand-accent hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </AuthShell>
  );
}
