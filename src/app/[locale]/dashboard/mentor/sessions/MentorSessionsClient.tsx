"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { MentorSessionListItem } from "@/lib/mentor/session-list-item";

type Tab = "requests" | "upcoming" | "completed";

export default function MentorSessionsClient() {
  const t = useTranslations("session");
  const tm = useTranslations("mentor");
  const router = useRouter();
  const [rows, setRows] = useState<MentorSessionListItem[]>([]);
  const [tab, setTab] = useState<Tab>("requests");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/mentor/sessions", { credentials: "include" });
    const j = (await res.json()) as { success?: boolean; data?: { sessions: MentorSessionListItem[] } };
    if (j.success && j.data?.sessions) setRows(j.data.sessions);
  }

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    if (tab === "requests") return rows.filter((r) => r.status === "PENDING");
    if (tab === "upcoming") {
      return rows.filter((r) => r.status === "CONFIRMED" || r.status === "IN_PROGRESS");
    }
    return rows.filter((r) => r.status === "COMPLETED");
  }, [rows, tab]);

  async function accept(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/mentor/sessions/${encodeURIComponent(id)}/accept`, {
        method: "POST",
        credentials: "include",
      });
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function decline(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/mentor/sessions/${encodeURIComponent(id)}/decline`, {
        method: "POST",
        credentials: "include",
      });
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0D2137]">{tm("sessions")}</h1>
      <div className="flex flex-wrap gap-2">
        {(["requests", "upcoming", "completed"] as Tab[]).map((k) => (
          <button
            key={k}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-[#C9973A] text-white" : "bg-gray-100"}`}
            onClick={() => setTab(k)}
          >
            {t(k)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-[#6B7280]">{tm("noSessions")}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((s) => {
            const mentee = s.mentee;
            return (
              <li key={s.id} className="rounded-xl border bg-white p-4">
                <p className="font-semibold">{mentee?.name ?? "—"}</p>
                <p className="text-xs text-[#6B7280]">
                  {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : "—"} · {s.duration} {t("minutes")}
                  {tab === "requests" ? ` · SAR ${Math.round(s.price)} (${t("yourEarning")}: SAR ${Math.round(s.mentorEarning)})` : ""}
                </p>
                {s.topic ? <p className="text-xs text-[#6B7280]">{t("topic")}: {s.topic}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {tab === "requests" && (
                    <>
                      <Button type="button" size="sm" loading={busyId === s.id} onClick={() => void accept(s.id)}>
                        {tm("accept")}
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busyId === s.id} onClick={() => void decline(s.id)}>
                        {tm("decline")}
                      </Button>
                    </>
                  )}
                  {tab === "upcoming" && (
                    <>
                      <Button type="button" size="sm" disabled={!s.canJoin} onClick={() => router.push(`/session/${s.id}`)}>
                        {s.canJoin ? t("joinNow") : s.startsInMinutes != null ? `${t("startsIn")} ${s.startsInMinutes} ${t("minutes")}` : t("join")}
                      </Button>
                      <Link href={`/dashboard/mentor/messages?session=${s.id}`} className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold">
                        {t("message")}
                      </Link>
                    </>
                  )}
                  {tab === "completed" && (
                    <p className="text-sm text-[#1D9E75]">
                      {t("yourEarning")}: SAR {Math.round(s.mentorEarning)}
                      {s.rating != null ? ` · ${"★".repeat(s.rating)}` : ""}
                      {s.review ? ` — ${s.review}` : ""}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
