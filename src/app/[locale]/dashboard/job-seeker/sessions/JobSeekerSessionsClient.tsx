"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { MentorSessionListItem } from "@/lib/mentor/session-list-item";

type Tab = "upcoming" | "completed" | "cancelled";

export default function JobSeekerSessionsClient() {
  const t = useTranslations("session");
  const router = useRouter();
  const [rows, setRows] = useState<MentorSessionListItem[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/job-seeker/sessions", { credentials: "include" })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { sessions: MentorSessionListItem[] } }>)
      .then((j) => {
        if (j.success && j.data?.sessions) setRows(j.data.sessions);
      });
  }, []);

  const filtered = useMemo(() => {
    if (tab === "upcoming") {
      return rows.filter((r) => r.status === "PENDING" || r.status === "CONFIRMED" || r.status === "IN_PROGRESS");
    }
    if (tab === "completed") return rows.filter((r) => r.status === "COMPLETED");
    return rows.filter((r) => r.status === "CANCELLED" || r.status === "NO_SHOW");
  }, [rows, tab]);

  async function cancel(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/sessions/${encodeURIComponent(id)}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const res = await fetch("/api/job-seeker/sessions", { credentials: "include" });
      const j = (await res.json()) as { success?: boolean; data?: { sessions: MentorSessionListItem[] } };
      if (j.success && j.data?.sessions) setRows(j.data.sessions);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0D2137]">{t("title")}</h1>
      <div className="flex flex-wrap gap-2">
        {(["upcoming", "completed", "cancelled"] as Tab[]).map((k) => (
          <button
            key={k}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-[#0F4C75] text-white" : "bg-gray-100 text-[#374151]"}`}
            onClick={() => setTab(k)}
          >
            {t(k)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-[#6B7280]">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((s) => {
            const mentor = s.mentor?.user;
            return (
              <li key={s.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {mentor?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mentor.image} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F4F8] font-bold text-[#0F4C75]">
                        {(mentor?.name ?? "?")[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-[#0D2137]">{mentor?.name ?? "—"}</p>
                      <p className="text-xs text-[#6B7280]">
                        {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : "—"} · {s.duration}{" "}
                        {t("minutes")}
                      </p>
                      {s.topic ? (
                        <p className="text-xs text-[#6B7280]">
                          {t("topic")}: {s.topic}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(s.status === "CONFIRMED" || s.status === "IN_PROGRESS") && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!s.canJoin}
                          onClick={() => router.push(`/session/${s.id}`)}
                        >
                          {s.canJoin
                            ? t("joinNow")
                            : s.startsInMinutes != null
                              ? `${t("startsIn")} ${s.startsInMinutes} ${t("minutes")}`
                              : t("join")}
                        </Button>
                        <Link
                          href={`/dashboard/job-seeker/session-messages?session=${s.id}`}
                          className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold text-[#0F4C75]"
                        >
                          {t("messageMentor")}
                        </Link>
                      </>
                    )}
                    {s.status === "PENDING" && (
                      <Button type="button" size="sm" variant="outline" loading={busyId === s.id} onClick={() => void cancel(s.id)}>
                        {t("cancel")}
                      </Button>
                    )}
                    {s.status === "COMPLETED" && s.rating != null && (
                      <span className="text-sm text-[#C9973A]">{"★".repeat(s.rating)}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
