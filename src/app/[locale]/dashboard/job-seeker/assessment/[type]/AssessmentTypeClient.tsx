"use client";

import type { AssessmentType } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
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

type ScorePack = {
  totalScore: number;
  skillsScore: number;
  communicationScore: number;
  behavioralScore: number;
  industryFitScore: number;
  strengths: Array<{ title: string; description: string; titleAr: string; descriptionAr: string }>;
  weaknesses: Array<{ title: string; description: string; tip: string; titleAr: string; tipAr: string }>;
  recommendations: Array<{ type: string; title: string; description: string; titleAr: string }>;
  overallFeedback: string;
  overallFeedbackAr: string;
};

function coerceDetailPack(d: {
  totalScore: number | null;
  skillsScore: number | null;
  communicationScore: number | null;
  behavioralScore: number | null;
  industryFitScore: number | null;
  strengths: unknown;
  weaknesses: unknown;
  recommendations: unknown;
  detailedReport: unknown;
}): ScorePack {
  const strengths = Array.isArray(d.strengths) ? (d.strengths as ScorePack["strengths"]) : [];
  const weaknesses = Array.isArray(d.weaknesses) ? (d.weaknesses as ScorePack["weaknesses"]) : [];
  const recommendations = Array.isArray(d.recommendations)
    ? (d.recommendations as ScorePack["recommendations"])
    : [];
  let overallFeedback = "";
  let overallFeedbackAr = "";
  if (d.detailedReport && typeof d.detailedReport === "object") {
    const dr = d.detailedReport as Record<string, unknown>;
    if (typeof dr.overallFeedback === "string") overallFeedback = dr.overallFeedback;
    if (typeof dr.overallFeedbackAr === "string") overallFeedbackAr = dr.overallFeedbackAr;
  }
  return {
    totalScore: d.totalScore ?? 0,
    skillsScore: d.skillsScore ?? 0,
    communicationScore: d.communicationScore ?? 0,
    behavioralScore: d.behavioralScore ?? 0,
    industryFitScore: d.industryFitScore ?? 0,
    strengths,
    weaknesses,
    recommendations,
    overallFeedback,
    overallFeedbackAr,
  };
}

