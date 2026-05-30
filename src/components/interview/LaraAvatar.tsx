"use client";

import { SoundWave } from "@/components/interview/SoundWave";

type LaraAvatarProps = {
  isSpeaking: boolean;
  nameLabel: string;
  subtitleLabel: string;
  speakingHint?: string;
};

export function LaraAvatar({
  isSpeaking,
  nameLabel,
  subtitleLabel,
  speakingHint,
}: LaraAvatarProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[180px] w-[180px]">
        {isSpeaking ? (
          <span
            className="absolute inset-[-8px] rounded-full border-[3px] border-[#1D9E75] opacity-50"
            style={{ animation: "lara-avatar-pulse 1.5s ease-in-out infinite" }}
            aria-hidden
          />
        ) : null}
        <div
          className="flex h-[180px] w-[180px] items-center justify-center rounded-full text-[64px] font-extrabold text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #1D9E75, #0F4C75)" }}
          aria-hidden
        >
          L
        </div>
      </div>

      <SoundWave isActive={isSpeaking} />

      <div className="text-center">
        <p className="text-lg font-semibold text-white">{nameLabel}</p>
        <p className="text-xs text-[#1D9E75]">{subtitleLabel}</p>
      </div>

      {isSpeaking && speakingHint ? (
        <p className="text-[13px] text-white/60">{speakingHint}</p>
      ) : null}
    </div>
  );
}
