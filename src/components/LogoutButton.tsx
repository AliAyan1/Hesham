"use client";

import { signOutToLanding } from "@/lib/auth-redirect";
import { useTranslations } from "next-intl";
import { BRAND_COLORS } from "@/lib/constants";

interface LogoutButtonProps {
  locale: string;
}

/** Client component logout button used across all dashboard pages */
export default function LogoutButton({ locale }: LogoutButtonProps) {
  const t = useTranslations("nav");

  return (
    <button
      onClick={() => void signOutToLanding(locale)}
      className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-[#2a2a2a]"
      style={{ borderColor: BRAND_COLORS.accent, color: BRAND_COLORS.accent }}
    >
      {t("logout")}
    </button>
  );
}
