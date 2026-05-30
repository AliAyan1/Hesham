"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MENTOR_INDUSTRIES } from "@/lib/mentor/constants";
import type { MentorCertificationDto } from "@/lib/mentor/certification-types";
import { MentorCertificationsSection } from "@/components/mentor/MentorCertificationsSection";
import { Button } from "@/components/ui/Button";

type MentorProfile = {
  title: string | null;
  titleAr: string | null;
  bio: string | null;
  bioAr: string | null;
  expertise: unknown;
  industries: unknown;
  languages: unknown;
  hourlyRate: number | null;
  linkedinUrl: string | null;
  yearsExperience: number | null;
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>;
  certifications?: MentorCertificationDto[];
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

export default function MentorProfileClient() {
  const t = useTranslations("mentor");
  const [form, setForm] = useState<MentorProfile | null>(null);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [certifications, setCertifications] = useState<MentorCertificationDto[]>([]);

  useEffect(() => {
    void fetch("/api/mentor/profile", { credentials: "include" })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { mentor: MentorProfile & { availability?: MentorProfile["availability"] } } }>)
      .then((j) => {
        if (!j.success || !j.data?.mentor) return;
        const m = j.data.mentor;
        setForm({
          title: m.title,
          titleAr: m.titleAr,
          bio: m.bio,
          bioAr: m.bioAr,
          expertise: m.expertise,
          industries: m.industries,
          languages: m.languages,
          hourlyRate: m.hourlyRate,
          linkedinUrl: m.linkedinUrl,
          yearsExperience: m.yearsExperience,
          availability: m.availability ?? [],
        });
        const certs = (m as MentorProfile & { certifications?: MentorCertificationDto[] }).certifications;
        setCertifications(Array.isArray(certs) ? certs : []);
      });
  }, []);

  if (!form) return <p className="text-sm text-[#6B7280]">{t("loading")}</p>;

  const expertise = asStringArray(form.expertise);
  const industries = asStringArray(form.industries);

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/mentor/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = (await res.json()) as { success?: boolean };
      if (j.success) setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  function addExpertise() {
    const tag = expertiseInput.trim();
    if (!tag || expertise.length >= 10) return;
    setForm((f) => (f ? { ...f, expertise: [...expertise, tag] } : f));
    setExpertiseInput("");
  }

  function toggleIndustry(ind: string) {
    setForm((f) => {
      if (!f) return f;
      const set = new Set(industries);
      if (set.has(ind)) set.delete(ind);
      else set.add(ind);
      return { ...f, industries: [...set] };
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-[#0D2137]">{t("profile")}</h1>

      <section className="space-y-3 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold">{t("basicInfo")}</h2>
        <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder={t("titleEn")} value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder={t("titleAr")} value={form.titleAr ?? ""} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
        <input type="number" className="w-full rounded-lg border px-3 py-2 text-sm" placeholder={t("yearsExperience")} value={form.yearsExperience ?? ""} onChange={(e) => setForm({ ...form, yearsExperience: Number(e.target.value) })} />
        <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="LinkedIn URL" value={form.linkedinUrl ?? ""} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} />
      </section>

      <section className="space-y-3 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold">{t("bioSection")}</h2>
        <textarea className="w-full rounded-lg border p-3 text-sm" rows={5} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <p className="text-xs text-[#6B7280]">{(form.bio ?? "").length} / 500</p>
        <textarea className="w-full rounded-lg border p-3 text-sm" rows={5} value={form.bioAr ?? ""} onChange={(e) => setForm({ ...form, bioAr: e.target.value })} />
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold">{t("expertise")}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {expertise.map((tag) => (
            <span key={tag} className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#0F4C75]">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="flex-1 rounded-lg border px-3 py-2 text-sm" value={expertiseInput} onChange={(e) => setExpertiseInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExpertise())} />
          <Button type="button" variant="outline" onClick={addExpertise}>Add</Button>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold">{t("industries")}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {MENTOR_INDUSTRIES.map((ind) => (
            <label key={ind} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={industries.includes(ind)} onChange={() => toggleIndustry(ind)} />
              {ind}
            </label>
          ))}
        </div>
      </section>

      <MentorCertificationsSection initial={certifications} onChange={setCertifications} />

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold">{t("hourlyRate")}</h2>
        <input type="number" className="mt-2 w-full max-w-xs rounded-lg border px-3 py-2 text-sm" value={form.hourlyRate ?? ""} onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })} />
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold">{t("availability")}</h2>
        <div className="mt-3 space-y-2">
          {DAY_LABELS.map((label, dayOfWeek) => {
            const row = form.availability.find((a) => a.dayOfWeek === dayOfWeek);
            return (
              <div key={dayOfWeek} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-12 font-medium">{label}</span>
                <input type="time" className="rounded border px-2 py-1" value={row?.startTime ?? "09:00"} onChange={(e) => {
                  const next = [...form.availability.filter((a) => a.dayOfWeek !== dayOfWeek), { dayOfWeek, startTime: e.target.value, endTime: row?.endTime ?? "17:00", isActive: true }];
                  setForm({ ...form, availability: next });
                }} />
                <input type="time" className="rounded border px-2 py-1" value={row?.endTime ?? "17:00"} onChange={(e) => {
                  const next = [...form.availability.filter((a) => a.dayOfWeek !== dayOfWeek), { dayOfWeek, startTime: row?.startTime ?? "09:00", endTime: e.target.value, isActive: true }];
                  setForm({ ...form, availability: next });
                }} />
              </div>
            );
          })}
        </div>
      </section>

      {saved ? <p className="text-sm font-medium text-emerald-700">{t("profileSaved")}</p> : null}
      <Button type="button" loading={busy} onClick={() => void save()}>
        {t("saveProfile")}
      </Button>
    </div>
  );
}
