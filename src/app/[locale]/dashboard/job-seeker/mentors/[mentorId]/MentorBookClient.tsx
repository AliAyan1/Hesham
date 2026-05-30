"use client";

import axios from "axios";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { hasAccess } from "@/lib/subscription";
import { calculateSessionPricing } from "@/lib/mentor/pricing";
import { MENTOR_SESSION_DURATIONS } from "@/lib/mentor/constants";
import type { SubscriptionTier } from "@/types";
import { Button } from "@/components/ui/Button";
import type { MentorCertificationDto } from "@/lib/mentor/certification-types";
import { MentorCertificationsDisplay } from "@/components/mentor/MentorCertificationsDisplay";

type MentorDetail = {
  id: string;
  title: string | null;
  titleAr: string | null;
  bio: string | null;
  bioAr: string | null;
  hourlyRate: number | null;
  currency: string;
  averageRating: number;
  yearsExperience: number | null;
  linkedinUrl: string | null;
  expertise: unknown;
  industries: unknown;
  languages: unknown;
  user: { name: string | null; image: string | null };
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
  certifications?: MentorCertificationDto[];
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function asTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

export default function MentorBookClient({ mentorId }: { mentorId: string }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("mentor");
  const session = useSession();
  const rawTier = session.data?.user?.subscriptionTier as string | undefined;
  const tier: SubscriptionTier =
    rawTier === "PROFESSIONAL" || rawTier === "PREMIUM" ? (rawTier as SubscriptionTier) : "FREE";
  const canBook = hasAccess(tier, "mentor_sessions");

  const [mentor, setMentor] = useState<MentorDetail | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void axios
      .get<{ success: boolean; data?: { mentor: MentorDetail } }>(
        `/api/mentors/${encodeURIComponent(mentorId)}`,
      )
      .then((res) => {
        if (res.data.success && res.data.data?.mentor) setMentor(res.data.data.mentor);
      });
  }, [mentorId]);

  const pricing = useMemo(() => {
    if (!mentor?.hourlyRate) return null;
    return calculateSessionPricing(mentor.hourlyRate, duration);
  }, [mentor?.hourlyRate, duration]);

  const bio =
    locale === "ar" && mentor?.bioAr ? mentor.bioAr : mentor?.bio ?? "";
  const title =
    locale === "ar" && mentor?.titleAr ? mentor.titleAr : mentor?.title ?? "";

  async function book() {
    if (!canBook || !scheduledAt) return;
    setBusy(true);
    setError(null);
    try {
      const iso = new Date(scheduledAt).toISOString();
      const res = await axios.post<{ success: boolean; error?: string }>(
        `/api/mentors/${encodeURIComponent(mentorId)}/book`,
        { scheduledAt: iso, duration, topic: "Career guidance" },
      );
      if (!res.data.success) {
        setError(res.data.error ?? t("bookingFailed"));
        return;
      }
      router.push("/dashboard/job-seeker/sessions");
    } catch {
      setError(t("bookingFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!mentor) {
    return <p className="text-sm text-[#6B7280]">{t("loading")}</p>;
  }

  const rate = mentor.hourlyRate ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard/job-seeker/mentors" className="text-sm text-brand-teal hover:underline">
        ← {t("backToMentors")}
      </Link>
      <header className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#0D2137]">{mentor.user.name ?? title}</h1>
        <p className="text-sm text-[#6B7280]">{title}</p>
        <p className="mt-2 text-sm text-[#374151]">{bio}</p>
        <p className="mt-3 text-sm font-semibold text-brand-teal">
          ★ {mentor.averageRating.toFixed(1)}
          {mentor.yearsExperience ? ` · ${mentor.yearsExperience} ${t("yearsExperience")}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {asTags(mentor.expertise).map((tag) => (
            <span key={tag} className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs text-[#0F4C75]">
              {tag}
            </span>
          ))}
        </div>
        {mentor.linkedinUrl ? (
          <a href={mentor.linkedinUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-[#0F4C75] underline">
            LinkedIn
          </a>
        ) : null}
      </header>

      {mentor.availability.length > 0 ? (
        <section className="rounded-xl border bg-white p-4 text-sm">
          <h2 className="font-semibold text-[#0D2137]">{t("availability")}</h2>
          <ul className="mt-2 space-y-1 text-[#6B7280]">
            {mentor.availability.map((a) => (
              <li key={`${a.dayOfWeek}-${a.startTime}`}>
                {DAY_NAMES[a.dayOfWeek] ?? a.dayOfWeek}: {a.startTime} – {a.endTime}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mentor.certifications && mentor.certifications.length > 0 ? (
        <MentorCertificationsDisplay certifications={mentor.certifications} />
      ) : null}

      {!canBook ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {t("upgradePremium")}{" "}
          <Link href="/pricing" className="font-semibold underline">
            {t("viewPlans")}
          </Link>
        </p>
      ) : (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-bold text-[#0D2137]">{t("bookSession")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {MENTOR_SESSION_DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${duration === d ? "border-brand-teal bg-brand-teal/10 text-brand-teal" : "border-[#E5E7EB]"}`}
                onClick={() => setDuration(d)}
              >
                {d} min
              </button>
            ))}
          </div>
          {pricing ? (
            <p className="mt-3 text-sm font-semibold text-[#0D2137]">
              SAR {pricing.price} · {t("platformFeeNote")}
            </p>
          ) : null}
          <label className="mt-4 block text-sm font-medium text-[#374151]">
            {t("dateTime")}
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </label>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <Button type="button" className="mt-4" loading={busy} disabled={!scheduledAt || !rate} onClick={() => void book()}>
            {t("bookSession")}
          </Button>
        </section>
      )}
    </div>
  );
}
