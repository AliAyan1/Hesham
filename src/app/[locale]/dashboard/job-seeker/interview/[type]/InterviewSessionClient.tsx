"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
import { useProctoring } from "@/hooks/useProctoring";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { InterviewRunScreen } from "@/components/interview/InterviewRunScreen";
import { useInterviewAutoAnswer } from "@/hooks/useInterviewAutoAnswer";
import { useLaraTts } from "@/hooks/useLaraTts";
import { getLaraIntro, normalizeInterviewLocale, pickQuestionText } from "@/lib/interview/locale-language";

type QuestionItem = {
  id: string;
  question: string;
  questionAr: string;
  category: string;
  timeLimit: number;
  tips: string;
};

type AnalysisPack = {
  overallScore: number;
  communicationScore: number;
  confidenceScore: number;
  clarityScore: number;
  relevanceScore: number;
  overallFeedback: string;
  overallFeedbackAr: string;
};

function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export default function InterviewSessionClient({
  kind,
  jobId,
}: {
  kind: "practice" | "competency" | "job";
  jobId: string | null;
}) {
  const t = useTranslations("interview");
  const ta = useTranslations("assessment");
  const tc = useTranslations("common");
  const locale = useLocale();
  const session = useSession();
  const searchParams = useSearchParams();
  const forceRetake = searchParams.get("retake") === "1";

  const rawTier = session.data?.user?.subscriptionTier as string | undefined;
  const tier: SubscriptionTier =
    rawTier === "PROFESSIONAL" || rawTier === "PREMIUM" ? (rawTier as SubscriptionTier) : "FREE";
  const can = hasAccess(tier, "ai_assessment");

  const [phase, setPhase] = useState<"prep" | "run" | "report" | "readonly" | "suspended">("prep");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [liveTranscript, setLiveTranscript] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [camOk, setCamOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [screenOk, setScreenOk] = useState(false);
  const [netOk, setNetOk] = useState(false);
  const [agree, setAgree] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const fullRecorderRef = useRef<MediaRecorder | null>(null);
  const fullCloneRef = useRef<MediaStream | null>(null);
  const fullChunksRef = useRef<BlobPart[]>([]);
  const answerRecorderRef = useRef<MediaRecorder | null>(null);
  const answerChunksRef = useRef<BlobPart[]>([]);
  const introPlayedRef = useRef(false);
  const proctoringStopRef = useRef<() => void>(() => {});

  const { status: laraTtsStatus, speak: laraSpeak, stop: laraStop, unlockAudio } = useLaraTts(locale);

  const [submitPack, setSubmitPack] = useState<AnalysisPack | null>(null);
  const [share, setShare] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [readonlyPack, setReadonlyPack] = useState<AnalysisPack | null>(null);
  const [shareLocked, setShareLocked] = useState(false);
  const [processingAnswer, setProcessingAnswer] = useState(false);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const [voiceNeedsTap, setVoiceNeedsTap] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [answerRecorded, setAnswerRecorded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [scheduledJobs, setScheduledJobs] = useState<
    Array<{ id: string; jobId: string; jobTitle: string | null }>
  >([]);

  const procRef = useRef(false);
  const advancingRef = useRef(false);

  const proctoring = useProctoring({
    enabled: phase === "run" && Boolean(interviewId),
    interviewId: interviewId ?? undefined,
    displayStream,
    cameraStream,
    onFlagged: () => {
      setPhase("prep");
      procRef.current = false;
    },
  });

  proctoringStopRef.current = proctoring.stopSession;

  useEffect(() => {
    displayStreamRef.current = displayStream;
  }, [displayStream]);

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    if (phase !== "run" || !interviewId || procRef.current) return;
    procRef.current = true;
    void proctoring.startSession().catch(() => {
      procRef.current = false;
    });
  }, [phase, interviewId, proctoring]);

  useEffect(() => {
    if (phase !== "run" || timeLeft <= 0) return;
    const id = window.setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [phase, timeLeft]);

  useEffect(() => {
    if (phase !== "run" || !startedAt) return;
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, startedAt]);

  useEffect(() => {
    return () => {
      laraStop();
      displayStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      cameraStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      fullCloneRef.current?.getTracks().forEach((tr) => tr.stop());
      try {
        fullRecorderRef.current?.stop();
        answerRecorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      proctoringStopRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- teardown streams only on unmount
  }, []);

  const verifyDevices = useCallback(async () => {
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cam.getTracks().forEach((tr) => tr.stop());
      setCamOk(true);
    } catch {
      setCamOk(false);
    }
    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });
      mic.getTracks().forEach((tr) => tr.stop());
      setMicOk(true);
    } catch {
      setMicOk(false);
    }
  }, []);

  useEffect(() => {
    void verifyDevices();
  }, [verifyDevices]);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const res = await fetch("/api/interview/summary", { credentials: "include" });
        const j = (await res.json()) as {
          success?: boolean;
          data?: {
            interviews: Array<{
              id: string;
              status: string;
              interviewKind: string | null;
              jobId: string | null;
            }>;
          };
        };
        if (!res.ok || !j.success || !j.data || cancel || forceRetake) return;
        const rows = j.data.interviews;
        const match = rows.find(
          (r) =>
            (r.status === "COMPLETED" || r.status === "FLAGGED") &&
            r.interviewKind === kind &&
            (kind !== "job" || !jobId || r.jobId === jobId),
        );
        if (!match) return;
        const d = await fetch(`/api/interview/detail?id=${encodeURIComponent(match.id)}`, {
          credentials: "include",
        });
        const dj = (await d.json()) as {
          success?: boolean;
          data?: {
            overallScore: number | null;
            communicationScore: number | null;
            confidenceScore: number | null;
            clarityScore: number | null;
            relevanceScore: number | null;
            aiAnalysis: unknown;
            shareWithEmployers?: boolean;
          };
        };
        if (!d.ok || !dj.success || !dj.data || cancel) return;
        const aa = dj.data.aiAnalysis && typeof dj.data.aiAnalysis === "object" ? dj.data.aiAnalysis : null;
        const ar = aa as Record<string, unknown>;
        setReadonlyPack({
          overallScore: dj.data.overallScore ?? 0,
          communicationScore: dj.data.communicationScore ?? 0,
          confidenceScore: dj.data.confidenceScore ?? 0,
          clarityScore: dj.data.clarityScore ?? 0,
          relevanceScore: dj.data.relevanceScore ?? 0,
          overallFeedback: typeof ar.overallFeedback === "string" ? ar.overallFeedback : "",
          overallFeedbackAr: typeof ar.overallFeedbackAr === "string" ? ar.overallFeedbackAr : "",
        });
        setShare(Boolean(dj.data.shareWithEmployers));
        setShareLocked(true);
        setPhase("readonly");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancel = true;
    };
  }, [kind, jobId, forceRetake]);

  useEffect(() => {
    if (phase !== "report" || kind !== "practice") return;
    let cancel = false;
    void fetch("/api/interview/summary", { credentials: "include" })
      .then((r) => r.json() as Promise<{
        success?: boolean;
        data?: {
          interviews: Array<{
            id: string;
            jobId: string | null;
            jobTitle: string | null;
            status: string;
            interviewKind: string | null;
          }>;
        };
      }>)
      .then((j) => {
        if (cancel || !j.success || !j.data?.interviews) return;
        setScheduledJobs(
          j.data.interviews
            .filter(
              (row) =>
                row.interviewKind === "job" &&
                (row.status === "PENDING" || row.status === "IN_PROGRESS") &&
                row.jobId,
            )
            .map((row) => ({
              id: row.id,
              jobId: row.jobId as string,
              jobTitle: row.jobTitle,
            })),
        );
      })
      .catch(() => {
        if (!cancel) setScheduledJobs([]);
      });
    return () => {
      cancel = true;
    };
  }, [phase, kind]);

  const isRtl = locale === "ar" || locale === "ur";
  const q = questions[idx];
  const qText = q ? pickQuestionText(q, locale) : "";

  const autoAnswerStopRef = useRef<() => void>(() => {});
  const autoAnswerStartRef = useRef<() => void>(() => {});

  async function nextQuestionInner(finalTextOverride?: string) {
    if (!q || !interviewId) return;
    laraStop();
    autoAnswerStopRef.current();
    const finalText = (finalTextOverride ?? (liveTranscript.trim() || transcripts[q.id] || "")).trim();
    setTranscripts((prev) => ({ ...prev, [q.id]: finalText }));

    const nextIdx = idx + 1;
    if (nextIdx >= questions.length) {
      await finalizeInterview();
      return;
    }
    setIdx(nextIdx);
    setLiveTranscript(transcripts[questions[nextIdx].id] ?? "");
    setTimeLeft(questions[nextIdx]?.timeLimit ?? 120);
    setAnswerRecorded(false);
  }

  const autoAnswer = useInterviewAutoAnswer({
    locale,
    micStream: micStreamRef.current,
    muted,
    onTranscriptUpdate: setLiveTranscript,
    onFinalize: async (text) => {
      if (advancingRef.current || !questions[idx]) return;
      advancingRef.current = true;
      autoAnswerStopRef.current();
      const current = questions[idx];
      const trimmed = text.trim() || t("emptyAnswerPlaceholder");
      setTranscripts((prev) => ({ ...prev, [current.id]: trimmed }));
      setLiveTranscript(trimmed);
      setIsListening(false);
      setAnswerRecorded(true);
      await new Promise((r) => setTimeout(r, 1500));
      advancingRef.current = false;
      await nextQuestionInner(trimmed);
    },
  });

  autoAnswerStopRef.current = autoAnswer.stopCapture;
  autoAnswerStartRef.current = autoAnswer.startCapture;

  const speakQuestionWithAutoListen = useCallback(
    async (questionIndex: number, list: QuestionItem[]) => {
      const item = list[questionIndex];
      if (!item) return;
      setAnswerRecorded(false);
      setIsListening(false);
      autoAnswerStopRef.current();
      const text = pickQuestionText(item, locale);
      setVoiceUnavailable(false);
      setVoiceNeedsTap(false);
      const ok = await laraSpeak(text);
      if (!ok) {
        setVoiceUnavailable(true);
        setVoiceNeedsTap(true);
        return;
      }
      if (!muted && micStreamRef.current) {
        setIsListening(true);
        autoAnswerStartRef.current();
      }
    },
    [locale, laraSpeak, muted],
  );

  useEffect(() => {
    if (phase !== "run" || !questions[idx]) return;
    const curId = questions[idx].id;
    setLiveTranscript(transcripts[curId] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync transcript when question changes
  }, [idx, phase, questions]);

  const currentQuestionId = questions[idx]?.id ?? "";

  useEffect(() => {
    if (phase !== "run" || idx === 0 || !questions[idx]) return;
    let cancelled = false;

    void (async () => {
      if (!cancelled) await speakQuestionWithAutoListen(idx, questions);
    })();

    return () => {
      cancelled = true;
      laraStop();
    };
  }, [phase, idx, currentQuestionId, laraStop, speakQuestionWithAutoListen, questions]);

  async function replayQuestionAudio() {
    if (!qText.trim() || laraTtsStatus === "preparing" || laraTtsStatus === "speaking") return;
    setVoiceUnavailable(false);
    setVoiceNeedsTap(false);
    await unlockAudio();
    const ok = await laraSpeak(qText);
    if (!ok) {
      setVoiceUnavailable(true);
      setVoiceNeedsTap(true);
    }
  }

  async function playIntroAndFirstQuestion(list: QuestionItem[]) {
    setVoiceNeedsTap(false);
    setVoiceUnavailable(false);
    await unlockAudio();
    const introOk = await laraSpeak(getLaraIntro(locale, list.length));
    if (!introOk) {
      setVoiceUnavailable(true);
      setVoiceNeedsTap(true);
      return;
    }
    await speakQuestionWithAutoListen(0, list);
  }

  function startAnswerRecording() {
    if (!micStreamRef.current || processingAnswer || proctoring.isFlagged) return;
    const track = micStreamRef.current.getAudioTracks()[0];
    if (!track || track.readyState !== "live") {
      setRecordError(t("micNotReady"));
      return;
    }
    setRecordError(null);
    void unlockAudio();
    answerChunksRef.current = [];
    const mime = pickRecorderMime();
    try {
      const rec = mime
        ? new MediaRecorder(micStreamRef.current, { mimeType: mime })
        : new MediaRecorder(micStreamRef.current);
      answerRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) answerChunksRef.current.push(e.data);
      };
      rec.onerror = () => {
        setIsRecording(false);
        setRecordError(t("recordFailed"));
      };
      rec.start(250);
      setIsRecording(true);
    } catch {
      setRecordError(t("recordFailed"));
    }
  }

  async function stopAndTranscribeAnswer() {
    const rec = answerRecorderRef.current;
    if (!rec || rec.state === "inactive" || !q) return;
    setProcessingAnswer(true);
    setRecordError(null);
    try {
      await new Promise<void>((resolve) => {
        rec.onstop = () => resolve();
        try {
          rec.stop();
        } catch {
          resolve();
        }
      });
      answerRecorderRef.current = null;
      setIsRecording(false);

      const mime = pickRecorderMime();
      const blob = new Blob(answerChunksRef.current, {
        type: mime ? mime.split(";")[0] : "audio/webm",
      });
      answerChunksRef.current = [];
      if (blob.size < 500) {
        setRecordError(t("recordTooShort"));
        return;
      }

      const fd = new FormData();
      fd.append("file", blob, "answer.webm");
      fd.append("locale", locale);
      const res = await fetch("/api/interview/transcribe", { method: "POST", body: fd, credentials: "include" });
      const j = (await res.json()) as { success?: boolean; data?: { text: string }; error?: string };
      if (!res.ok || !j.success || !j.data?.text?.trim()) {
        setRecordError(j.error === "Transcription failed" ? t("transcribeFailed") : t("recordFailed"));
        return;
      }
      const text = j.data.text.trim();
      setTranscripts((prev) => ({ ...prev, [q.id]: text }));
      setLiveTranscript(text);
    } catch {
      setRecordError(t("recordFailed"));
      setIsRecording(false);
    } finally {
      setProcessingAnswer(false);
    }
  }

  function toggleAnswerRecording() {
    if (isRecording) {
      void stopAndTranscribeAnswer();
    } else {
      startAnswerRecording();
    }
  }

  async function begin() {
    if (!camOk || !micOk || !screenOk || !netOk || !agree || !dataConsent) return;
    if (kind === "job" && !jobId) return;
    void unlockAudio();
    setLoading(true);
    setLoadErr(false);
    let dispLocal: MediaStream | null = null;
    let camLocal: MediaStream | null = null;
    let micLocal: MediaStream | null = null;
    let cloneLocal: MediaStream | null = null;
    try {
      const consentRes = await fetch("/api/job-seeker/consent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "interview" }),
      });
      if (!consentRes.ok) throw new Error("consent");

      await document.documentElement.requestFullscreen().catch(() => {});
      dispLocal = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as MediaTrackConstraints,
        audio: false,
      });
      setDisplayStream(dispLocal);
      camLocal = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(camLocal);

      micLocal = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });
      micStreamRef.current = micLocal;

      const mime = pickRecorderMime();
      cloneLocal = micLocal.clone();
      fullCloneRef.current = cloneLocal;
      fullChunksRef.current = [];
      const fullRec = mime ? new MediaRecorder(cloneLocal, { mimeType: mime }) : new MediaRecorder(cloneLocal);
      fullRec.ondataavailable = (e) => {
        if (e.data.size > 0) fullChunksRef.current.push(e.data);
      };
      fullRec.start(1000);
      fullRecorderRef.current = fullRec;

      const gen = await fetch("/api/interview/generate-questions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          locale,
          ...(kind === "job" && jobId ? { jobId } : {}),
        }),
      });
      const gj = (await gen.json()) as {
        success?: boolean;
        data?: { interviewId: string; questions: QuestionItem[] };
        error?: string;
        cooldownUntil?: string;
      };
      if (gen.status === 403 && gj.error === "proctoring_suspended") {
        setSuspendedUntil(gj.cooldownUntil ?? null);
        setPhase("suspended");
        try {
          fullRecorderRef.current?.stop();
        } catch {
          /* ignore */
        }
        fullRecorderRef.current = null;
        fullCloneRef.current?.getTracks().forEach((tr) => tr.stop());
        fullCloneRef.current = null;
        micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
        micStreamRef.current = null;
        dispLocal?.getTracks().forEach((tr) => tr.stop());
        camLocal?.getTracks().forEach((tr) => tr.stop());
        cloneLocal?.getTracks().forEach((tr) => tr.stop());
        setDisplayStream(null);
        setCameraStream(null);
        return;
      }
      if (!gen.ok || !gj.success || !gj.data) {
        if (gen.status === 403 && gj.error === "consent_required") throw new Error("consent_required");
        throw new Error(gj.error ?? "generate");
      }
      const loadedQuestions = gj.data.questions;
      setInterviewId(gj.data.interviewId);
      setQuestions(loadedQuestions);
      setIdx(0);
      setTranscripts({});
      introPlayedRef.current = true;
      setVoiceUnavailable(false);
      setVoiceNeedsTap(false);
      setRecordError(null);
      setStartedAt(Date.now());
      setTimeLeft(loadedQuestions[0]?.timeLimit ?? 120);
      setPhase("run");
      if (kind === "practice") {
        void speakQuestionWithAutoListen(0, loadedQuestions);
      } else {
        void playIntroAndFirstQuestion(loadedQuestions);
      }
    } catch {
      setLoadErr(true);
      try {
        fullRecorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      fullRecorderRef.current = null;
      fullCloneRef.current?.getTracks().forEach((tr) => tr.stop());
      fullCloneRef.current = null;
      micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      micStreamRef.current = null;
      dispLocal?.getTracks().forEach((tr) => tr.stop());
      camLocal?.getTracks().forEach((tr) => tr.stop());
      cloneLocal?.getTracks().forEach((tr) => tr.stop());
      setDisplayStream(null);
      setCameraStream(null);
    } finally {
      setLoading(false);
    }
  }

  async function finalizeInterview() {
    if (!interviewId || !q) return;
    laraStop();
    autoAnswerStopRef.current();
    const finalText = (liveTranscript.trim() || transcripts[q.id] || "").trim();
    setTranscripts((prev) => ({ ...prev, [q.id]: finalText }));

    const items = questions.map((qq) => {
      const txx =
        qq.id === q.id
          ? finalText
          : (transcripts[qq.id] ?? "").trim() || t("emptyAnswerPlaceholder");
      return { questionId: qq.id, transcript: txx };
    });

    setLoading(true);
    try {
      const rec = fullRecorderRef.current;
      if (rec && rec.state !== "inactive") {
        await new Promise<void>((resolve) => {
          rec.onstop = () => resolve();
          try {
            rec.stop();
          } catch {
            resolve();
          }
        });
      }
      fullRecorderRef.current = null;
      fullCloneRef.current?.getTracks().forEach((tr) => tr.stop());
      fullCloneRef.current = null;

      const mime = pickRecorderMime();
      const blob = new Blob(fullChunksRef.current, {
        type: mime ? mime.split(";")[0] : "audio/webm",
      });
      if (blob.size > 2000) {
        const fd = new FormData();
        fd.append("interviewId", interviewId);
        fd.append("file", blob, "interview-session.webm");
        await fetch("/api/interview/recording", { method: "POST", body: fd, credentials: "include" });
      }

      const durationSec = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
      const res = await fetch("/api/interview/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          items,
          durationSeconds: durationSec,
          isFlagged: proctoring.isFlagged,
          proctoringFlags: { warnings: proctoring.warningCount },
          locale,
        }),
      });
      const j = (await res.json()) as {
        success?: boolean;
        data?: AnalysisPack;
      };
      if (!res.ok || !j.success || !j.data) throw new Error("analyze");

      micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      micStreamRef.current = null;

      displayStream?.getTracks().forEach((tr) => tr.stop());
      cameraStream?.getTracks().forEach((tr) => tr.stop());
      setDisplayStream(null);
      setCameraStream(null);
      void proctoring.stopSession();
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }

      setSubmitPack(j.data);
      setPhase("report");

      await fetch("/api/assessment/share", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "interview", id: interviewId, share }),
      });
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }

  async function patchShare(next: boolean) {
    if (!interviewId) return;
    await fetch("/api/assessment/share", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "interview", id: interviewId, share: next }),
    });
    setShare(next);
  }

  if (!session.data?.user) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (!can) {
    return (
      <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-6 text-center">
        <p className="font-semibold text-[#0D2137]">{t("upgradeTitle")}</p>
        <Link href="/pricing" className="mt-4 inline-block text-brand-teal underline">
          {t("upgradeCta")}
        </Link>
      </div>
    );
  }

  if (phase === "suspended") {
    const untilLabel = suspendedUntil
      ? new Date(suspendedUntil).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
      : "";
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-6" dir={isRtl ? "rtl" : "ltr"}>
        <p className="font-semibold text-[#0D2137]">{ta("proctoring.suspendedTitle")}</p>
        <p className="text-sm text-[#374151]">
          {ta("proctoring.suspendedHome", { datetime: untilLabel || "—" })}
        </p>
        <Link href="/dashboard/job-seeker/interview" className="text-sm font-semibold text-brand-teal underline">
          {tc("back")}
        </Link>
      </div>
    );
  }

  if (loadErr) {
    return <ErrorState title={tc("error")} retryLabel={tc("retry")} onRetry={() => window.location.reload()} />;
  }

  const reportView = (pack: AnalysisPack) => (
    <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
      <p className="text-2xl font-bold text-brand-teal">
        {t("score")}: {pack.overallScore}/100
      </p>
      <p className="text-xs text-[#6B7280]">
        {t("communication")} {pack.communicationScore} · {t("confidence")} {pack.confidenceScore} · {t("clarity")}{" "}
        {pack.clarityScore} · {t("relevance")} {pack.relevanceScore}
      </p>
      <p className="text-sm whitespace-pre-wrap text-[#374151]">
        {normalizeInterviewLocale(locale) === "ar" && pack.overallFeedbackAr.trim()
          ? pack.overallFeedbackAr
          : pack.overallFeedback}
      </p>
    </div>
  );

  if (phase === "readonly" && readonlyPack) {
    return (
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        {reportView(readonlyPack)}
        <Link href="/dashboard/job-seeker/interview" className="text-sm font-semibold text-brand-teal underline">
          {tc("back")}
        </Link>
      </div>
    );
  }

  if (phase === "prep") {
    const ready = camOk && micOk && screenOk && netOk && agree && dataConsent && (kind !== "job" || Boolean(jobId));
    return (
      <div className="mx-auto max-w-2xl space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        <h1 className="text-xl font-bold text-[#0D2137]">{ta("preTitle")}</h1>
        <p className="text-sm text-[#374151]">{t("prepLaraIntro")}</p>
        <ul className="list-inside list-disc space-y-2 text-sm text-[#374151]">
          <li>{ta("ruleTab")}</li>
          <li>{ta("ruleFace")}</li>
          <li>{ta("ruleScreen")}</li>
          <li>{ta("ruleNoAi")}</li>
        </ul>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={camOk} onChange={(e) => setCamOk(e.target.checked)} />
            {ta("checkCamera")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={micOk} onChange={(e) => setMicOk(e.target.checked)} />
            {ta("checkMic")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={screenOk} onChange={(e) => setScreenOk(e.target.checked)} />
            {ta("checkScreen")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={netOk} onChange={(e) => setNetOk(e.target.checked)} />
            {ta("checkNet")}
          </label>
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            {ta("agreeRules")}
          </label>
          <label className="flex items-start gap-2 text-sm text-[#374151]">
            <input type="checkbox" className="mt-1" checked={dataConsent} onChange={(e) => setDataConsent(e.target.checked)} />
            <span>{ta("dataConsentBody")}</span>
          </label>
        </div>
        {kind === "job" && !jobId ? (
          <p className="text-sm text-amber-800">{t("jobIdMissing")}</p>
        ) : null}
        <button
          type="button"
          disabled={!ready || loading}
          onClick={() => void begin()}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? tc("loading") : t("start")}
        </button>
      </div>
    );
  }

  if (phase === "report" && submitPack) {
    if (kind === "practice") {
      return (
        <div className="mx-auto max-w-xl space-y-6 rounded-xl border bg-white p-8 shadow-sm" dir={isRtl ? "rtl" : "ltr"}>
          <h2 className="text-xl font-bold text-[#0D2137]">{t("practiceCompleteTitle")}</h2>
          <p className="text-sm text-[#6B7280]">{t("practiceCompleteBody")}</p>
          {scheduledJobs.length > 0 ? (
            <ul className="space-y-3">
              {scheduledJobs.map((row) => (
                <li key={row.id}>
                  <Link
                    href={{
                      pathname: "/dashboard/job-seeker/interview/job",
                      query: { jobId: row.jobId },
                    }}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#0F4C75] px-4 text-sm font-semibold text-white"
                  >
                    {t("startRealInterview")} — {row.jobTitle ?? t("scheduledJobFallback")}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link
              href="/dashboard/job-seeker/jobs"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-semibold text-white"
            >
              {t("startRealInterview")} →
            </Link>
          )}
          <Link href="/dashboard/job-seeker/interview" className="block text-sm font-semibold text-brand-teal underline">
            {tc("back")}
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        {reportView(submitPack)}
        {!shareLocked ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={share} onChange={(e) => void patchShare(e.target.checked)} />
            {ta("shareWithEmployers")}
          </label>
        ) : null}
        <Link href="/dashboard/job-seeker/interview" className="text-sm font-semibold text-brand-teal underline">
          {tc("back")}
        </Link>
      </div>
    );
  }

  if (phase === "run" && q) {
    const progressPct = questions.length > 0 ? ((idx + 1) / questions.length) * 100 : 0;
    const proctoringWarning = proctoring.warningMessage
      ? ta(`proctoring.${proctoring.warningMessage}` as "proctoring.tab_switch")
      : null;

    return (
      <div className="-mx-4 -my-6 sm:-mx-6">
        {voiceNeedsTap ? (
          <div className="px-4 pt-4">
            <button
              type="button"
              className="w-full rounded-lg border border-brand-teal bg-[#ECFDF5] px-4 py-3 text-sm font-semibold text-brand-teal"
              onClick={() => void replayQuestionAudio()}
            >
              {t("playQuestion")}
            </button>
          </div>
        ) : null}
        {recordError ? (
          <p className="px-4 pt-2 text-center text-sm text-red-300">{recordError}</p>
        ) : null}
        <InterviewRunScreen
          locale={locale}
          isRtl={isRtl}
          laraTtsStatus={laraTtsStatus}
          isListening={isListening}
          answerRecorded={answerRecorded}
          liveTranscript={liveTranscript}
          processingAnswer={processingAnswer}
          questionEn={q.question}
          questionAr={q.questionAr}
          questionIndex={idx}
          questionTotal={questions.length}
          elapsedSec={elapsedSec}
          progressPct={progressPct}
          proctoringWarning={proctoringWarning}
          muted={muted}
          onToggleMute={() => {
            const next = !muted;
            setMuted(next);
            if (next) {
              autoAnswerStopRef.current();
              setIsListening(false);
            }
          }}
          onEndInterview={() => void finalizeInterview()}
          endDisabled={loading || Boolean(proctoring.isFlagged)}
          labels={{
            laraName: t("laraName"),
            laraSubtitle: t("laraSubtitleBrand"),
            laraSpeaking: t("laraSpeaking"),
            listening: t("listening"),
            yourAnswer: t("yourAnswerLabel"),
            processing: t("processing"),
            answerRecorded: t("answerRecorded"),
            questionOf: t("questionProgress"),
            endInterview: t("endInterview"),
            mute: t("muteMic"),
            unmute: t("unmuteMic"),
          }}
        />
      </div>
    );
  }

  return null;
}
