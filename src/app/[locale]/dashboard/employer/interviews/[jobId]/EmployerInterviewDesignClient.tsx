"use client";

import axios from "axios";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  InterviewQuestion,
  JobInterviewTemplate,
} from "@/lib/employer-interview/template";
import { defaultInterviewTemplate, newQuestionId } from "@/lib/employer-interview/template";
import { TARGET_INTERVIEW_QUESTION_COUNT } from "@/lib/employer-interview/ai-questions";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const MAX_QUESTIONS = TARGET_INTERVIEW_QUESTION_COUNT;
const TIME_OPTIONS = [45, 60, 90, 120];

export function EmployerInterviewDesignClient({ jobId }: { jobId: string }) {
  const t = useTranslations("employerInterviewDesign");
  const tc = useTranslations("common");
  const [jobTitle, setJobTitle] = useState("");
  const [template, setTemplate] = useState<JobInterviewTemplate>(defaultInterviewTemplate());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [aiMsgTone, setAiMsgTone] = useState<"ok" | "err">("ok");
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);
  const [resolvedLevel, setResolvedLevel] = useState<"fresher" | "experienced" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
    try {
      const res = await axios.get<{
        success: boolean;
        data: { template: JobInterviewTemplate; jobTitle: string };
      }>(`/api/employer/jobs/${encodeURIComponent(jobId)}/interview-template`);
      if (res.data?.success && res.data.data) {
        setJobTitle(res.data.data.jobTitle);
        const tpl = res.data.data.template;
        setTemplate({
          ...defaultInterviewTemplate(),
          ...tpl,
          experienceLevel: tpl.experienceLevel ?? "auto",
          settings: { ...defaultInterviewTemplate().settings, ...tpl.settings },
        });
      } else setErr(true);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  const countLabel = useMemo(
    () => t("questionCount", { current: String(template.questions.length), max: String(MAX_QUESTIONS) }),
    [t, template.questions.length],
  );

  async function save() {
    setSaving(true);
    try {
      await axios.put(`/api/employer/jobs/${encodeURIComponent(jobId)}/interview-template`, {
        template: {
          ...template,
          settings: {
            ...template.settings,
            autoInviteOnApply: false,
          },
        },
      });
      setAiMsg(t("saved"));
      setAiMsgTone("ok");
    } catch {
      setAiMsg(t("saveError"));
      setAiMsgTone("err");
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    if (aiBusy) return;
    setAiBusy(true);
    setAiMsg(t("generating"));
    setAiMsgTone("ok");
    try {
      const res = await axios.post<{
        success: boolean;
        data?: {
          questions: InterviewQuestion[];
          resolvedLevel: "fresher" | "experienced";
          analysisSummary: string;
        };
        error?: string;
      }>(`/api/employer/jobs/${encodeURIComponent(jobId)}/interview-template/regenerate`, {
        experienceLevel: "auto",
        count: MAX_QUESTIONS,
      });
      if (res.data.success && res.data.data?.questions?.length) {
        setTemplate((prev) => ({
          ...prev,
          mode: "ai",
          experienceLevel: "auto",
          questions: res.data.data!.questions.slice(0, MAX_QUESTIONS),
        }));
        setResolvedLevel(res.data.data.resolvedLevel);
        setAnalysisSummary(res.data.data.analysisSummary);
        setAiMsg(t("aiSuccess"));
        setAiMsgTone("ok");
      } else {
        setAiMsg(t("aiError"));
        setAiMsgTone("err");
      }
    } catch {
      setAiMsg(t("aiError"));
      setAiMsgTone("err");
    } finally {
      setAiBusy(false);
    }
  }

  function addBlank() {
    setTemplate((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: newQuestionId(),
          type: "voice" as const,
          prompt: "",
          timeLimitSec: 90,
          stage: "experience" as const,
        },
      ].slice(0, MAX_QUESTIONS),
    }));
  }

  function moveQuestion(id: string, dir: -1 | 1) {
    setTemplate((prev) => {
      const idx = prev.questions.findIndex((q) => q.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= prev.questions.length) return prev;
      const next = [...prev.questions];
      const tmp = next[idx];
      next[idx] = next[j]!;
      next[j] = tmp!;
      return { ...prev, questions: next };
    });
  }

  function removeQuestion(id: string) {
    setTemplate((prev) => ({ ...prev, questions: prev.questions.filter((q) => q.id !== id) }));
  }

  function updateQuestion(id: string, patch: Partial<InterviewQuestion>) {
    setTemplate((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));
  }

  if (loading) return <LoadingSpinner size="full" label={tc("loading")} />;
  if (err) return <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={load} />;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard/employer/interviews" className="text-sm font-semibold text-[#7C3AED] underline">
            {t("back")}
          </Link>
          <Button type="button" className="min-h-11 bg-[#7C3AED] hover:brightness-105" loading={saving} onClick={() => void save()}>
            {t("save")}
          </Button>
        </div>

        <h1 className="text-xl font-bold text-[#0D2137]">{t("header", { title: jobTitle })}</h1>

        <div className="inline-flex rounded-lg border border-[#E5E7EB] p-1">
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              template.mode === "ai" ? "bg-[#7C3AED] text-white" : "text-[#374151]"
            }`}
            onClick={() => setTemplate((p) => ({ ...p, mode: "ai" }))}
          >
            {t("modeAi")}
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              template.mode === "custom" ? "bg-[#7C3AED] text-white" : "text-[#374151]"
            }`}
            onClick={() => setTemplate((p) => ({ ...p, mode: "custom" }))}
          >
            {t("modeCustom")}
          </button>
        </div>

        {template.mode === "ai" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-[#7C3AED] text-[#7C3AED]"
              disabled={aiBusy}
              onClick={() => void generate()}
            >
              {aiBusy ? t("generating") : t("generate")}
            </Button>
            {analysisSummary ? (
              <p className="text-xs text-[#6B7280]">
                {resolvedLevel === "fresher"
                  ? t("levelFresher")
                  : resolvedLevel === "experienced"
                    ? t("levelExperienced")
                    : null}
                {resolvedLevel ? " · " : null}
                {analysisSummary}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[#374151]">{t("customBlurb")}</p>
        )}

        {aiMsg ? (
          <p className={`text-sm ${aiMsgTone === "err" ? "text-red-600" : "text-[#1D9E75]"}`}>{aiMsg}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#0D2137]">{countLabel}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addBlank()}
            disabled={template.questions.length >= MAX_QUESTIONS}
          >
            {t("addVoice")}
          </Button>
        </div>

        <ul className="space-y-3">
          {template.questions.map((q, idx) => (
            <li key={q.id} className="rounded-xl border border-[#EEF2F7] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase text-[#7C3AED]">
                  {q.stage ? `${q.stage} · ` : ""}
                  #{idx + 1}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => moveQuestion(q.id, -1)}
                    disabled={idx === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => moveQuestion(q.id, 1)}
                    disabled={idx === template.questions.length - 1}
                  >
                    ↓
                  </button>
                  <button type="button" className="rounded border px-2 py-1 text-xs text-red-600" onClick={() => removeQuestion(q.id)}>
                    ×
                  </button>
                </div>
              </div>
              <textarea
                className="mt-2 w-full rounded-lg border p-2 text-sm"
                rows={3}
                value={q.prompt}
                onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                placeholder={t("promptPh")}
              />
              <label className="mt-2 block text-xs font-medium text-[#6B7280]">{t("followUpLabel")}</label>
              <textarea
                className="mt-1 w-full rounded-lg border p-2 text-sm"
                rows={2}
                value={q.followUpPrompt ?? ""}
                onChange={(e) => updateQuestion(q.id, { followUpPrompt: e.target.value })}
                placeholder={t("followUpPh")}
              />
              <label className="mt-2 block text-xs font-medium text-[#6B7280]">{t("timeLimit")}</label>
              <select
                className="mt-1 rounded border px-2 py-1 text-sm"
                value={q.timeLimitSec}
                onChange={(e) => updateQuestion(q.id, { timeLimitSec: Number(e.target.value) })}
              >
                {TIME_OPTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}s
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <h3 className="font-bold text-[#0D2137]">{t("settingsTitle")}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              {t("maxDuration")}
              <input
                type="number"
                className="mt-1 w-full rounded border px-2 py-1"
                min={5}
                max={120}
                value={template.settings.maxDurationMin}
                onChange={(e) =>
                  setTemplate((p) => ({
                    ...p,
                    settings: { ...p.settings, maxDurationMin: Number(e.target.value) || 45 },
                  }))
                }
              />
            </label>
            <label className="text-sm">
              {t("passScore")}
              <input
                type="number"
                className="mt-1 w-full rounded border px-2 py-1"
                min={0}
                max={100}
                value={template.settings.passScorePercent}
                onChange={(e) =>
                  setTemplate((p) => ({
                    ...p,
                    settings: { ...p.settings, passScorePercent: Number(e.target.value) || 50 },
                  }))
                }
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-[#6B7280]">{t("durationHint")}</p>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 h-fit space-y-4 rounded-xl border border-[#EDE9FE] bg-[#FAF5FF] p-6">
        <p className="text-sm font-semibold text-[#5B21B6]">{t("previewTitle")}</p>
        <p className="text-xs text-[#6B7280]">{t("previewHint")}</p>
        <div className="rounded-lg border border-[#DDD6FE] bg-white p-4 shadow-inner">
          <p className="text-xs font-bold uppercase text-[#7C3AED]">{jobTitle}</p>
          <p className="mt-3 text-sm font-medium text-[#111827]">
            {template.questions[0]?.prompt || t("previewPlaceholder")}
          </p>
          {template.questions[0]?.followUpPrompt ? (
            <p className="mt-2 text-xs text-[#6B7280]">
              <span className="font-semibold text-[#7C3AED]">{t("followUpPreview")}: </span>
              {template.questions[0].followUpPrompt}
            </p>
          ) : null}
          <div className="mt-4 flex items-center justify-between text-xs text-[#6B7280]">
            <span>{t("mockTimer", { sec: String(template.questions[0]?.timeLimitSec ?? 90) })}</span>
            <span className="rounded-full bg-[#EDE9FE] px-2 py-0.5 font-semibold text-[#5B21B6]">Voice</span>
          </div>
          <div className="mt-6 h-24 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-xs text-[#9CA3AF]">
            {t("mockRecording")}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-[#6B7280]">{t("adaptiveHint")}</p>
      </aside>
    </div>
  );
}
