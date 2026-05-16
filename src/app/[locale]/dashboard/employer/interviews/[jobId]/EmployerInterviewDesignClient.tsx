"use client";

import axios from "axios";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { InterviewQuestion, InterviewQuestionType, JobInterviewTemplate } from "@/lib/employer-interview/template";
import { defaultInterviewTemplate, newQuestionId } from "@/lib/employer-interview/template";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const MAX_QUESTIONS = 12;
const TIME_OPTIONS = [30, 60, 120];

export function EmployerInterviewDesignClient({ jobId }: { jobId: string }) {
  const t = useTranslations("employerInterviewDesign");
  const tc = useTranslations("common");
  const [jobTitle, setJobTitle] = useState("");
  const [template, setTemplate] = useState<JobInterviewTemplate>(defaultInterviewTemplate());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<InterviewQuestion[]>([]);
  const [pick, setPick] = useState<Record<string, boolean>>({});

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
        setTemplate(res.data.data.template);
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
      await axios.put(`/api/employer/jobs/${encodeURIComponent(jobId)}/interview-template`, { template });
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    try {
      const res = await axios.post<{ success: boolean; data: { questions: InterviewQuestion[] } }>(
        `/api/employer/jobs/${encodeURIComponent(jobId)}/interview-template/regenerate`,
      );
      if (res.data.success && res.data.data?.questions) {
        setTemplate((prev) => ({ ...prev, mode: "ai", questions: res.data.data.questions.slice(0, MAX_QUESTIONS) }));
      }
    } catch {
      /* ignore */
    }
  }

  async function openSuggest() {
    try {
      const res = await axios.post<{ success: boolean; data: { suggestions: InterviewQuestion[] } }>(
        `/api/employer/jobs/${encodeURIComponent(jobId)}/interview-template/suggest`,
      );
      if (res.data.success && res.data.data?.suggestions) {
        setSuggestions(res.data.data.suggestions);
        setPick({});
        setSuggestOpen(true);
      }
    } catch {
      /* ignore */
    }
  }

  function mergePickedSuggestions() {
    const add = suggestions.filter((s) => pick[s.id]);
    if (!add.length) return;
    setTemplate((prev) => ({
      ...prev,
      questions: [...prev.questions, ...add].slice(0, MAX_QUESTIONS),
    }));
    setSuggestOpen(false);
  }

  function addBlank(type: InterviewQuestionType) {
    setTemplate((prev) => ({
      ...prev,
      mode: "custom",
      questions: [
        ...prev.questions,
        {
          id: newQuestionId(),
          type,
          prompt: "",
          timeLimitSec: 60,
          options: type === "multiple_choice" ? ["Option A", "Option B", "Option C"] : undefined,
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
          <div className="rounded-xl border border-[#EDE9FE] bg-[#FAF5FF] p-4 text-sm text-[#4C1D95]">
            <p>{t("aiBlurb")}</p>
            <Button type="button" variant="outline" className="mt-3 border-[#7C3AED] text-[#7C3AED]" onClick={() => void regenerate()}>
              {t("regenerate")}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#374151]">
            <p className="font-medium">{t("customBlurb")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => addBlank("voice")}>
                {t("addVoice")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addBlank("multiple_choice")}>
                {t("addMc")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addBlank("yes_no")}>
                {t("addYn")}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#0D2137]">{countLabel}</p>
          <Button type="button" variant="outline" size="sm" className="border-[#7C3AED] text-[#7C3AED]" onClick={() => void openSuggest()}>
            {t("addFromAi")}
          </Button>
        </div>

        <ul className="space-y-3">
          {template.questions.map((q, idx) => (
            <li key={q.id} className="rounded-xl border border-[#EEF2F7] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase text-[#7C3AED]">
                  {q.type} · #{idx + 1}
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
                    settings: { ...p.settings, maxDurationMin: Number(e.target.value) || 30 },
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={template.settings.autoInviteOnApply}
                onChange={(e) =>
                  setTemplate((p) => ({
                    ...p,
                    settings: { ...p.settings, autoInviteOnApply: e.target.checked },
                  }))
                }
              />
              {t("autoInvite")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={template.settings.allowRetake}
                onChange={(e) =>
                  setTemplate((p) => ({
                    ...p,
                    settings: { ...p.settings, allowRetake: e.target.checked },
                  }))
                }
              />
              {t("allowRetake")}
            </label>
            <label className="text-sm sm:col-span-2">
              {t("retakeWait")}
              <select
                className="mt-1 w-full rounded border px-2 py-1"
                value={template.settings.retakeWaitHours}
                onChange={(e) =>
                  setTemplate((p) => ({
                    ...p,
                    settings: { ...p.settings, retakeWaitHours: Number(e.target.value) },
                  }))
                }
              >
                <option value={24}>24h</option>
                <option value={48}>48h</option>
                <option value={168}>1 week</option>
              </select>
            </label>
          </div>
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
          <div className="mt-4 flex items-center justify-between text-xs text-[#6B7280]">
            <span>{t("mockTimer", { sec: String(template.questions[0]?.timeLimitSec ?? 60) })}</span>
            <span className="rounded-full bg-[#EDE9FE] px-2 py-0.5 font-semibold text-[#5B21B6]">Voice</span>
          </div>
          <div className="mt-6 h-24 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-xs text-[#9CA3AF]">
            {t("mockRecording")}
          </div>
        </div>
      </aside>

      {suggestOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">{t("suggestTitle")}</h3>
            <ul className="mt-4 space-y-3">
              {suggestions.map((s) => (
                <li key={s.id} className="rounded-lg border p-3">
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(pick[s.id])}
                      onChange={(e) => setPick((p) => ({ ...p, [s.id]: e.target.checked }))}
                    />
                    <span>{s.prompt}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSuggestOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button type="button" className="bg-[#7C3AED]" onClick={mergePickedSuggestions}>
                {t("suggestAdd")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
