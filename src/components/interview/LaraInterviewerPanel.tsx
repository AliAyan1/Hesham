"use client";

import { useTranslations } from "next-intl";
import type { LaraTtsStatus } from "@/hooks/useLaraTts";
import { getInterviewLanguageFlag, getInterviewLanguageLabel } from "@/lib/interview/locale-language";

type Props = {
  locale: string;
  ttsStatus: LaraTtsStatus;
  isRecording: boolean;
};

export function LaraInterviewerPanel({ locale, ttsStatus, isRecording }: Props) {
  const t = useTranslations("interview");
  const flag = getInterviewLanguageFlag(locale);
  const langName = getInterviewLanguageLabel(locale);
  const speaking = ttsStatus === "speaking";
  const preparing = ttsStatus === "preparing";

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:flex-row sm:items-start sm:gap-4">
      <div className="relative flex shrink-0 flex-col items-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white shadow-md"
          style={{ backgroundColor: "#1D9E75" }}
          aria-hidden
        >
          L
        </div>
        {speaking ? (
          <div className="absolute -right-1 top-1/2 flex -translate-y-1/2 items-end gap-0.5" aria-hidden>
            <span className="lara-wave-bar h-3 w-1 rounded-full bg-[#1D9E75]" />
            <span className="lara-wave-bar lara-wave-bar-delay-1 h-5 w-1 rounded-full bg-[#1D9E75]" />
            <span className="lara-wave-bar lara-wave-bar-delay-2 h-4 w-1 rounded-full bg-[#1D9E75]" />
          </div>
        ) : null}
        {isRecording ? (
          <div
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow"
            aria-label={t("recordingAnswer")}
          >
            <span className="lara-mic-pulse text-red-500">
              <MicIcon />
            </span>
          </div>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 text-center sm:text-start">
        <p className="font-semibold text-[#0D2137]">{t("laraName")}</p>
        <p className="text-sm text-[#6B7280]">{t("laraSubtitle")}</p>
        <p className="mt-2 text-xs text-[#6B7280]">
          {flag} {t("conductingIn", { language: langName })}
        </p>
        {preparing ? (
          <p className="mt-2 text-sm font-medium text-brand-teal">{t("preparingQuestion")}</p>
        ) : null}
        {speaking ? <p className="mt-2 text-sm font-medium text-brand-teal">{t("laraSpeaking")}</p> : null}
      </div>

    </div>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
    </svg>
  );
}
