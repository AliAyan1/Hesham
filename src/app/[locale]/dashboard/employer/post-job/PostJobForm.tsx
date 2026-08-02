"use client";

import { JobType } from "@prisma/client";
import axios, { isAxiosError } from "axios";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { JOB_CATEGORIES } from "@/lib/jobs/constants";
import { createJobSchema, createJobValidationMessage } from "@/lib/jobs/create-job-schema";
import { CURRENCIES, formatCurrencyLabel } from "@/lib/currencies";
import { hrefUpgradeProfessional } from "@/lib/i18n-hrefs";
import { Button } from "@/components/ui/Button";

function bullets(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type WizardStep = 1 | 2 | 3 | 4;

export function PostJobForm({
  canAiJobDescription,
  initialStep,
}: {
  canAiJobDescription: boolean;
  /** Deep-link from dashboard (?step=2 opens description + AI). */
  initialStep?: WizardStep;
}) {
  const t = useTranslations("jobs");
  const tc = useTranslations("common");
  const router = useRouter();

  const pw = useCallback(
    (key: string, values?: Record<string, string | number>) =>
      t(`postWizard.${key}` as never, values as never),
    [t],
  );

  const [step, setStep] = useState<WizardStep>(initialStep ?? 1);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [category, setCategory] = useState<(typeof JOB_CATEGORIES)[number]>(JOB_CATEGORIES[0]);
  const [type, setType] = useState<JobType>(JobType.FULLTIME);
  const [isRemote, setIsRemote] = useState(false);
  const [location, setLocation] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [hideSalary, setHideSalary] = useState(false);
  const [salaryPrivacyOpen, setSalaryPrivacyOpen] = useState(false);
  const [salaryPrivacyResolved, setSalaryPrivacyResolved] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [reqText, setReqText] = useState("");
  const [benText, setBenText] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [niceText, setNiceText] = useState("");
  const [education, setEducation] = useState("");
  const [expLevel, setExpLevel] = useState<"ENTRY" | "MID" | "SENIOR" | "LEAD">("MID");
  const [years, setYears] = useState("1");
  const [aiPending, setAiPending] = useState(false);
  const [parsePending, setParsePending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const categoryLabel = useCallback(
    (c: string) => t(`marketplaceCategories.${c}` as never),
    [t],
  );

  const expOptions = useMemo(
    () =>
      [
        { v: "ENTRY" as const, k: "expEntry" },
        { v: "MID" as const, k: "expMid" },
        { v: "SENIOR" as const, k: "expSenior" },
        { v: "LEAD" as const, k: "expLead" },
      ] as const,
    [],
  );

  async function runAi() {
    setAiPending(true);
    setErr(null);
    try {
      const res = await axios.post<{ success: boolean; data?: { description: string; descriptionAr: string } }>(
        "/api/jobs/ai-description",
        {
          title,
          category,
          type,
          location: isRemote ? pw("aiRemoteHint") : location,
        },
      );
      if (res.data.success && res.data.data) {
        setDescription(res.data.data.description);
        setDescriptionAr(res.data.data.descriptionAr);
      }
    } catch (e) {
      setErr(isAxiosError(e) ? String(e.response?.data?.error ?? tc("error")) : tc("error"));
    } finally {
      setAiPending(false);
    }
  }

  async function parseJobDocument(file: File) {
    setParsePending(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post<{
        success: boolean;
        data?: {
          description: string;
          descriptionAr: string;
          requirements: string[];
          benefits: string[];
        };
        error?: string;
      }>("/api/jobs/parse-description", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error ?? "parse_failed");
      }
      const data = res.data.data;
      setDescription(data.description);
      setDescriptionAr(data.descriptionAr || "");
      if (data.requirements?.length) setReqText(data.requirements.join("\n"));
      if (data.benefits?.length) setBenText(data.benefits.join("\n"));
    } catch (e) {
      const code = isAxiosError(e) ? String(e.response?.data?.error ?? "") : "";
      const map: Record<string, string> = {
        unsupported_type: pw("uploadUnsupported"),
        doc_not_supported: pw("uploadDocLegacy"),
        file_too_large: pw("uploadTooLarge"),
        empty_document: pw("uploadEmpty"),
        extract_failed: pw("uploadExtractFailed"),
        pdf_corrupt: pw("uploadPdfCorrupt"),
        file_required: pw("uploadFailed"),
      };
      setErr(map[code] ?? (isAxiosError(e) ? String(e.response?.data?.error ?? pw("uploadFailed")) : pw("uploadFailed")));
    } finally {
      setParsePending(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      const smin = salaryMin.trim() ? Number.parseInt(salaryMin, 10) : undefined;
      const smax = salaryMax.trim() ? Number.parseInt(salaryMax, 10) : undefined;
      const yr = years.trim() ? Number.parseInt(years, 10) : undefined;
      const payload = {
        title: title.trim(),
        titleAr: titleAr.trim() || undefined,
        description: description.trim(),
        descriptionAr: descriptionAr.trim() || undefined,
        category,
        type,
        isRemote,
        location: isRemote ? undefined : location.trim() || undefined,
        salaryMin: smin === undefined || Number.isNaN(smin) ? undefined : smin,
        salaryMax: smax === undefined || Number.isNaN(smax) ? undefined : smax,
        currency: currency.trim() || undefined,
        hideSalary: Boolean(smin !== undefined || smax !== undefined) ? hideSalary : false,
        requirements: bullets(reqText),
        benefits: bullets(benText),
        skills: bullets(skillsText),
        hiringMeta: {
          requiredSkills: bullets(skillsText),
          niceToHaveSkills: bullets(niceText),
          educationRequirement: education.trim() || undefined,
          experienceLevel: expLevel,
          yearsExperience: yr !== undefined && !Number.isNaN(yr) ? yr : undefined,
        },
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      };

      const validation = createJobSchema.safeParse(payload);
      if (!validation.success) {
        setErr(
          createJobValidationMessage(validation.error.issues, {
            titleMin: pw("validationTitleMin"),
            locationRequired: pw("validationLocationRequired"),
            generic: tc("error"),
          }),
        );
        if (validation.error.issues.some((i) => i.path[0] === "title" || i.path[0] === "location")) {
          setStep(1);
        }
        return;
      }

      const res = await axios.post<{ success: boolean; data?: { id: string } }>("/api/jobs/create", payload);
      if (res.data.success && res.data.data?.id) {
        router.push(`/dashboard/employer/jobs?poolJob=${encodeURIComponent(res.data.data.id)}`);
        router.refresh();
      }
    } catch (e) {
      setErr(isAxiosError(e) ? String(e.response?.data?.error ?? tc("error")) : tc("error"));
    } finally {
      setSubmitting(false);
    }
  }

  function validateStep(current: WizardStep): boolean {
    if (current === 1) {
      if (title.trim().length < 3) {
        setErr(pw("validationTitleMin"));
        return false;
      }
      if (!isRemote && !location.trim()) {
        setErr(pw("validationLocationRequired"));
        return false;
      }
    }
    setErr(null);
    return true;
  }

  function hasSalaryEntered(): boolean {
    return Boolean(salaryMin.trim() || salaryMax.trim());
  }

  function goNextFromStep1() {
    if (!validateStep(1)) return;
    if (hasSalaryEntered() && !salaryPrivacyResolved) {
      setSalaryPrivacyOpen(true);
      return;
    }
    setStep(2);
  }

  function chooseSalaryVisibility(hide: boolean) {
    setHideSalary(hide);
    setSalaryPrivacyResolved(true);
    setSalaryPrivacyOpen(false);
    if (step === 1) setStep(2);
  }

  function onSalaryChange(kind: "min" | "max", value: string) {
    if (kind === "min") setSalaryMin(value);
    else setSalaryMax(value);
    setSalaryPrivacyResolved(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex gap-2 text-sm font-semibold text-[#6B7280]">
        <span>{pw("stepProgress", { current: step, total: 4 })}</span>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      {salaryPrivacyOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#0D2137]">{pw("salaryPrivacyTitle")}</h3>
            <p className="mt-2 text-sm text-[#4B5563]">{pw("salaryPrivacyBody")}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => chooseSalaryVisibility(false)}>
                {pw("salaryShow")}
              </Button>
              <Button type="button" variant="primary" className="min-h-11" onClick={() => chooseSalaryVisibility(true)}>
                {pw("salaryHide")}
              </Button>
            </div>
            <button
              type="button"
              className="mt-3 text-sm text-[#6B7280] underline"
              onClick={() => setSalaryPrivacyOpen(false)}
            >
              {tc("cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4 rounded-xl border bg-white p-6">
          <label className="block text-sm font-medium">
            {pw("titleRequired")}
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {pw("titleAr")}
            <input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {pw("categoryRequired")}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof JOB_CATEGORIES)[number])}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              {JOB_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            {pw("jobTypeRequired")}
            <select value={type} onChange={(e) => setType(e.target.value as JobType)} className="mt-1 w-full rounded border px-3 py-2">
              {(Object.values(JobType) as JobType[]).map((ty) => (
                <option key={ty} value={ty}>
                  {t(`jobTypes.${String(ty).toLowerCase()}` as never)}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} />
            {t("remoteOnly")}
          </label>
          {!isRemote ? (
            <label className="block text-sm font-medium">
              {pw("locationRequired")}
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("locationPlaceholder")}
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {pw("salaryMin")}
              <input
                value={salaryMin}
                onChange={(e) => onSalaryChange("min", e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
                type="number"
              />
            </label>
            <label className="text-sm font-medium">
              {pw("salaryMax")}
              <input
                value={salaryMax}
                onChange={(e) => onSalaryChange("max", e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
                type="number"
              />
            </label>
            <label className="text-sm font-medium">
              {pw("currency")}
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 w-full rounded border px-3 py-2">
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {formatCurrencyLabel(c)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {hasSalaryEntered() && salaryPrivacyResolved ? (
            <p className="text-xs text-[#6B7280]">
              {hideSalary ? pw("salaryHiddenHint") : pw("salaryVisibleHint")}{" "}
              <button
                type="button"
                className="font-semibold text-[#0D9488] underline"
                onClick={() => setSalaryPrivacyOpen(true)}
              >
                {pw("salaryChangeVisibility")}
              </button>
            </p>
          ) : null}
          <label className="block text-sm font-medium">
            {pw("deadline")}
            <input value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} type="datetime-local" className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <Button type="button" variant="primary" className="min-h-11" onClick={goNextFromStep1}>
            {tc("next")}
          </Button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4 rounded-xl border bg-white p-6">
          <div className="flex flex-wrap items-center gap-2">
            {canAiJobDescription ? (
              <Button type="button" variant="outline" loading={aiPending} disabled={parsePending} onClick={() => void runAi()}>
                {pw("aiGenerateDesc")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              loading={parsePending}
              disabled={aiPending}
              onClick={() => uploadRef.current?.click()}
            >
              {pw("uploadJd")}
            </Button>
            <input
              ref={uploadRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void parseJobDocument(f);
              }}
            />
            <p className="w-full text-xs text-[#6B7280]">{pw("uploadJdHint")}</p>
          </div>
          <label className="block text-sm font-medium">
            {pw("descEnRequired")}
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {pw("descAr")}
            <textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} rows={6} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {pw("requirementsLines")}
            <textarea value={reqText} onChange={(e) => setReqText(e.target.value)} rows={5} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {pw("benefitsLines")}
            <textarea value={benText} onChange={(e) => setBenText(e.target.value)} rows={4} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              {tc("back")}
            </Button>
            <Button type="button" variant="primary" onClick={() => setStep(3)}>
              {tc("next")}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4 rounded-xl border bg-white p-6">
          <label className="block text-sm font-medium">
            {pw("skillsLines")}
            <textarea value={skillsText} onChange={(e) => setSkillsText(e.target.value)} rows={3} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {pw("niceToHave")}
            <textarea value={niceText} onChange={(e) => setNiceText(e.target.value)} rows={3} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {pw("education")}
            <input value={education} onChange={(e) => setEducation(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {pw("expLevel")}
            <select value={expLevel} onChange={(e) => setExpLevel(e.target.value as typeof expLevel)} className="mt-1 w-full rounded border px-3 py-2">
              {expOptions.map((o) => (
                <option key={o.v} value={o.v}>
                  {pw(o.k)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            {pw("yearsExperience")}
            <input value={years} onChange={(e) => setYears(e.target.value)} type="number" className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              {tc("back")}
            </Button>
            <Button type="button" variant="primary" onClick={() => setStep(4)}>
              {tc("next")}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-4 rounded-xl border bg-white p-6">
          <h3 className="font-bold">{pw("previewTitle")}</h3>
          <p className="text-lg font-bold text-[#0D2137]">{title}</p>
          <p className="text-sm text-[#6B7280]">
            {categoryLabel(category)} · {t(`jobTypes.${String(type).toLowerCase()}` as never)} ·{" "}
            {isRemote ? pw("remoteSummary") : pw("locationSummary", { location: location || "—" })}
          </p>
          {hasSalaryEntered() ? (
            <p className="text-sm text-[#374151]">
              {hideSalary
                ? pw("previewSalaryHidden")
                : pw("previewSalaryShown", {
                    range: `${salaryMin || "—"} – ${salaryMax || "—"} ${currency}`,
                  })}
            </p>
          ) : null}
          <p className="whitespace-pre-wrap text-sm">{description.slice(0, 400)}…</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(3)}>
              {tc("back")}
            </Button>
            <Button type="button" variant="secondary" loading={submitting} onClick={() => void submit()}>
              {t("postJob")}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
