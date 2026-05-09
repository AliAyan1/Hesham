"use client";

import axios, { isAxiosError } from "axios";
import { JobType } from "@prisma/client";
import type { Profile, CV } from "@prisma/client";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { JOB_CATEGORIES } from "@/lib/constants";
import { computeCvCompletionPercent } from "@/lib/cv/completion";
import { computeProfileCompletionPercent } from "@/lib/profile-completion";
import { mergeExperienceDescriptionFromRecord } from "@/lib/cv/experience-description";
import { hasAccess } from "@/lib/subscription";
import type { SubscriptionTier } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type ExpRow = { title: string; company: string; description: string };
type EduRow = { degree: string; institution: string };

function safeArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function linesToArr(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mergeLinesAndComma(text: string): string[] {
  const parts = text.split(/[,،]/).flatMap((p) => p.split(/\r?\n/));
  return parts.map((s) => s.trim()).filter(Boolean);
}

/** Parse Profile.jobPreferences JSON from API into editable state. */
function prefsFromProfile(prof: Profile | null): {
  desiredJobTitle: string;
  preferredCategories: string[];
  preferredLocation: string;
  salaryMin: string;
  salaryMax: string;
  preferredJobTypes: JobType[];
  availableFrom: string;
} {
  const raw = prof?.jobPreferences;
  if (!raw || typeof raw !== "object" || raw === null) {
    return {
      desiredJobTitle: "",
      preferredCategories: [],
      preferredLocation: "",
      salaryMin: "",
      salaryMax: "",
      preferredJobTypes: [],
      availableFrom: "",
    };
  }
  const o = raw as Record<string, unknown>;
  const cats = safeArr(o.preferredCategories)
    .map((x) => (typeof x === "string" ? x : ""))
    .filter(Boolean);
  const typesRaw = safeArr(o.preferredJobTypes).map((x) => String(x));
  const types = typesRaw.filter((x): x is JobType =>
    Object.values(JobType).includes(x as JobType),
  );

  const sm =
    typeof o.salaryMin === "number" && Number.isFinite(o.salaryMin) ? String(o.salaryMin) : "";
  const sx =
    typeof o.salaryMax === "number" && Number.isFinite(o.salaryMax) ? String(o.salaryMax) : "";

  return {
    desiredJobTitle: typeof o.desiredJobTitle === "string" ? o.desiredJobTitle : "",
    preferredCategories: cats,
    preferredLocation: typeof o.preferredLocation === "string" ? o.preferredLocation : "",
    salaryMin: sm,
    salaryMax: sx,
    preferredJobTypes: types,
    availableFrom: typeof o.availableFrom === "string" ? o.availableFrom : "",
  };
}

export function JobSeekerProfileForm() {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const ts = useTranslations("sidebar");
  const tCv = useTranslations("cv");
  const tJobs = useTranslations("jobs");
  const { update: updateSession } = useSession();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [tier, setTier] = useState<SubscriptionTier>("FREE");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [nationality, setNationality] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [uiLanguage, setUiLanguage] = useState<"ar" | "en" | "fr" | "es" | "ur" | "tr">("ar");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [experience, setExperience] = useState<ExpRow[]>([{ title: "", company: "", description: "" }]);
  const [education, setEducation] = useState<EduRow[]>([{ degree: "", institution: "" }]);
  const [skillsText, setSkillsText] = useState("");
  const [languagesText, setLanguagesText] = useState("");
  const [certsText, setCertsText] = useState("");

  const [prefs, setPrefs] = useState(() => prefsFromProfile(null));

  const [completion, setCompletion] = useState(0);
  const [pending, setPending] = useState(false);
  const [aiPending, setAiPending] = useState<null | "summary" | "skills">(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");

  const canAiSummary = hasAccess(tier, "ai_improve_summary");
  const canAiSkills = hasAccess(tier, "ai_skill_suggestions");

  const hydrate = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await axios.get<{
        success?: boolean;
        data: {
          user?: {
            name?: string;
            email?: string;
            image?: string | null;
            subscriptionTier?: SubscriptionTier | string;
          };
          profile?: Profile | null;
          cv?: CV | null;
        };
      }>("/api/profile/job-seeker");
      const d = res.data.data;
      setTier((d?.user?.subscriptionTier as SubscriptionTier) ?? "FREE");
      setName(d?.user?.name ?? "");
      setEmail(d?.user?.email ?? "");
      setPhotoUrl(typeof d?.user?.image === "string" && d.user.image ? d.user.image : null);
      const prof = d?.profile ?? null;
      const cv = d?.cv ?? null;
      setPhone(prof?.phone ?? "");
      setLocation(prof?.location ?? "");
      setBio(prof?.bio ?? "");
      setNationality(prof?.nationality ?? "");
      setDateOfBirth(
        prof?.dateOfBirth instanceof Date
          ? prof.dateOfBirth.toISOString().slice(0, 10)
          : prof?.dateOfBirth
            ? String(prof.dateOfBirth).slice(0, 10)
            : "",
      );
      setGender(prof?.gender ?? "");
      {
        const allowed = ["ar", "en", "fr", "es", "ur", "tr"] as const;
        const raw = (prof?.language ?? "ar") as string;
        setUiLanguage(
          (allowed as readonly string[]).includes(raw)
            ? (raw as (typeof allowed)[number])
            : "ar",
        );
      }
      setPrefs(prefsFromProfile(prof));

      if (cv) {
        setProfessionalTitle(cv.professionalTitle ?? "");
        setSummary(cv.summary ?? "");
        setLinkedinUrl(cv.linkedinUrl ?? "");
        setPortfolioUrl(cv.portfolioUrl ?? "");
        setExperience(
          safeArr(cv.experience).length
            ? safeArr(cv.experience).map((row) => {
                const r = row as Record<string, unknown>;
                return {
                  title: typeof r.title === "string" ? r.title : "",
                  company: typeof r.company === "string" ? r.company : "",
                  description: mergeExperienceDescriptionFromRecord(r),
                };
              })
            : [{ title: "", company: "", description: "" }],
        );
        setEducation(
          safeArr(cv.education).length
            ? safeArr(cv.education).map((row) => {
                const r = row as Record<string, unknown>;
                return {
                  degree: typeof r.degree === "string" ? r.degree : "",
                  institution: typeof r.institution === "string" ? r.institution : "",
                };
              })
            : [{ degree: "", institution: "" }],
        );

        const sk = safeArr(cv.skills).map((row) =>
          typeof row === "string" ? row : (row as Record<string, unknown>).name ?? "",
        );
        setSkillsText(sk.filter((x): x is string => typeof x === "string").join("\n"));
        const langLines = safeArr(cv.languages)
          .map((row) => {
            if (typeof row === "string") return row;
            const r = row as Record<string, unknown>;
            const n = typeof r.name === "string" ? r.name : "";
            const lv = typeof r.level === "string" ? r.level : "";
            return n && lv ? `${n} — ${lv}` : n;
          })
          .filter(Boolean);
        setLanguagesText(langLines.join("\n"));
        const certLines = safeArr(cv.certifications)
          .map((row) => {
            if (typeof row === "string") return row;
            const r = row as Record<string, unknown>;
            return typeof r.name === "string" ? r.name : typeof r.title === "string" ? r.title : "";
          })
          .filter(Boolean);
        setCertsText(certLines.join("\n"));
      } else {
        setProfessionalTitle("");
        setSummary("");
        setLinkedinUrl("");
        setPortfolioUrl("");
        setExperience([{ title: "", company: "", description: "" }]);
        setEducation([{ degree: "", institution: "" }]);
        setSkillsText("");
        setLanguagesText("");
        setCertsText("");
      }

      const pct = cv
        ? computeCvCompletionPercent({
            cv,
            hasProfilePhoto: Boolean(
              typeof d?.user?.image === "string" && d.user.image && d.user.image.length > 0,
            ),
          })
        : computeProfileCompletionPercent(prof);
      setCompletion(pct);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const skillsPayload = useMemo(() => mergeLinesAndComma(skillsText), [skillsText]);
  const languagesPayload = useMemo(() => linesToArr(languagesText), [languagesText]);
  const certsPayload = useMemo(() => linesToArr(certsText), [certsText]);

  async function save() {
    setPending(true);
    setSaved(null);
    try {
      const smin = prefs.salaryMin.trim() ? Number.parseInt(prefs.salaryMin, 10) : undefined;
      const smax = prefs.salaryMax.trim() ? Number.parseInt(prefs.salaryMax, 10) : undefined;
      await axios.put("/api/profile/job-seeker", {
        name: name.trim(),
        profile: {
          bio: bio.trim() || undefined,
          phone: phone.trim() || undefined,
          location: location.trim() || undefined,
          nationality: nationality.trim() || null,
          language: uiLanguage,
          dateOfBirth: dateOfBirth ? dateOfBirth : null,
          gender: gender.trim() || null,
          jobPreferences: {
            desiredJobTitle: prefs.desiredJobTitle.trim() || undefined,
            preferredCategories:
              prefs.preferredCategories.length > 0 ? prefs.preferredCategories : undefined,
            preferredLocation: prefs.preferredLocation.trim() || undefined,
            salaryMin: smin !== undefined && !Number.isNaN(smin) ? smin : undefined,
            salaryMax: smax !== undefined && !Number.isNaN(smax) ? smax : undefined,
            preferredJobTypes: prefs.preferredJobTypes.length ? prefs.preferredJobTypes : undefined,
            availableFrom: prefs.availableFrom.trim() || undefined,
          },
        },
        cv: {
          professionalTitle: professionalTitle.trim() || undefined,
          summary: summary.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          portfolioUrl: portfolioUrl.trim() || undefined,
          experience: experience.filter((e) => e.title || e.company || e.description),
          education: education.filter((e) => e.degree || e.institution),
          skills: skillsPayload,
          languages: languagesPayload,
          certifications: certsPayload,
        },
      });
      setSaved(t("saved"));
      await hydrate();
    } catch (e) {
      const m = isAxiosError(e) ? String(e.response?.data?.error ?? "") : "";
      setSaved(m || tc("error"));
    } finally {
      setPending(false);
    }
  }

  async function runAiSummary() {
    if (!canAiSummary) return;
    setAiPending("summary");
    setSaved(null);
    try {
      const res = await axios.post<{ success: boolean; data?: { summary: string; summaryAr?: string } }>(
        "/api/cv/improve-summary",
        { summary: summary.trim() || bio.trim() || " ", professionalTitle: professionalTitle.trim() || undefined },
      );
      if (res.data.success && res.data.data?.summary) {
        setSummary(res.data.data.summary);
        setSaved(t("saved"));
      }
    } catch {
      setSaved(tc("error"));
    } finally {
      setAiPending(null);
    }
  }

  async function runAiSkills() {
    if (!canAiSkills) return;
    const title = professionalTitle.trim();
    if (!title) {
      setSaved(tc("required"));
      return;
    }
    setAiPending("skills");
    setSaved(null);
    try {
      const res = await axios.post<{ success: boolean; data?: { skills: string[] } }>(
        "/api/cv/suggest-skills",
        { professionalTitle: title },
      );
      if (res.data.success && res.data.data?.skills?.length) {
        const merged = [...new Set([...skillsPayload, ...res.data.data.skills])];
        setSkillsText(merged.join("\n"));
        setSaved(t("saved"));
      }
    } catch {
      setSaved(tc("error"));
    } finally {
      setAiPending(null);
    }
  }

  function toggleCategory(cat: string) {
    setPrefs((p) => ({
      ...p,
      preferredCategories: p.preferredCategories.includes(cat)
        ? p.preferredCategories.filter((x) => x !== cat)
        : [...p.preferredCategories, cat],
    }));
  }

  function toggleJobType(ty: JobType) {
    setPrefs((p) => ({
      ...p,
      preferredJobTypes: p.preferredJobTypes.includes(ty)
        ? p.preferredJobTypes.filter((x) => x !== ty)
        : [...p.preferredJobTypes, ty],
    }));
  }

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setSaved(t("photoInvalidType"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaved(t("photoTooLarge"));
      return;
    }
    setPhotoBusy(true);
    setSaved(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/job-seeker/photo", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { image?: string };
        error?: string;
      };
      if (!res.ok || !json.success || typeof json.data?.image !== "string") {
        setSaved(json.error ?? tc("error"));
        return;
      }
      setPhotoUrl(json.data.image);
      await hydrate();
      await updateSession();
      setSaved(t("saved"));
    } catch {
      setSaved(tc("error"));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setSaved(null);
    try {
      const res = await fetch("/api/profile/job-seeker/photo", {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setSaved(json.error ?? tc("error"));
        return;
      }
      setPhotoUrl(null);
      await hydrate();
      await updateSession();
      setSaved(t("saved"));
    } catch {
      setSaved(tc("error"));
    } finally {
      setPhotoBusy(false);
    }
  }

  if (loadState === "loading") return <LoadingSpinner size="full" label={tc("loading")} />;
  if (loadState === "error")
    return <ErrorState title={tc("error")} retryLabel={tc("retry")} onRetry={() => void hydrate()} />;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <header className="flex flex-wrap items-start gap-8 rounded-xl border border-[#EEF2F7] bg-white p-6 shadow-sm">
        <div className="flex w-full max-w-[220px] flex-col items-center gap-3 sm:items-start">
          <p className="text-sm font-semibold text-[#0D2137]">{t("profilePhotoTitle")}</p>
          <Avatar
            src={photoUrl}
            name={name}
            email={email || "user"}
            size="profile"
            className="ring-4 ring-brand-teal/25"
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label={t("uploadPhoto")}
            onChange={(e) => void onPhotoSelected(e)}
          />
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={photoBusy}
              className="w-full sm:w-auto"
              onClick={() => photoInputRef.current?.click()}
            >
              {photoUrl ? t("changePhoto") : t("uploadPhoto")}
            </Button>
            {photoUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                disabled={photoBusy}
                onClick={() => void removePhoto()}
              >
                {t("removePhoto")}
              </Button>
            ) : null}
          </div>
          <p className="text-center text-xs leading-relaxed text-[#6B7280] sm:text-start">
            {t("profilePhotoHint")}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-6">
          <div className="relative h-28 w-28 shrink-0">
            <div className="flex h-full w-full items-center justify-center rounded-full border-8 border-brand-teal/30 bg-brand-lightTeal">
              <span className="text-2xl font-black text-brand-teal">{completion}%</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-[#0D2137]">{name || email}</h1>
            <p className="text-sm text-[#6B7280]">{t("completion")}</p>
            {saved ? (
              <p className="mt-3 text-xs text-[#6B7280]" role="status">
                {saved}
              </p>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              loading={pending}
              className="mt-4 min-h-11"
              onClick={() => void save()}
            >
              {t("save")}
            </Button>
          </div>
        </div>
      </header>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0D2137]">{t("personal")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium md:col-span-2">
            {t("fullName")}
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            {t("emailShort")}
            <input value={email} readOnly title={t("emailReadonlyHint")} className="mt-1 w-full rounded-lg border bg-[#F9FAFB] px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {t("phoneShort")}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {t("locationShort")}
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {t("dateOfBirthShort")}
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {t("genderShort")}
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 bg-white">
              <option value="">{tc("optional")}</option>
              <option value="female">{t("genderFemale")}</option>
              <option value="male">{t("genderMale")}</option>
              <option value="prefer_not_to_say">{t("genderPreferNot")}</option>
            </select>
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            {t("nationalityShort")}
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {t("uiLanguageShort")}
            <select
              value={uiLanguage}
              onChange={(e) => setUiLanguage(e.target.value as typeof uiLanguage)}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="tr">Türkçe</option>
              <option value="ur">اردو</option>
            </select>
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            {t("bioShort")}
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-[#0D2137]">{t("cvSummarySection")}</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={aiPending === "summary"}
              disabled={!canAiSummary}
              onClick={() => void runAiSummary()}
            >
              {tCv("ai.improveSummary")}
            </Button>
            {!canAiSummary ? <span className="text-xs text-[#6B7280]">{t("upgradeForAi")}</span> : null}
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          <label className="block text-sm font-medium">
            {t("professionalTitleShort")}
            <input value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            {tCv("fields.summary")}
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={5} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              {tCv("fields.linkedin")}
              <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">
              {tCv("fields.portfolio")}
              <input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-[#0D2137]">{t("experience")}</h2>
        <div className="space-y-4">
          {experience.map((ex, idx) => (
            <div key={idx} className="rounded-lg border border-[#EEF2F7] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  {tCv("fields.jobTitle")}
                  <input
                    value={ex.title}
                    onChange={(e) =>
                      setExperience((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, title: e.target.value } : row)),
                    )
                  }
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>
                <label className="text-sm font-medium">
                  {tCv("fields.company")}
                  <input
                    value={ex.company}
                    onChange={(e) =>
                      setExperience((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, company: e.target.value } : row)),
                    )
                  }
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>
              </div>
              <label className="mt-3 block text-sm font-medium">
                {tCv("fields.description")}
                <textarea
                  value={ex.description}
                  onChange={(e) =>
                    setExperience((prev) =>
                      prev.map((row, i) => (i === idx ? { ...row, description: e.target.value } : row)),
                  )
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-semibold text-brand-teal hover:underline"
            onClick={() => setExperience((p) => [...p, { title: "", company: "", description: "" }])}
          >
            + {tCv("addExperience")}
          </button>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-[#0D2137]">{t("education")}</h2>
        <div className="space-y-4">
          {education.map((ed, idx) => (
            <div key={idx} className="grid gap-3 sm:grid-cols-2 rounded-lg border border-[#EEF2F7] p-4">
              <label className="text-sm font-medium">
                {tCv("fields.degree")}
                <input
                  value={ed.degree}
                  onChange={(e) =>
                    setEducation((prev) =>
                      prev.map((row, i) => (i === idx ? { ...row, degree: e.target.value } : row)),
                  )
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                {tCv("fields.institution")}
                <input
                  value={ed.institution}
                  onChange={(e) =>
                    setEducation((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, institution: e.target.value } : row,
                    ),
                  )
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-semibold text-brand-teal hover:underline"
            onClick={() => setEducation((p) => [...p, { degree: "", institution: "" }])}
          >
            + {tCv("addEducation")}
          </button>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-[#0D2137]">{t("skills")}</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={aiPending === "skills"}
            disabled={!canAiSkills}
            onClick={() => void runAiSkills()}
          >
            {tCv("ai.suggestSkills")}
          </Button>
        </div>
        <label className="mt-4 block text-sm font-medium">
          {t("skillsHintProfile")}
          <textarea value={skillsText} onChange={(e) => setSkillsText(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0D2137]">{t("languages")}</h2>
        <label className="mt-4 block text-sm font-medium">
          {t("languagesHintProfile")}
          <textarea value={languagesText} onChange={(e) => setLanguagesText(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0D2137]">{t("certifications")}</h2>
        <label className="mt-4 block text-sm font-medium">
          {t("certificationsHint")}
          <textarea value={certsText} onChange={(e) => setCertsText(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-[#0D2137]">{t("preferences")}</h2>
        <div className="grid gap-4">
          <label className="block text-sm font-medium">
            {t("prefsDesiredTitle")}
            <input
              value={prefs.desiredJobTitle}
              onChange={(e) => setPrefs((p) => ({ ...p, desiredJobTitle: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <p className="text-sm font-medium text-[#374151]">{t("prefsCategoriesHint")}</p>
          <div className="flex flex-wrap gap-2">
            {JOB_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleCategory(c.value)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  prefs.preferredCategories.includes(c.value)
                    ? "border-brand-teal bg-brand-lightTeal text-brand-teal"
                    : "border-[#E5E7EB] text-[#6B7280]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="block text-sm font-medium">
            {t("prefsWorkLocation")}
            <input
              value={prefs.preferredLocation}
              onChange={(e) => setPrefs((p) => ({ ...p, preferredLocation: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {t("prefsSalaryMin")}
              <input
                inputMode="numeric"
                value={prefs.salaryMin}
                onChange={(e) => setPrefs((p) => ({ ...p, salaryMin: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              {t("prefsSalaryMax")}
              <input
                inputMode="numeric"
                value={prefs.salaryMax}
                onChange={(e) => setPrefs((p) => ({ ...p, salaryMax: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
          </div>
          <p className="text-sm font-medium text-[#374151]">{t("prefsJobTypesHint")}</p>
          <div className="flex flex-wrap gap-2">
            {(Object.values(JobType) as JobType[]).map((ty) => (
              <button
                key={ty}
                type="button"
                onClick={() => toggleJobType(ty)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  prefs.preferredJobTypes.includes(ty)
                    ? "border-brand-teal bg-brand-lightTeal text-brand-teal"
                    : "border-[#E5E7EB] text-[#6B7280]"
                }`}
              >
                {tJobs(`jobTypes.${String(ty).toLowerCase()}` as never)}
              </button>
            ))}
          </div>
          <label className="block text-sm font-medium">
            {t("prefsAvailability")}
            <input
              value={prefs.availableFrom}
              onChange={(e) => setPrefs((p) => ({ ...p, availableFrom: e.target.value }))}
              placeholder={t("prefsAvailabilityPlaceholder")}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
        </div>
      </section>

      <p className="text-center text-sm text-[#6B7280]">
        <Link href="/dashboard/job-seeker/cv-builder" className="font-semibold text-brand-teal hover:underline">
          {ts("jobSeeker.cv")}
        </Link>
        {" · "}
        {t("openCvBuilder")}
      </p>

      <div className="flex justify-center pb-8">
        <Button type="button" variant="secondary" loading={pending} className="min-h-11 px-8" onClick={() => void save()}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
