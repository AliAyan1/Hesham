"use client";

import { useMemo, useState, useTransition } from "react";
import axios, { isAxiosError } from "axios";
import { useLocale, useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { CvUpgradeSheet, type CvUpsellKind } from "@/components/cv/CvUpgradeSheet";
import { SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
import { ATS_PASS_THRESHOLD } from "@/lib/cv/ats-threshold";
import { mergeExperienceDescriptionFromRecord } from "@/lib/cv/experience-description";
import { handleProseTextareaPaste, insertNormalizedPaste } from "@/lib/normalize-pasted-text";

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

type StepKey = "personal" | "experience" | "education" | "skills" | "review";

type CvDraft = {
  fullName: string;
  fullNameAr: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  summary: string;
  experience: Array<{ title: string; company: string; description: string }>;
  education: Array<{ degree: string; institution: string }>;
  skills: string[];
};

function readApiError(e: unknown): string | undefined {
  if (!isAxiosError(e)) return undefined;
  const data = e.response?.data;
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return undefined;
}

type AtsIssue = { type: "critical" | "warning" | "good"; message: string; messageAr: string; fix: string | null };
type AtsAnalysis = {
  totalScore: number;
  formatScore: number;
  keywordsScore: number;
  experienceScore: number;
  skillsScore: number;
  issues: AtsIssue[];
  missingKeywords: string[];
  presentKeywords: string[];
  suggestions: Array<{ section: string; suggestion: string; suggestionAr: string }>;
  overallFeedback: string;
  overallFeedbackAr: string;
};

export function CvBuilderClient({
  tier,
  initial,
}: {
  tier: SubscriptionTier;
  initial: Partial<CvDraft> | null;
}) {
  const t = useTranslations("cv");
  const ts = useTranslations("subscription");
  const router = useRouter();
  const locale = useLocale();
  const isRTL = locale === "ar" || locale === "ur";

  const steps = useMemo(
    () =>
      [
        { key: "personal", label: t("steps.personal") },
        { key: "experience", label: t("steps.experience") },
        { key: "education", label: t("steps.education") },
        { key: "skills", label: t("steps.skills") },
        { key: "review", label: t("steps.review") },
      ] as const,
    [t],
  );

  const [step, setStep] = useState<StepKey>("personal");
  const [draft, setDraft] = useState<CvDraft>({
    fullName: initial?.fullName ?? "",
    fullNameAr: initial?.fullNameAr ?? "",
    title: initial?.title ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    location: initial?.location ?? "",
    linkedinUrl: initial?.linkedinUrl ?? "",
    portfolioUrl: initial?.portfolioUrl ?? "",
    summary: initial?.summary ?? "",
    experience: initial?.experience ?? [{ title: "", company: "", description: "" }],
    education: initial?.education ?? [{ degree: "", institution: "" }],
    skills: initial?.skills ?? [],
  });

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [atsPending, setAtsPending] = useState(false);
  const [ats, setAts] = useState<AtsAnalysis | null>(null);
  const [rebuildPending, setRebuildPending] = useState(false);
  const [rebuildBanner, setRebuildBanner] = useState<string | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [template, setTemplate] = useState<"professional" | "modern" | "creative">("professional");
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellKind, setUpsellKind] = useState<CvUpsellKind>("ai");

  function openUpsell(kind: CvUpsellKind) {
    setUpsellKind(kind);
    setUpsellOpen(true);
  }

  const canUpload = hasAccess(tier, "cv_ai_parse");
  const canAts = hasAccess(tier, "ats_score");
  const canImproveSummary = hasAccess(tier, "ai_improve_summary");
  const canEnhanceBullets = hasAccess(tier, "ai_enhance_bullets");
  const canSuggestSkills = hasAccess(tier, "ai_skill_suggestions");
  const canAllTemplates = hasAccess(tier, "cv_templates_all");
  const canAtsRebuild = hasAccess(tier, "ai_cv_ats_rebuild");

  const upsellTitle =
    upsellKind === "upload"
      ? t("upgradeSheet.uploadTitle")
      : upsellKind === "ats"
        ? t("upgradeSheet.atsTitle")
        : upsellKind === "atsRebuild"
          ? t("upgradeSheet.atsRebuildTitle")
          : upsellKind === "templates"
            ? t("upgradeSheet.templatesTitle")
            : t("upgradeSheet.aiTitle");
  const upsellBody =
    upsellKind === "upload"
      ? t("upgradeSheet.uploadBody")
      : upsellKind === "ats"
        ? t("upgradeSheet.atsBody")
        : upsellKind === "atsRebuild"
          ? t("upgradeSheet.atsRebuildBody")
          : upsellKind === "templates"
            ? t("upgradeSheet.templatesBody")
            : t("upgradeSheet.aiBody");

  async function onSave() {
    setError(null);
    startTransition(async () => {
      try {
        await axios.post("/api/cv/save", {
          fullName: draft.fullName || undefined,
          fullNameAr: draft.fullNameAr || undefined,
          professionalTitle: draft.title || undefined,
          email: draft.email || undefined,
          phone: draft.phone || undefined,
          location: draft.location || undefined,
          linkedinUrl: draft.linkedinUrl || undefined,
          portfolioUrl: draft.portfolioUrl || undefined,
          summary: draft.summary || undefined,
          experience: draft.experience,
          education: draft.education,
          skills: draft.skills,
        });
        router.refresh();
      } catch {
        setError(t("errors.saveFailed"));
      }
    });
  }

  function goToStep(key: StepKey) {
    setError(null);
    setRebuildBanner(null);
    setStep(key);
  }

  async function onUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await axios.post("/api/cv/parse", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180_000,
      });
      const body = res.data as {
        success?: boolean;
        data?: { parsed?: unknown };
        error?: string;
      };
      if (body?.success === false) {
        setError(typeof body.error === "string" ? body.error : t("errors.uploadFailed"));
        return;
      }
      const parsed = body?.data?.parsed ?? null;
      if (!parsed || typeof parsed !== "object") {
        setError(t("errors.uploadFailed"));
        return;
      }
      const obj = parsed as Record<string, unknown>;
      const exp = Array.isArray(obj.experience) ? (obj.experience as unknown[]) : [];
      const edu = Array.isArray(obj.education) ? (obj.education as unknown[]) : [];
      const sk = Array.isArray(obj.skills) ? (obj.skills as unknown[]) : [];

      setDraft((d) => ({
        ...d,
        fullName: pickStr(obj, "fullName") ?? d.fullName,
        fullNameAr: pickStr(obj, "fullNameAr") ?? d.fullNameAr,
        title: pickStr(obj, "professionalTitle", "headline", "jobTitle", "role") ?? d.title,
        email: pickStr(obj, "email") ?? d.email,
        phone: pickStr(obj, "phone") ?? d.phone,
        location: pickStr(obj, "location") ?? d.location,
        linkedinUrl: pickStr(obj, "linkedinUrl") ?? d.linkedinUrl,
        portfolioUrl: pickStr(obj, "portfolioUrl", "website", "websiteUrl") ?? d.portfolioUrl,
        summary: pickStr(obj, "summary", "profile", "about") ?? d.summary,
        experience:
          exp.length > 0
            ? exp.map((row) => {
                const r = row as Record<string, unknown>;
                return {
                  title: pickStr(r, "title", "jobTitle", "role", "position") ?? "",
                  company: pickStr(r, "company", "employer", "organization", "org") ?? "",
                  description: mergeExperienceDescriptionFromRecord(r),
                };
              })
            : d.experience,
        education:
          edu.length > 0
            ? edu.map((row) => {
                const r = row as Record<string, unknown>;
                return {
                  degree: pickStr(r, "degree", "qualification", "diploma") ?? "",
                  institution:
                    pickStr(r, "institution", "school", "university", "college", "academy") ?? "",
                };
              })
            : d.education,
        skills:
          sk.length > 0
            ? sk
                .map((row) => {
                  if (typeof row === "string") return row;
                  const r = row as Record<string, unknown>;
                  return typeof r.name === "string" ? r.name : "";
                })
                .filter(Boolean)
            : d.skills,
      }));
      router.refresh();
    } catch (e) {
      if (isAxiosError(e) && e.code === "ECONNABORTED") {
        setError(t("errors.uploadTimeout"));
      } else {
        setError(readApiError(e) ?? t("errors.uploadFailed"));
      }
    } finally {
      setUploading(false);
    }
  }

  async function onScanAts() {
    setError(null);
    setRebuildBanner(null);
    setAtsPending(true);
    try {
      const res = await axios.post("/api/cv/ats-score");
      const analysis = (res.data?.data?.analysis ?? null) as AtsAnalysis | null;
      setAts(analysis);
    } catch {
      setError(t("errors.atsFailed"));
    } finally {
      setAtsPending(false);
    }
  }

  async function onAtsRebuild() {
    setError(null);
    setRebuildBanner(null);
    setRebuildPending(true);
    try {
      const res = await axios.post("/api/cv/improve-for-ats", {});
      const body = res.data as {
        success?: boolean;
        data?: {
          draft?: {
            professionalTitle: string;
            summary: string;
            experience: CvDraft["experience"];
            education: CvDraft["education"];
            skills: string[];
          };
        };
        error?: string;
      };
      if (body?.success === false) {
        setError(typeof body.error === "string" ? body.error : t("errors.atsRebuildFailed"));
        return;
      }
      const d = body?.data?.draft;
      if (!d?.professionalTitle) {
        setError(t("errors.atsRebuildFailed"));
        return;
      }
      setDraft((prev) => ({
        ...prev,
        title: d.professionalTitle,
        summary: d.summary ?? prev.summary,
        experience:
          Array.isArray(d.experience) && d.experience.length ? d.experience : prev.experience,
        education: Array.isArray(d.education) && d.education.length ? d.education : prev.education,
        skills: Array.isArray(d.skills) && d.skills.length ? d.skills : prev.skills,
      }));
      setAts(null);
      setRebuildBanner(t("ats.optimizeSuccess"));
      router.refresh();
    } catch (e) {
      setError(readApiError(e) ?? t("errors.atsRebuildFailed"));
    } finally {
      setRebuildPending(false);
    }
  }

  async function onImproveSummary() {
    if (!draft.summary.trim()) return;
    setError(null);
    setAiPending(true);
    try {
      const res = await axios.post("/api/cv/improve-summary", {
        summary: draft.summary,
        professionalTitle: draft.title || undefined,
      });
      const out = res.data?.data as { summary?: string; summaryAr?: string } | undefined;
      if (out?.summary) setDraft((d) => ({ ...d, summary: out.summary ?? d.summary }));
    } catch {
      setError(t("errors.aiFailed"));
    } finally {
      setAiPending(false);
    }
  }

  async function onEnhanceExperience(idx: number) {
    const ex = draft.experience[idx];
    if (!ex) return;
    setError(null);
    setAiPending(true);
    try {
      const res = await axios.post("/api/cv/improve-experience", {
        title: ex.title,
        company: ex.company,
        description: ex.description,
      });
      const bullets = (res.data?.data?.bullets ?? []) as string[];
      if (bullets.length) {
        setDraft((d) => ({
          ...d,
          experience: d.experience.map((x, i) =>
            i === idx ? { ...x, description: bullets.map((b) => `• ${b}`).join("\n") } : x,
          ),
        }));
      }
    } catch {
      setError(t("errors.aiFailed"));
    } finally {
      setAiPending(false);
    }
  }

  async function onSuggestSkills() {
    if (!draft.title.trim()) return;
    setError(null);
    setAiPending(true);
    try {
      const res = await axios.post("/api/cv/suggest-skills", { professionalTitle: draft.title });
      const skills = (res.data?.data?.skills ?? []) as string[];
      if (skills.length) {
        setDraft((d) => ({
          ...d,
          skills: Array.from(new Set([...d.skills, ...skills])).slice(0, 40),
        }));
      }
    } catch {
      setError(t("errors.aiFailed"));
    } finally {
      setAiPending(false);
    }
  }

  async function onDownloadPdf() {
    setError(null);
    try {
      const tpl = template === "professional" ? "professional" : template;
      const res = await axios.post(
        "/api/cv/generate-pdf",
        { template: tpl },
        { responseType: "blob" },
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cv-${tpl}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("errors.pdfFailed"));
    }
  }

  function next() {
    const idx = steps.findIndex((s) => s.key === step);
    const n = steps[Math.min(idx + 1, steps.length - 1)].key;
    goToStep(n);
  }
  function prev() {
    const idx = steps.findIndex((s) => s.key === step);
    const p = steps[Math.max(idx - 1, 0)].key;
    goToStep(p);
  }

  const planTranslationKey =
    tier === SubscriptionTier.PREMIUM
      ? ("premium" as const)
      : tier === SubscriptionTier.PROFESSIONAL
        ? ("professional" as const)
        : ("free" as const);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">{t("builder")}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-[#0D2137]">{t("title")}</h2>
            <p className="mt-2 text-xs text-[#6B7280]">
              <span className="font-semibold text-[#0D2137]">{t("accountPlan")}</span>{" "}
              <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 font-semibold text-[#0D2137]">
                {ts(planTranslationKey)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tier === SubscriptionTier.FREE ? (
              <div className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-[#0D2137] sm:flex">
                <span aria-hidden>⭐</span>
                <span>{t("premiumHint")}</span>
              </div>
            ) : null}
            {tier !== SubscriptionTier.PREMIUM ? (
              <Button variant="outline" size="sm" onClick={() => router.push("/pricing")}>
                {ts("upgrade")}
              </Button>
            ) : null}
            <Button loading={pending} onClick={onSave} size="sm">
              {t("save")}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {steps.map((s) => {
            const active = s.key === step;
            const done = steps.findIndex((x) => x.key === step) > steps.findIndex((x) => x.key === s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => goToStep(s.key)}
                className={`rounded-xl px-3 py-2 text-start text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#0D2137] text-white"
                    : done
                      ? "bg-[#E1F5EE] text-[#1D9E75]"
                      : "bg-[#F1F5F9] text-[#6B7280]"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6">
        {canUpload ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0D2137]">{t("upload.title")}</p>
                <p className="mt-1 text-sm text-[#6B7280]">{t("upload.subtitle")}</p>
              </div>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  void onUpload(f);
                  e.currentTarget.value = "";
                }}
                className="text-sm"
              />
            </div>
            {uploading ? <p className="mt-3 text-sm text-[#6B7280]">{t("upload.parsing")}</p> : null}
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0D2137]">{t("upload.title")}</p>
              <p className="mt-1 text-sm text-[#6B7280]">{t("upload.teaserSubtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => openUpsell("upload")}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#0D2137] transition-colors hover:border-[#C9973A]/50 hover:bg-[#FDF8EE]"
            >
              <Lock className="h-3.5 w-3.5 text-[#B45309]" strokeWidth={2} aria-hidden />
              {t("premiumInline.upload")}
            </button>
          </div>
        )}
      </div>

      {tier === SubscriptionTier.FREE ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#0D2137]">{t("freeIncludes.title")}</p>
          <ul className="mt-3 grid gap-2 text-sm text-[#6B7280] sm:grid-cols-2">
            <li>✓ {t("freeIncludes.item1")}</li>
            <li>✓ {t("freeIncludes.item2")}</li>
            <li>✓ {t("freeIncludes.item3")}</li>
            <li>✓ {t("freeIncludes.item4")}</li>
            <li className="sm:col-span-2">✓ {t("freeIncludes.item5")}</li>
          </ul>
        </div>
      ) : null}
      {tier === SubscriptionTier.PROFESSIONAL ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#0D2137]">{t("professionalIncludes.title")}</p>
          <ul className="mt-3 grid gap-2 text-sm text-[#6B7280] sm:grid-cols-2">
            <li>✓ {t("professionalIncludes.item1")}</li>
            <li>✓ {t("professionalIncludes.item2")}</li>
            <li>✓ {t("professionalIncludes.item3")}</li>
            <li>✓ {t("professionalIncludes.item4")}</li>
            <li className="sm:col-span-2">✓ {t("professionalIncludes.item5")}</li>
          </ul>
        </div>
      ) : null}
      {tier === SubscriptionTier.PREMIUM ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#0D2137]">{t("premiumIncludes.title")}</p>
          <ul className="mt-3 grid gap-2 text-sm text-[#6B7280] sm:grid-cols-2">
            <li>✓ {t("premiumIncludes.item1")}</li>
            <li>✓ {t("premiumIncludes.item2")}</li>
            <li>✓ {t("premiumIncludes.item3")}</li>
            <li>✓ {t("premiumIncludes.item4")}</li>
            <li className="sm:col-span-2">✓ {t("premiumIncludes.item5")}</li>
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        {step === "personal" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("fields.fullName")}
              value={draft.fullName}
              onChange={(v) => setDraft((d) => ({ ...d, fullName: v }))}
              required
              wrapperClassName="sm:col-span-2"
            />
            <Field label={t("fields.title")} value={draft.title} onChange={(v) => setDraft((d) => ({ ...d, title: v }))} required />
            <Field label={t("fields.email")} value={draft.email} onChange={(v) => setDraft((d) => ({ ...d, email: v }))} required />
            <Field label={t("fields.phone")} value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} required />
            <Field label={t("fields.location")} value={draft.location} onChange={(v) => setDraft((d) => ({ ...d, location: v }))} />
            <Field label={t("fields.linkedin")} value={draft.linkedinUrl} onChange={(v) => setDraft((d) => ({ ...d, linkedinUrl: v }))} />
            <Field label={t("fields.portfolio")} value={draft.portfolioUrl} onChange={(v) => setDraft((d) => ({ ...d, portfolioUrl: v }))} />
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[#0D2137]">
                {t("fields.summary")}
              </label>
              <textarea
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                rows={6}
                value={draft.summary}
                onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                onPaste={(e) => handleProseTextareaPaste(e, draft.summary, (summary) => setDraft((d) => ({ ...d, summary })))}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]">
                <span>{t("summaryHint")}</span>
                <span className="tabular-nums">{draft.summary.length}</span>
              </div>
              {canImproveSummary ? (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={aiPending}
                    disabled={aiPending || !draft.summary.trim()}
                    type="button"
                    onClick={onImproveSummary}
                  >
                    {t("ai.improveSummary")}
                  </Button>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={() => openUpsell("ai")}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280] underline decoration-dotted underline-offset-4 hover:text-[#0D2137]"
                  >
                    <Lock className="h-3.5 w-3.5 shrink-0 text-[#B45309]" strokeWidth={2} aria-hidden />
                    {t("premiumInline.aiSummary")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : step === "experience" ? (
          <div className="space-y-4">
            {draft.experience.map((ex, idx) => (
              <div key={idx} className="rounded-2xl border border-gray-100 bg-[#F8FAFC] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label={t("fields.jobTitle")}
                    value={ex.title}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        experience: d.experience.map((x, i) => (i === idx ? { ...x, title: v } : x)),
                      }))
                    }
                    required
                  />
                  <Field
                    label={t("fields.company")}
                    value={ex.company}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        experience: d.experience.map((x, i) => (i === idx ? { ...x, company: v } : x)),
                      }))
                    }
                    required
                  />
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-[#0D2137]">{t("fields.description")}</label>
                    <textarea
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                      rows={4}
                      value={ex.description}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          experience: d.experience.map((x, i) =>
                            i === idx ? { ...x, description: e.target.value } : x,
                          ),
                        }))
                      }
                      onPaste={(e) => {
                        const plain = e.clipboardData.getData("text/plain");
                        if (!plain || !/[\r\n]/.test(plain)) return;
                        e.preventDefault();
                        const el = e.currentTarget;
                        const start = el.selectionStart ?? ex.description.length;
                        const end = el.selectionEnd ?? ex.description.length;
                        const { nextValue, caret } = insertNormalizedPaste(ex.description, plain, start, end);
                        setDraft((d) => ({
                          ...d,
                          experience: d.experience.map((x, i) =>
                            i === idx ? { ...x, description: nextValue } : x,
                          ),
                        }));
                        requestAnimationFrame(() => {
                          el.setSelectionRange(caret, caret);
                        });
                      }}
                    />
                  </div>
                </div>
                {canEnhanceBullets ? (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={aiPending}
                      type="button"
                      disabled={aiPending || !ex.description.trim()}
                      onClick={() => void onEnhanceExperience(idx)}
                    >
                      {t("ai.enhanceExperience")}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => openUpsell("ai")}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280] underline decoration-dotted underline-offset-4 hover:text-[#0D2137]"
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0 text-[#B45309]" strokeWidth={2} aria-hidden />
                      {t("premiumInline.aiBullets")}
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#0D2137] hover:bg-gray-50"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  experience: [...d.experience, { title: "", company: "", description: "" }],
                }))
              }
            >
              + {t("addExperience")}
            </button>
          </div>
        ) : step === "education" ? (
          <div className="space-y-4">
            {draft.education.map((ed, idx) => (
              <div key={idx} className="rounded-2xl border border-gray-100 bg-[#F8FAFC] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label={t("fields.degree")}
                    value={ed.degree}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        education: d.education.map((x, i) => (i === idx ? { ...x, degree: v } : x)),
                      }))
                    }
                    required
                  />
                  <Field
                    label={t("fields.institution")}
                    value={ed.institution}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        education: d.education.map((x, i) =>
                          i === idx ? { ...x, institution: v } : x,
                        ),
                      }))
                    }
                    required
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#0D2137] hover:bg-gray-50"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  education: [...d.education, { degree: "", institution: "" }],
                }))
              }
            >
              + {t("addEducation")}
            </button>
          </div>
        ) : step === "skills" ? (
          <SkillsStep
            value={draft.skills}
            onChange={(skills) => setDraft((d) => ({ ...d, skills }))}
            onSuggest={() => void onSuggestSkills()}
            canSuggestAi={canSuggestSkills}
            suggestLoading={aiPending}
            onOpenUpsellAi={() => openUpsell("ai")}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-[#F8FAFC] p-5">
              <p className="text-sm font-semibold text-[#0D2137]">{t("preview.title")}</p>
              <p className="mt-2 text-sm text-[#6B7280]">{t("preview.subtitle")}</p>
              <div className="mt-4 rounded-xl bg-white p-4 text-sm">
                <p className="font-bold">{draft.fullName || "—"}</p>
                {draft.fullNameAr.trim() ? (
                  <p className="mt-0.5 font-semibold text-[#374151]" dir="rtl">
                    {draft.fullNameAr.trim()}
                  </p>
                ) : null}
                <p className="text-[#6B7280]">{draft.title || "—"}</p>
                <p className="mt-3 text-[#0D2137]">{draft.summary || "—"}</p>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-[#0D2137]">{t("templates.title")}</p>
                <p className="mt-1 text-sm text-[#6B7280]">{t("templates.subtitle")}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      { key: "professional", label: t("templates.professional"), locked: false },
                      { key: "modern", label: t("templates.modern"), locked: !canAllTemplates },
                      { key: "creative", label: t("templates.creative"), locked: !canAllTemplates },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        opt.locked ? openUpsell("templates") : setTemplate(opt.key)
                      }
                      className={`rounded-xl border px-3 py-2 text-start text-sm font-semibold transition-colors ${
                        template === opt.key && !opt.locked
                          ? "border-[#1D9E75] bg-[#E1F5EE] text-[#0D2137]"
                          : "border-gray-200 bg-white text-[#0D2137] hover:bg-gray-50"
                      } ${opt.locked ? "opacity-80" : ""}`}
                    >
                      {opt.locked ? (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5 shrink-0 text-[#B45309]" strokeWidth={2} aria-hidden />
                          {opt.label}
                        </span>
                      ) : (
                        opt.label
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <Button onClick={() => void onDownloadPdf()} variant="outline">
                  {t("download")}
                </Button>
              </div>
            </div>

            {canAts ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <p className="text-sm font-semibold text-[#0D2137]">{t("ats.title")}</p>
                <p className="mt-2 text-sm text-[#6B7280]">{t("ats.subtitle")}</p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    loading={atsPending}
                    disabled={atsPending}
                    onClick={() => void onScanAts()}
                  >
                    {t("ats.scan")}
                  </Button>
                </div>
                {ats ? (
                  <div className="mt-5 space-y-3">
                    <p className="text-2xl font-extrabold text-[#0D2137]">
                      {t("ats.scoreLabel", { score: String(ats.totalScore) })}
                    </p>
                    <div className="grid gap-2 text-sm text-[#0D2137] sm:grid-cols-2">
                      <p>{t("ats.breakdown.format", { score: String(ats.formatScore) })}</p>
                      <p>{t("ats.breakdown.keywords", { score: String(ats.keywordsScore) })}</p>
                      <p>{t("ats.breakdown.experience", { score: String(ats.experienceScore) })}</p>
                      <p>{t("ats.breakdown.skills", { score: String(ats.skillsScore) })}</p>
                    </div>
                    {ats.issues?.length ? (
                      <div>
                        <p className="text-sm font-semibold text-[#0D2137]">{t("ats.issuesTitle")}</p>
                        <ul className="mt-2 space-y-1 text-sm text-[#6B7280]">
                          {ats.issues.slice(0, 8).map((it, i) => (
                            <li key={i}>
                              <span className="font-semibold text-[#0D2137]">{it.type.toUpperCase()}:</span>{" "}
                              {isRTL ? it.messageAr : it.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {ats.totalScore < ATS_PASS_THRESHOLD ? (
                      <div className="mt-4 rounded-xl border border-teal-200 bg-[#F0FDF9] p-4">
                        <p className="text-sm font-semibold text-[#0D2137]">{t("ats.optimizeTitle")}</p>
                        <p className="mt-2 text-xs leading-relaxed text-[#047857]">
                          {t("ats.optimizeSubtitle", { pct: String(ATS_PASS_THRESHOLD) })}
                        </p>
                        <div className="mt-3">
                          {canAtsRebuild ? (
                            <Button
                              size="sm"
                              type="button"
                              loading={rebuildPending}
                              disabled={rebuildPending || atsPending}
                              onClick={() => void onAtsRebuild()}
                            >
                              {t("ats.optimizeCta")}
                            </Button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openUpsell("atsRebuild")}
                              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-[#0D2137] transition-colors hover:bg-gray-50"
                            >
                              <Lock className="h-4 w-4 shrink-0 text-[#B45309]" strokeWidth={2} aria-hidden />
                              {t("premiumInline.atsRebuild")}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-[#F8FAFC] p-5">
                <p className="text-sm font-semibold text-[#0D2137]">{t("ats.title")}</p>
                <p className="mt-2 text-sm text-[#6B7280]">{t("ats.subtitle")}</p>
                <button
                  type="button"
                  onClick={() => openUpsell("ats")}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280] underline decoration-dotted underline-offset-4 hover:text-[#0D2137]"
                >
                  <Lock className="h-3.5 w-3.5 shrink-0 text-[#B45309]" strokeWidth={2} aria-hidden />
                  {t("premiumInline.ats")}
                </button>
              </div>
            )}
          </div>
        )}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {rebuildBanner ? (
          <p className="mt-3 rounded-lg border border-teal-200 bg-[#E1F5EE] px-3 py-2 text-sm font-medium text-[#065f46]">
            {rebuildBanner}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={prev} disabled={step === "personal"}>
            {t("prev")}
          </Button>
          {step === "review" ? (
            <div className="flex flex-wrap items-center gap-2">
              {ats && ats.totalScore < ATS_PASS_THRESHOLD && canAtsRebuild ? (
                <Button
                  type="button"
                  loading={rebuildPending}
                  disabled={rebuildPending || atsPending}
                  onClick={() => void onAtsRebuild()}
                >
                  {t("ats.optimizeNext")}
                </Button>
              ) : ats && ats.totalScore < ATS_PASS_THRESHOLD && !canAtsRebuild && canAts ? (
                <button
                  type="button"
                  onClick={() => openUpsell("atsRebuild")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0D2137] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0F4C75] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                >
                  <Lock className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                  {t("ats.optimizeNextLocked")}
                </button>
              ) : null}
              <Button
                variant={ats && ats.totalScore < ATS_PASS_THRESHOLD ? "outline" : "primary"}
                onClick={() => router.push("/dashboard/job-seeker")}
              >
                {t("finish")}
              </Button>
            </div>
          ) : (
            <Button onClick={next}>{t("next")}</Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/dashboard/job-seeker" className="text-sm font-semibold text-brand-teal hover:underline">
          {t("backToDashboard")}
        </Link>
      </div>

      <CvUpgradeSheet
        open={upsellOpen}
        onClose={() => setUpsellOpen(false)}
        title={upsellTitle}
        body={upsellBody}
        upgradeLabel={ts("upgrade")}
        closeAriaLabel={t("upgradeSheet.closeAria")}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  wrapperClassName,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  wrapperClassName?: string;
}) {
  return (
    <label className={wrapperClassName ? `block ${wrapperClassName}` : "block"}>
      <span className="text-sm font-semibold text-[#0D2137]">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function SkillsStep({
  value,
  onChange,
  onSuggest,
  canSuggestAi,
  suggestLoading,
  onOpenUpsellAi,
}: {
  value: string[];
  onChange: (skills: string[]) => void;
  onSuggest: () => void;
  canSuggestAi: boolean;
  suggestLoading: boolean;
  onOpenUpsellAi: () => void;
}) {
  const t = useTranslations("cv");
  const [input, setInput] = useState("");
  return (
    <div>
      <p className="text-sm font-semibold text-[#0D2137]">{t("skills.title")}</p>
      <p className="mt-1 text-sm text-[#6B7280]">{t("skills.subtitle")}</p>
      {canSuggestAi ? (
        <div className="mt-3">
          <Button
            size="sm"
            variant="secondary"
            type="button"
            loading={suggestLoading}
            disabled={suggestLoading}
            onClick={onSuggest}
          >
            {t("ai.suggestSkills")}
          </Button>
        </div>
      ) : (
        <div className="mt-2">
          <button
            type="button"
            onClick={onOpenUpsellAi}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280] underline decoration-dotted underline-offset-4 hover:text-[#0D2137]"
          >
            <Lock className="h-3.5 w-3.5 shrink-0 text-[#B45309]" strokeWidth={2} aria-hidden />
            {t("premiumInline.aiSkills")}
          </button>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {value.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full bg-[#E1F5EE] px-3 py-1 text-sm font-semibold text-[#1D9E75]"
            onClick={() => onChange(value.filter((x) => x !== s))}
          >
            {s} ×
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("skills.placeholder")}
          className="min-h-11 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
        />
        <Button
          variant="outline"
          onClick={() => {
            const s = input.trim();
            if (!s) return;
            if (!value.includes(s)) onChange([...value, s]);
            setInput("");
          }}
        >
          {t("skills.add")}
        </Button>
      </div>
    </div>
  );
}

