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
  return "";
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

async function recordClip(stream: MediaStream, maxMs: number): Promise<Blob> {
  const mime = pickRecorderMime();
  const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  return await new Promise((resolve, reject) => {
    rec.onerror = () => reject(new Error("record"));
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: mime || "audio/webm" }));
    };
    try {
      rec.start();
    } catch {
      reject(new Error("record"));
      return;
    }
    window.setTimeout(() => {
      try {
        rec.stop();
      } catch {
        reject(new Error("record"));
      }
    }, maxMs);
  });
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

  const [phase, setPhase] = useState<"prep" | "run" | "report" | "readonly">("prep");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [liveTranscript, setLiveTranscript] = useState("");
  const [listeningOn, setListeningOn] = useState(false);
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
  const fullRecorderRef = useRef<MediaRecorder | null>(null);
  const fullCloneRef = useRef<MediaStream | null>(null);
  const fullChunksRef = useRef<BlobPart[]>([]);
  const speechStopRef = useRef<(() => void) | null>(null);
  const speechFinalRef = useRef("");

  const [submitPack, setSubmitPack] = useState<AnalysisPack | null>(null);
  const [share, setShare] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [readonlyPack, setReadonlyPack] = useState<AnalysisPack | null>(null);
  const [shareLocked, setShareLocked] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [processingAnswer, setProcessingAnswer] = useState(false);

  const procRef = useRef(false);

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

  useEffect(() => {
    setSpeechSupported(getSpeechRecognitionCtor() != null);
  }, []);

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
    return () => {
      speechStopRef.current?.();
      displayStream?.getTracks().forEach((tr) => tr.stop());
      cameraStream?.getTracks().forEach((tr) => tr.stop());
      micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      fullCloneRef.current?.getTracks().forEach((tr) => tr.stop());
      try {
        fullRecorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      void proctoring.stopSession();
    };
  }, [cameraStream, displayStream, proctoring]);

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

  const isRtl = locale === "ar" || locale === "ur";
  const q = questions[idx];
  const qText = isRtl && q?.questionAr ? q.questionAr : (q?.question ?? "");

  const stopSpeechOnly = useCallback(() => {
    speechStopRef.current?.();
    speechStopRef.current = null;
    setListeningOn(false);
  }, []);

  useEffect(() => {
    if (phase !== "run" || !questions[idx]) return;
    stopSpeechOnly();
    const curId = questions[idx].id;
    setLiveTranscript(transcripts[curId] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when navigating questions / entering run phase
  }, [idx, phase, questions, stopSpeechOnly]);

  async function playQuestionAudio() {
    if (!qText.trim()) return;
    try {
      const res = await fetch("/api/interview/text-to-speech", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: qText.slice(0, 4000), locale }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      /* ignore */
    }
  }

  function startBrowserListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || !q) return;
    stopSpeechOnly();
    speechFinalRef.current = transcripts[q.id] ?? "";
    const rec = new Ctor();
    rec.lang = locale === "ar" || locale === "ur" ? "ar-SA" : "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const piece = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) {
          speechFinalRef.current = `${speechFinalRef.current} ${piece}`.trim();
        } else {
          interim += piece;
        }
      }
      setLiveTranscript(`${speechFinalRef.current} ${interim}`.trim());
    };
    try {
      rec.start();
    } catch {
      return;
    }
    speechStopRef.current = () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
    setListeningOn(true);
  }

  async function transcribeWithAiClip() {
    if (!q || !micStreamRef.current || processingAnswer) return;
    setProcessingAnswer(true);
    stopSpeechOnly();
    try {
      const clone = micStreamRef.current.clone();
      const blob = await recordClip(clone, Math.min((q.timeLimit ?? 120) * 1000, 120_000));
      const fd = new FormData();
      fd.append("file", blob, "clip.webm");
      fd.append("locale", locale);
      const res = await fetch("/api/interview/transcribe", { method: "POST", body: fd, credentials: "include" });
      const j = (await res.json()) as { success?: boolean; data?: { text: string } };
      if (!res.ok || !j.success || !j.data?.text) throw new Error("x");
      const text = j.data.text.trim();
      setTranscripts((prev) => ({ ...prev, [q.id]: text }));
      setLiveTranscript(text);
    } catch {
      setLoadErr(true);
    } finally {
      setProcessingAnswer(false);
    }
  }

  async function begin() {
    if (!camOk || !micOk || !screenOk || !netOk || !agree || !dataConsent) return;
    if (kind === "job" && !jobId) return;
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
          ...(kind === "job" && jobId ? { jobId } : {}),
        }),
      });
      const gj = (await gen.json()) as {
        success?: boolean;
        data?: { interviewId: string; questions: QuestionItem[] };
        error?: string;
      };
      if (!gen.ok || !gj.success || !gj.data) {
        if (gen.status === 403 && gj.error === "consent_required") throw new Error("consent_required");
        throw new Error(gj.error ?? "generate");
      }
      setInterviewId(gj.data.interviewId);
      setQuestions(gj.data.questions);
      setIdx(0);
      setTranscripts({});
      setStartedAt(Date.now());
      setTimeLeft(gj.data.questions[0]?.timeLimit ?? 120);
      setPhase("run");
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
    stopSpeechOnly();
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

  async function nextQuestion() {
    if (!q || !interviewId) return;
    stopSpeechOnly();
    const finalText = (liveTranscript.trim() || transcripts[q.id] || "").trim();
    setTranscripts((prev) => ({ ...prev, [q.id]: finalText }));

    const nextIdx = idx + 1;
    if (nextIdx >= questions.length) {
      await finalizeInterview();
      return;
    }
    setIdx(nextIdx);
    setLiveTranscript(transcripts[questions[nextIdx].id] ?? "");
    setTimeLeft(questions[nextIdx]?.timeLimit ?? 120);
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
        {isRtl && pack.overallFeedbackAr.trim() ? pack.overallFeedbackAr : pack.overallFeedback}
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
        <p className="text-sm text-[#374151]">{t("prepVoiceHint")}</p>
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
    return (
      <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
        {proctoring.warningMessage ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {ta(`proctoring.${proctoring.warningMessage}` as "proctoring.tab_switch")}
          </div>
        ) : null}
        {proctoring.isFlagged ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
            {ta("proctoring.flagged")}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#6B7280]">
          <span>
            {ta("progress", { current: String(idx + 1), total: String(questions.length) })}
          </span>
          <span>{ta("timer", { sec: String(timeLeft) })}</span>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-lg font-semibold text-[#0D2137]">{qText}</p>
          {q.tips ? <p className="mt-2 text-xs text-[#6B7280]">{q.tips}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#0D2137] hover:bg-[#F9FAFB]"
              onClick={() => void playQuestionAudio()}
            >
              {t("playQuestion")}
            </button>
            {speechSupported ? (
              <button
                type="button"
                disabled={Boolean(proctoring.isFlagged)}
                className="rounded-lg bg-[#0F4C75] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => (listeningOn ? stopSpeechOnly() : startBrowserListening())}
              >
                {listeningOn ? t("stopListening") : t("startListening")}
              </button>
            ) : (
              <span className="text-xs text-amber-800">{t("speechNotSupported")}</span>
            )}
            <button
              type="button"
              disabled={processingAnswer || Boolean(proctoring.isFlagged)}
              className="rounded-lg border border-brand-teal px-3 py-2 text-sm font-semibold text-brand-teal disabled:opacity-50"
              onClick={() => void transcribeWithAiClip()}
            >
              {processingAnswer ? t("processing") : t("transcribeWithAi")}
            </button>
          </div>
          <label className="mt-4 block text-xs font-medium text-[#374151]">{t("yourAnswerLabel")}</label>
          <textarea
            className="mt-1 w-full rounded-lg border p-3 text-sm"
            rows={5}
            value={liveTranscript}
            onChange={(e) => setLiveTranscript(e.target.value)}
            placeholder={t("answerPlaceholder")}
          />
        </div>
        <button
          type="button"
          disabled={loading || Boolean(proctoring.isFlagged)}
          onClick={() => void nextQuestion()}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? tc("loading") : idx + 1 >= questions.length ? t("finishInterview") : tc("next")}
        </button>
      </div>
    );
  }

  return null;
}
