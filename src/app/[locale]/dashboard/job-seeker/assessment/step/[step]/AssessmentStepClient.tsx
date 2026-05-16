"use client";

import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProctoring } from "@/hooks/useProctoring";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";

type QuestionItem = {
  id: string;
  type: "multiple_choice" | "text" | "rating" | "scenario";
  category: string;
  question: string;
  questionAr: string;
  options: string[] | null;
  optionsAr: string[] | null;
  correctAnswer: string | null;
  timeLimit: number;
};

type StepResult = {
  stepScore: number;
  allStepsComplete: boolean;
  overallScore: number | null;
  passed: boolean;
  strengths: Array<{ title: string; description: string }>;
  weaknesses: Array<{ title: string; tip: string }>;
  stepFeedback: string;
  stepFeedbackAr: string;
};

export default function AssessmentStepClient({ stepNumber }: { stepNumber: number }) {
  const t = useTranslations("assessment");
  const tc = useTranslations("common");
  const locale = useLocale();
  const session = useSession();
  const searchParams = useSearchParams();
  const forceRetake = searchParams.get("retake") === "1";

  const [phase, setPhase] = useState<"prep" | "run" | "report" | "suspended">("prep");
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [stepTimeLimit, setStepTimeLimit] = useState(15 * 60);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [camOk, setCamOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [screenOk, setScreenOk] = useState(false);
  const [netOk, setNetOk] = useState(false);
  const [agree, setAgree] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [submitPack, setSubmitPack] = useState<StepResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState(false);

  const procRef = useRef(false);

  const proctoring = useProctoring({
    enabled: phase === "run" && Boolean(assessmentId),
    assessmentId: assessmentId ?? undefined,
    displayStream,
    cameraStream,
    onSuspended: (info) => {
      setSuspendedUntil(info.cooldownUntil);
      setPhase("suspended");
      procRef.current = false;
      displayStream?.getTracks().forEach((tr) => tr.stop());
      cameraStream?.getTracks().forEach((tr) => tr.stop());
      setDisplayStream(null);
      setCameraStream(null);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    },
  });

  useEffect(() => {
    if (phase !== "run" || !assessmentId || procRef.current) return;
    procRef.current = true;
    void proctoring.startSession().catch(() => {
      procRef.current = false;
    });
  }, [phase, assessmentId, proctoring]);

  useEffect(() => {
    if (phase !== "run" || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [phase, timeLeft]);

  useEffect(() => {
    if (phase === "run" && timeLeft === 0 && startedAt && questions.length > 0 && assessmentId) {
      void finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, startedAt]);

  useEffect(() => {
    return () => {
      displayStream?.getTracks().forEach((tr) => tr.stop());
      cameraStream?.getTracks().forEach((tr) => tr.stop());
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
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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
    void fetch("/api/assessment/progress", { credentials: "include" })
      .then(
        (r) =>
          r.json() as Promise<{
            success?: boolean;
            data?: {
              assessmentId: string | null;
              currentStep: number | null;
              proctoringSuspended?: boolean;
              proctoringSuspendedUntil?: string | null;
            };
          }>,
      )
      .then((j) => {
        if (cancel || !j.success || !j.data) return;
        if (j.data.proctoringSuspended && j.data.proctoringSuspendedUntil) {
          setSuspendedUntil(j.data.proctoringSuspendedUntil);
          setPhase("suspended");
          return;
        }
        if (!j.data.assessmentId) return;
        setAssessmentId(j.data.assessmentId);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [stepNumber]);

  const q = questions[idx];
  const isRtl = locale === "ar" || locale === "ur";
  const qText = isRtl && q?.questionAr ? q.questionAr : (q?.question ?? "");

  async function begin() {
    if (!camOk || !micOk || !screenOk || !netOk || !agree || !dataConsent) return;
    setLoading(true);
    setLoadErr(false);
    let dispLocal: MediaStream | null = null;
    let camLocal: MediaStream | null = null;
    try {
      const consentRes = await fetch("/api/job-seeker/consent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "assessment" }),
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

      const gen = await fetch("/api/assessment/generate-questions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepNumber, forceRetake, assessmentId: assessmentId ?? undefined }),
      });
      const gj = (await gen.json()) as {
        success?: boolean;
        data?: { assessmentId: string; questions: QuestionItem[]; stepTimeLimitSec: number };
        error?: string;
      };
      if (gen.status === 403 && gj.error === "proctoring_suspended") {
        const until = (gj as { cooldownUntil?: string }).cooldownUntil ?? null;
        setSuspendedUntil(until);
        setPhase("suspended");
        return;
      }
      if (!gen.ok || !gj.success || !gj.data) throw new Error(gj.error ?? "generate");

      setAssessmentId(gj.data.assessmentId);
      setQuestions(gj.data.questions);
      setStepTimeLimit(gj.data.stepTimeLimitSec);
      setIdx(0);
      setAnswers({});
      setStartedAt(Date.now());
      setTimeLeft(gj.data.stepTimeLimitSec);
      setPhase("run");
    } catch {
      setLoadErr(true);
      dispLocal?.getTracks().forEach((tr) => tr.stop());
      camLocal?.getTracks().forEach((tr) => tr.stop());
      setDisplayStream(null);
      setCameraStream(null);
    } finally {
      setLoading(false);
    }
  }

  async function nextQuestion() {
    if (!q || !assessmentId) return;
    const nextIdx = idx + 1;
    if (nextIdx >= questions.length) {
      await finish();
      return;
    }
    setIdx(nextIdx);
    setTimeLeft(questions[nextIdx]?.timeLimit ?? 120);
  }

  async function finish() {
    if (!assessmentId) return;
    setLoading(true);
    const durationSec = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    const answerList = questions.map((qq) => ({
      questionId: qq.id,
      value: answers[qq.id] ?? "",
    }));
    try {
      const res = await fetch("/api/assessment/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          step: stepNumber,
          answers: answerList,
          duration: durationSec,
          isFlagged: proctoring.isFlagged,
          proctoringFlags: { warnings: proctoring.warningCount },
        }),
      });
      const j = (await res.json()) as { success?: boolean; data?: StepResult };
      if (!res.ok || !j.success || !j.data) throw new Error("submit");
      setSubmitPack(j.data);
      setPhase("report");
      displayStream?.getTracks().forEach((tr) => tr.stop());
      cameraStream?.getTracks().forEach((tr) => tr.stop());
      setDisplayStream(null);
      setCameraStream(null);
      void proctoring.stopSession();
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }

  if (!session.data?.user) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (loadErr) {
    return <ErrorState title={tc("error")} retryLabel={tc("retry")} onRetry={() => window.location.reload()} />;
  }

  if (phase === "suspended") {
    const untilLabel = suspendedUntil
      ? new Date(suspendedUntil).toLocaleString(isRtl ? "ar" : "en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";
    return (
      <div className="mx-auto max-w-2xl space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        <h1 className="text-xl font-bold text-rose-900">{t("proctoring.suspendedTitle")}</h1>
        <p className="text-sm text-[#374151]">{t("proctoring.suspendedBody")}</p>
        {untilLabel ? (
          <p className="text-sm font-semibold text-rose-800">
            {t("proctoring.suspendedUntil", { datetime: untilLabel })}
          </p>
        ) : null}
        <Link
          href="/dashboard/job-seeker/assessment"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-semibold text-white"
        >
          {t("backToAssessmentHome")}
        </Link>
      </div>
    );
  }

  if (phase === "prep") {
    const ready = camOk && micOk && screenOk && netOk && agree && dataConsent;
    return (
      <div className="mx-auto max-w-2xl space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        <p className="text-sm font-semibold text-brand-teal">
          {t("stepLabel", { n: stepNumber })} — {t(`steps.step${stepNumber}.title` as never)}
        </p>
        <h1 className="text-xl font-bold text-[#0D2137]">{t("preTitle")}</h1>
        <p className="text-sm text-[#6B7280]">{t(`steps.step${stepNumber}.desc` as never)}</p>
        <p className="text-xs text-[#6B7280]">
          {t("stepTimeLimit", { min: Math.round(stepTimeLimit / 60) })}
        </p>
        <ul className="list-inside list-disc space-y-2 text-sm text-[#374151]">
          <li>{t("ruleTab")}</li>
          <li>{t("ruleFace")}</li>
          <li>{t("ruleScreen")}</li>
          <li>{t("ruleNoAi")}</li>
        </ul>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={camOk} onChange={(e) => setCamOk(e.target.checked)} />
            {t("checkCamera")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={micOk} onChange={(e) => setMicOk(e.target.checked)} />
            {t("checkMic")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={screenOk} onChange={(e) => setScreenOk(e.target.checked)} />
            {t("checkScreen")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={netOk} onChange={(e) => setNetOk(e.target.checked)} />
            {t("checkNet")}
          </label>
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            {t("agreeRules")}
          </label>
          <label className="flex items-start gap-2 text-sm text-[#374151]">
            <input
              type="checkbox"
              className="mt-1"
              checked={dataConsent}
              onChange={(e) => setDataConsent(e.target.checked)}
            />
            <span>{t("dataConsentBody")}</span>
          </label>
        </div>
        <button
          type="button"
          disabled={!ready || loading}
          onClick={() => void begin()}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? tc("loading") : t("start")}
        </button>
        <Link href="/dashboard/job-seeker/assessment" className="block text-sm text-brand-teal underline">
          {tc("back")}
        </Link>
      </div>
    );
  }

  if (phase === "report" && submitPack) {
    const feedback = isRtl && submitPack.stepFeedbackAr ? submitPack.stepFeedbackAr : submitPack.stepFeedback;
    return (
      <div className="mx-auto max-w-2xl space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        <h2 className="text-2xl font-bold text-[#0D2137]">{t("stepCompleteTitle")}</h2>
        <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-brand-teal text-3xl font-bold text-brand-teal">
          {submitPack.stepScore}
        </div>
        <p className="text-sm text-[#6B7280]">{feedback}</p>
        {submitPack.allStepsComplete ? (
          <p className="font-semibold text-brand-teal">
            {t("allStepsDone", { score: submitPack.overallScore ?? 0 })}
          </p>
        ) : (
          <p className="text-sm text-[#374151]">{t("nextStepHint")}</p>
        )}
        <Link
          href="/dashboard/job-seeker/assessment"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-semibold text-white"
        >
          {t("backToAssessmentHome")}
        </Link>
      </div>
    );
  }

  if (phase === "run" && q) {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return (
      <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
        {proctoring.isFlagged ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950">
            <p className="font-semibold">{t("proctoring.suspendedTitle")}</p>
            <p className="mt-1">{t("proctoring.suspendedBody")}</p>
          </div>
        ) : proctoring.warningMessage ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">
              {t("proctoring.warningStrike", {
                current: proctoring.warningCount,
                max: proctoring.maxWarnings,
              })}{" "}
              {t(`proctoring.${proctoring.warningMessage}` as "proctoring.tab_switch")}
            </p>
            {proctoring.warningsRemaining > 0 ? (
              <p className="mt-1 text-xs">
                {t("proctoring.chancesLeft", { count: proctoring.warningsRemaining })}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#6B7280]">
          <span>
            {t("stepLabel", { n: stepNumber })} · {t("progress", { current: String(idx + 1), total: String(questions.length) })}
          </span>
          <span>
            {t("timer", { sec: `${mins}:${secs.toString().padStart(2, "0")}` })}
          </span>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-lg font-semibold text-[#0D2137]">{qText}</p>
          {q.type === "multiple_choice" && q.options ? (
            <div className="mt-4 space-y-2">
              {(isRtl && q.optionsAr ? q.optionsAr : q.options).map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : null}
          {q.type === "text" || q.type === "scenario" ? (
            <textarea
              className="mt-4 w-full rounded-lg border p-3 text-sm"
              rows={5}
              value={String(answers[q.id] ?? "")}
              onChange={(e) => {
                const prev = String(answers[q.id] ?? "");
                proctoring.onAnswerInput(e.target.value.slice(prev.length));
                setAnswers((a) => ({ ...a, [q.id]: e.target.value }));
              }}
            />
          ) : null}
        </div>
        <button
          type="button"
          disabled={loading || proctoring.isFlagged}
          onClick={() => void nextQuestion()}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-semibold text-white disabled:opacity-50"
        >
          {idx + 1 >= questions.length ? t("complete") : tc("next")}
        </button>
        <video
          className="fixed bottom-4 end-4 z-10 h-28 w-40 rounded-lg border object-cover shadow-md"
          autoPlay
          muted
          playsInline
          ref={(el) => {
            if (el && cameraStream) el.srcObject = cameraStream;
          }}
        />
      </div>
    );
  }

  return <LoadingSpinner size="full" label={tc("loading")} />;
}
