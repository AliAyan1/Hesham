"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";

type DashboardPayload = {
  mentor: {
    isApproved: boolean;
    averageRating: number;
    pendingPayout: number;
    totalEarnings: number;
    user: { name: string | null };
  };
  stats: {
    sessionsThisMonth: number;
    sessionsLastMonthDelta: number;
    earningsThisMonth: number;
    completedCount: number;
  };
  upcoming: Array<{
    id: string;
    scheduledAt: string | null;
    duration: number;
    canJoin: boolean;
    startsInMinutes: number | null;
    mentee?: { name: string | null; image: string | null };
  }>;
  pendingRequests: Array<{
    id: string;
    scheduledAt: string | null;
    duration: number;
    price: number;
    mentorEarning: number;
    mentee?: { name: string | null };
  }>;
  recentReviews: Array<{
    id: string;
    rating: number | null;
    review: string | null;
    mentee: { name: string | null };
  }>;
};

export default function MentorDashboardClient() {
  const t = useTranslations("mentor");
  const ts = useTranslations("session");
  const router = useRouter();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/mentor/dashboard", { credentials: "include" });
    const j = (await res.json()) as { success?: boolean; data?: DashboardPayload };
    if (j.success && j.data) setData(j.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function acceptSession(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/mentor/sessions/${encodeURIComponent(id)}/accept`, {
        method: "POST",
        credentials: "include",
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function declineSession(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/mentor/sessions/${encodeURIComponent(id)}/decline`, {
        method: "POST",
        credentials: "include",
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (!data) {
    return <p className="text-sm text-[#6B7280]">{t("loading")}</p>;
  }

  if (!data.mentor.isApproved) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#C9973A]/40 bg-[#FDF3E3] p-8 text-center shadow-sm">
        <Clock className="mx-auto h-12 w-12 text-[#C9973A]" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-[#0D2137]">{t("underReview")}</h1>
        <p className="mt-3 text-sm text-[#374151]">{t("underReviewMessage")}</p>
        <ul className="mt-6 space-y-2 text-start text-sm text-[#374151]">
          <li>✓ {t("whileWaitingProfile")}</li>
          <li>✓ {t("whileWaitingAvailability")}</li>
          <li>✓ {t("whileWaitingRate")}</li>
        </ul>
        <Link
          href="/dashboard/mentor/profile"
          className="mt-6 inline-flex rounded-lg bg-[#C9973A] px-6 py-2.5 text-sm font-semibold text-white"
        >
          {t("completeProfile")}
        </Link>
      </div>
    );
  }

  const name = data.mentor.user.name ?? t("title");

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-[#C9973A]/30 bg-gradient-to-r from-[#FDF3E3] to-white p-6">
        <p className="text-lg font-bold text-[#0D2137]">
          {t("welcomeBack", { name })}
        </p>
        <p className="text-sm text-[#6B7280]">{t("approvedBanner")}</p>
        <span className="mt-2 inline-block rounded-full bg-[#C9973A] px-3 py-1 text-xs font-bold text-white">
          {t("approvedBadge")}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard border="#0F4C75" label={t("sessionsThisMonth")} value={String(data.stats.sessionsThisMonth)} sub={t("deltaSessions", { n: String(data.stats.sessionsLastMonthDelta) })} />
        <StatCard border="#1D9E75" label={t("earningsThisMonth")} value={`SAR ${Math.round(data.stats.earningsThisMonth)}`} sub={t("pendingPayoutLabel", { amount: String(Math.round(data.mentor.pendingPayout)) })} />
        <StatCard border="#C9973A" label={t("totalSessions")} value={String(data.stats.completedCount)} />
        <StatCard border="#7C3AED" label={t("averageRating")} value={`${data.mentor.averageRating.toFixed(1)} / 5 ⭐`} />
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0D2137]">{t("upcomingSessions")}</h2>
        {data.upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-[#6B7280]">{t("noUpcoming")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.upcoming.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="font-semibold text-[#0D2137]">{s.mentee?.name ?? "—"}</p>
                  <p className="text-xs text-[#6B7280]">
                    {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : "—"} · {s.duration} min
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!s.canJoin}
                  onClick={() => router.push(`/session/${s.id}`)}
                >
                  {s.canJoin
                    ? ts("joinNow")
                    : s.startsInMinutes != null
                      ? `${ts("startsIn")} ${s.startsInMinutes} ${ts("minutes")}`
                      : t("joinSession")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0D2137]">{t("sessionRequest")}</h2>
        {data.pendingRequests.length === 0 ? (
          <p className="mt-3 text-sm text-[#6B7280]">{t("noPendingRequests")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.pendingRequests.map((s) => (
              <li key={s.id} className="rounded-lg border p-4">
                <p className="font-semibold">{s.mentee?.name ?? "—"}</p>
                <p className="text-xs text-[#6B7280]">
                  {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : "—"} · {s.duration} min · SAR {Math.round(s.price)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button type="button" loading={busyId === s.id} onClick={() => void acceptSession(s.id)}>
                    {t("accept")}
                  </Button>
                  <Button type="button" variant="outline" disabled={busyId === s.id} onClick={() => void declineSession(s.id)}>
                    {t("decline")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0D2137]">{t("recentReviews")}</h2>
        {data.recentReviews.length === 0 ? (
          <p className="mt-3 text-sm text-[#6B7280]">—</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {data.recentReviews.map((r) => (
              <li key={r.id}>
                {"★".repeat(r.rating ?? 0)} {r.mentee.name} — {r.review ?? ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-[#0D2137]">{t("payoutSection")}</h2>
        <p className="mt-2 text-sm">
          {t("pendingPayout")}: SAR {Math.round(data.mentor.pendingPayout)}
        </p>
        <Button type="button" className="mt-4" variant="outline">
          {t("requestPayout")}
        </Button>
      </section>
    </div>
  );
}

function StatCard({
  border,
  label,
  value,
  sub,
}: {
  border: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderTopWidth: 4, borderTopColor: border }}>
      <p className="text-xs text-[#6B7280]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#0D2137]">{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#6B7280]">{sub}</p> : null}
    </div>
  );
}
