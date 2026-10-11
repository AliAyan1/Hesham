"use client";

import type { ReactNode } from "react";
import { BRAND_COLORS } from "@/lib/constants";
import { Logo } from "@/components/ui/Logo";
import { AuthCanonicalHost } from "@/components/auth/AuthCanonicalHost";
type Props = {
  children: ReactNode;
  isRtl: boolean;
  slogan: string;
};

export function AuthShell({ children, isRtl, slogan }: Props) {
  return (
    <div
      className="relative flex min-h-[100dvh] items-center justify-center px-4 py-[max(2.5rem,env(safe-area-inset-top,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
      style={{ backgroundColor: BRAND_COLORS.primary }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <AuthCanonicalHost />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <Logo variant="dark" size="lg" className="max-w-[260px]" priority />
          </div>
          <p className="text-sm text-gray-400">{slogan}</p>
        </div>
        <div className="rounded-2xl border border-[#333] bg-[#242424] p-6 shadow-xl sm:p-8">{children}</div>
      </div>
    </div>
  );
}