export default function AssessmentTypeClient({
  assessmentType,
}: {
  assessmentType: AssessmentType;
}) {
  const t = useTranslations("assessment");
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
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({});
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
  const [submitPack, setSubmitPack] = useState<ScorePack | null>(null);
  const [share, setShare] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [readonlyDetail, setReadonlyDetail] = useState<ScorePack | null>(null);
  const [shareLocked, setShareLocked] = useState(false);

  const procRef = useRef(false);

  const proctoring = useProctoring({
    enabled: phase === "run" && Boolean(assessmentId),
    assessmentId: assessmentId ?? undefined,
    displayStream,
    cameraStream,
    onFlagged: () => {
      setPhase("prep");
      procRef.current = false;
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
    void (async () => {
      try {
        const res = await fetch("/api/assessment/summary", { credentials: "include" });
        const j = (await res.json()) as {
          success?: boolean;
          data?: {
            assessments: Array<{ id: string; type: string; status: string; totalScore: number | null }>;
          };
        };
        if (!res.ok || !j.success || !j.data) return;
        const latest = j.data.assessments.find((a) => a.type === assessmentType && a.status === "COMPLETED");
        if (!latest || cancel || forceRetake) return;
        const d = await fetch(`/api/assessment/detail?id=${encodeURIComponent(latest.id)}`, {
          credentials: "include",
        });
        const dj = (await d.json()) as {
          success?: boolean;
          data?: {
            totalScore: number | null;
            skillsScore: number | null;
            communicationScore: number | null;
            behavioralScore: number | null;
            industryFitScore: number | null;
            strengths: unknown;
            weaknesses: unknown;
            recommendations: unknown;
            detailedReport: unknown;
            shareWithEmployers?: boolean;
          };
        };
        if (!d.ok || !dj.success || !dj.data || cancel) return;
        setReadonlyDetail(coerceDetailPack(dj.data));
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
  }, [assessmentType, forceRetake]);

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
      if (!consentRes.ok) {
        throw new Error("consent");
      }

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
        body: JSON.stringify({ type: assessmentType, forceRetake }),
      });
      const gj = (await gen.json()) as {
        success?: boolean;
        data?: { assessmentId: string; questions: QuestionItem[] };
        error?: string;
      };
      if (!gen.ok || !gj.success || !gj.data) {
        if (gen.status === 403 && gj.error === "consent_required") {
          throw new Error("consent_required");
        }
        throw new Error(gj.error ?? "generate");
      }
      setAssessmentId(gj.data.assessmentId);
      setQuestions(gj.data.questions);
      setIdx(0);
      setAnswers({});
      setStartedAt(Date.now());
      setTimeLeft(gj.data.questions[0]?.timeLimit ?? 120);
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
          answers: answerList,
          duration: durationSec,
          isFlagged: proctoring.isFlagged,
          proctoringFlags: { warnings: proctoring.warningCount },
        }),
      });
      const j = (await res.json()) as { success?: boolean; data?: ScorePack & { assessmentId: string } };
      if (!res.ok || !j.success || !j.data) throw new Error("submit");
      const { assessmentId: _aid, ...pack } = j.data;
      setSubmitPack(pack);
      setPhase("report");
      displayStream?.getTracks().forEach((tr) => tr.stop());
      cameraStream?.getTracks().forEach((tr) => tr.stop());
      setDisplayStream(null);
      setCameraStream(null);
      void proctoring.stopSession();
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }

  async function patchShare(next: boolean) {
    if (!assessmentId) return;
    await fetch("/api/assessment/share", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "assessment", id: assessmentId, share: next }),
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

  if (phase === "readonly" && readonlyDetail) {
    const s = readonlyDetail;
    return (
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        <ReportView t={t} pack={s} />
        <Link href="/dashboard/job-seeker/assessment" className="text-sm font-semibold text-brand-teal underline">
          {tc("back")}
        </Link>
      </div>
    );
  }

  if (phase === "prep") {
    const ready = camOk && micOk && screenOk && netOk && agree && dataConsent;
    return (
      <div className="mx-auto max-w-2xl space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        <h1 className="text-xl font-bold text-[#0D2137]">{t("preTitle")}</h1>
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
      </div>
    );
  }

  if (phase === "report" && submitPack) {
    return (
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        <ReportView t={t} pack={submitPack} />
        {!shareLocked ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={share} onChange={(e) => void patchShare(e.target.checked)} />
            {t("shareWithEmployers")}
          </label>
        ) : null}
        <Link href="/dashboard/job-seeker/assessment" className="text-sm font-semibold text-brand-teal underline">
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
            {t(`proctoring.${proctoring.warningMessage}` as "proctoring.tab_switch")}
          </div>
        ) : null}
        {proctoring.isFlagged ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
            {t("proctoring.flagged")}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#6B7280]">
          <span>
            {t("progress", { current: String(idx + 1), total: String(questions.length) })}
          </span>
          <span>{t("timer", { sec: String(timeLeft) })}</span>
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
                const val = e.target.value;
                proctoring.onAnswerInput(val.slice(prev.length));
                setAnswers((a) => ({ ...a, [q.id]: val }));
              }}
            />
          ) : null}
          {q.type === "rating" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="min-h-10 min-w-10 rounded-lg border text-sm font-semibold"
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                >
                  {n}
                </button>
              ))}
            </div>
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
        <aside className="fixed bottom-4 end-4 z-20 rounded-lg border bg-white/95 p-3 text-xs shadow-md">
          <p className="font-semibold text-[#0D2137]">{t("proctoring.panelTitle")}</p>
          <p>
            {t("proctoring.camera")}: {proctoring.cameraPreviewLive ? "🟢" : "🔴"}
          </p>
          <p>
            {t("proctoring.screen")}: {proctoring.screenTrackLive ? "🟢" : "🔴"}
          </p>
          <p>
            {t("proctoring.fullscreen")}: {proctoring.fullscreenActive ? "🟢" : "🔴"}
          </p>
        </aside>
        <video
          className="fixed bottom-20 end-4 z-10 h-28 w-40 rounded-lg border object-cover shadow-md"
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

function ReportView({
  t,
  pack,
}: {
  t: ReturnType<typeof useTranslations>;
  pack: ScorePack;
}) {
  const color =
    pack.totalScore >= 80 ? "text-emerald-600" : pack.totalScore >= 60 ? "text-amber-600" : "text-red-600";
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0D2137]">{t("complete")}</h2>
      <div className={`flex h-32 w-32 items-center justify-center rounded-full border-4 text-3xl font-bold ${color}`}>
        {pack.totalScore}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <ScoreBar label={t("skills")} value={pack.skillsScore} />
        <ScoreBar label={t("comm")} value={pack.communicationScore} />
        <ScoreBar label={t("behavior")} value={pack.behavioralScore} />
        <ScoreBar label={t("industry")} value={pack.industryFitScore} />
      </div>
      <section>
        <h3 className="font-bold text-[#0D2137]">{t("strengths")}</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {pack.strengths.slice(0, 3).map((s) => (
            <li key={s.title}>
              ✅ {s.title}: {s.description}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-bold text-[#0D2137]">{t("improvements")}</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {pack.weaknesses.slice(0, 3).map((w) => (
            <li key={w.title}>
              ⚠️ {w.title}: {w.tip}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-bold text-[#0D2137]">{t("recommendations")}</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {pack.recommendations.slice(0, 3).map((r) => (
            <li key={r.title}>
              {r.type}: {r.title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm font-medium text-[#374151]">
        {label}: {value}/100
      </p>
      <div className="mt-1 h-2 w-full rounded bg-gray-100">
        <div className="h-2 rounded bg-brand-teal" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
