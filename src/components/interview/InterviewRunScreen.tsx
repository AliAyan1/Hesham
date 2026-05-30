"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import { LaraAvatar } from "@/components/interview/LaraAvatar";
import type { LaraTtsStatus } from "@/hooks/useLaraTts";

export type InterviewRunScreenProps = {
  locale: string;
  isRtl: boolean;
  laraTtsStatus: LaraTtsStatus;
  isListening: boolean;
  answerRecorded: boolean;
  liveTranscript: string;
  processingAnswer: boolean;
  questionEn: string;
  questionAr: string;
  questionIndex: number;
  questionTotal: number;
  elapsedSec: number;
  progressPct: number;
  proctoringWarning: string | null;
  labels: {
    laraName: string;
    laraSubtitle: string;
    laraSpeaking: string;
    listening: string;
    yourAnswer: string;
    processing: string;
    answerRecorded: string;
    questionOf: string;
    endInterview: string;
    mute: string;
    unmute: string;
  };
  muted: boolean;
  onToggleMute: () => void;
  onEndInterview: () => void;
  endDisabled?: boolean;
};

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function InterviewRunScreen({
  isRtl,
  laraTtsStatus,
  isListening,
  answerRecorded,
  liveTranscript,
  processingAnswer,
  questionEn,
  questionAr,
  questionIndex,
  questionTotal,
  elapsedSec,
  progressPct,
  proctoringWarning,
  labels,
  muted,
  onToggleMute,
  onEndInterview,
  endDisabled,
}: InterviewRunScreenProps) {
  const laraSpeaking = laraTtsStatus === "speaking" || laraTtsStatus === "preparing";

  return (
    <div
      className="relative flex min-h-[calc(100vh-8rem)] flex-col"
      style={{ background: "linear-gradient(180deg, #0D2137 0%, #0F4C75 100%)" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {proctoringWarning ? (
        <div className="mx-4 mt-4 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
          {proctoringWarning}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
        <LaraAvatar
          isSpeaking={laraSpeaking}
          nameLabel={labels.laraName}
          subtitleLabel={labels.laraSubtitle}
          speakingHint={laraSpeaking ? labels.laraSpeaking : undefined}
        />

        <div className="w-full max-w-2xl space-y-4">
          <p className="text-center text-xs font-medium text-white/70">
            {labels.questionOf
              .replace("{current}", String(questionIndex + 1))
              .replace("{total}", String(questionTotal))}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#1D9E75] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="rounded-2xl bg-white/95 p-6 shadow-xl">
            <p className="text-center text-lg font-semibold leading-relaxed text-[#0D2137]">
              {questionEn}
            </p>
            <p className="mt-3 text-center text-base leading-relaxed text-[#6B7280]" dir="rtl">
              {questionAr}
            </p>
          </div>

          {isListening ? (
            <div className="flex items-center justify-center gap-2 text-white">
              <Mic className="lara-mic-pulse h-5 w-5 text-red-400" aria-hidden />
              <span className="text-sm font-medium">{labels.listening}</span>
            </div>
          ) : null}

          {processingAnswer ? (
            <p className="text-center text-sm text-white/70">{labels.processing}</p>
          ) : null}

          {answerRecorded && !isListening && !processingAnswer ? (
            <p className="text-center text-sm font-semibold text-[#A7F3D0]">{labels.answerRecorded}</p>
          ) : null}

          <div className="rounded-xl border border-white/20 bg-white/10 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/70">
              {labels.yourAnswer}
            </p>
            <p className="min-h-[4rem] text-sm leading-relaxed text-white whitespace-pre-wrap">
              {liveTranscript.trim() || (processingAnswer ? "…" : "—")}
            </p>
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/20 px-4 py-3 text-white">
        <span className="font-mono text-sm tabular-nums">{formatElapsed(elapsedSec)}</span>
        <span className="text-sm text-white/80">
          {questionIndex + 1} / {questionTotal}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/25 bg-white/10 hover:bg-white/20"
            aria-label={muted ? labels.unmute : labels.mute}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <button
            type="button"
            disabled={endDisabled}
            onClick={onEndInterview}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
          >
            <PhoneOff className="h-3.5 w-3.5" aria-hidden />
            {labels.endInterview}
          </button>
        </div>
      </footer>
    </div>
  );
}
