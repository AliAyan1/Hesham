"use client";

import { Briefcase, Building2, GraduationCap } from "lucide-react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { finishGoogleSignup } from "@/lib/auth-redirect";

type AccountPick = "JOBSEEKER" | "EMPLOYER" | "MENTOR";

export function RegisterRolePickModal({ open }: { open: boolean }) {
  const t = useTranslations("auth.registerFlow");
  const tm = useTranslations("mentor");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { update } = useSession();
  const [busy, setBusy] = useState<AccountPick | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function choose(role: AccountPick) {
    setBusy(role);
    setError(null);
    try {
      await axios.post("/api/account/role-choice", { role });
      await finishGoogleSignup(role, update, locale);
    } catch {
      setError(tc("error"));
    } finally {
      setBusy(null);
    }
  }

  const cards: {
    role: AccountPick;
    label: string;
    hint: string;
    Icon: typeof Briefcase;
    className: string;
    iconClass: string;
  }[] = [
    {
      role: "JOBSEEKER",
      label: t("googleRoleJobSeeker"),
      hint: t("roleJobSeekerHint"),
      Icon: Briefcase,
      className: "border-brand-teal/40 bg-brand-teal/10",
      iconClass: "text-brand-teal",
    },
    {
      role: "EMPLOYER",
      label: t("googleRoleEmployer"),
      hint: t("roleEmployerHint"),
      Icon: Building2,
      className: "border-[#0F4C75]/40 bg-[#EFF6FF]/30",
      iconClass: "text-[#0F4C75]",
    },
    {
      role: "MENTOR",
      label: tm("iAmMentor"),
      hint: tm("googleMentorHint"),
      Icon: GraduationCap,
      className: "border-[#C9973A]/50 bg-[#FDF3E3]/20",
      iconClass: "text-[#C9973A]",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-role-pick-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#444] bg-[#1a1a1a] p-6 shadow-xl">
        <h2 id="register-role-pick-title" className="text-xl font-bold text-white">
          {t("googleRolePickTitle")}
        </h2>
        <p className="mt-2 text-sm text-gray-400">{t("googleRolePickSubtitle")}</p>

        <div className="mt-6 grid gap-3">
          {cards.map(({ role, label, hint, Icon, className, iconClass }) => (
            <button
              key={role}
              type="button"
              disabled={busy !== null}
              onClick={() => void choose(role)}
              className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-start transition-colors hover:opacity-95 disabled:opacity-50 ${className}`}
            >
              <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${iconClass}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">{label}</span>
                <span className="mt-1 block text-xs text-gray-400">{hint}</span>
                {busy === role ? (
                  <span className="mt-2 block text-xs font-semibold text-brand-teal">{tc("loading")}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}
