"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MESSAGE_FILTER_ERROR } from "@/lib/message-filter";

type Thread = {
  id: string;
  sessionId: string;
  otherName: string;
  lastBody: string;
};

type Msg = { id: string; body: string; isMine: boolean; createdAt: string };

export default function MentorSessionMessagesClient() {
  const t = useTranslations("messages");
  const ts = useTranslations("session");
  const params = useSearchParams();
  const sessionParam = params.get("session");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionParam);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [filterErr, setFilterErr] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/messages/mentor-threads", { credentials: "include" });
    const j = (await res.json()) as { success?: boolean; data?: { threads: Thread[] } };
    if (j.success && j.data?.threads) {
      setThreads(j.data.threads);
      if (!activeSessionId && j.data.threads[0]) {
        setActiveSessionId(j.data.threads[0].sessionId);
      }
    }
  }, [activeSessionId]);

  useEffect(() => {
    void loadThreads();
    const id = window.setInterval(() => void loadThreads(), 5000);
    return () => window.clearInterval(id);
  }, [loadThreads]);

  useEffect(() => {
    if (sessionParam) setActiveSessionId(sessionParam);
  }, [sessionParam]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    void fetch(`/api/sessions/mentor-messages?sessionId=${encodeURIComponent(activeSessionId)}`, {
      credentials: "include",
    })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { messages: Msg[] } }>)
      .then((j) => {
        if (j.success && j.data?.messages) setMessages(j.data.messages);
      });
  }, [activeSessionId]);

  async function send() {
    if (!activeSessionId || !draft.trim()) return;
    setFilterErr(null);
    const res = await fetch("/api/sessions/mentor-messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: activeSessionId, body: draft.trim() }),
    });
    const j = (await res.json()) as { success?: boolean; error?: string };
    if (!j.success) {
      setFilterErr(j.error === MESSAGE_FILTER_ERROR ? ts("messageFilter") : (j.error ?? t("sendFailed")));
      return;
    }
    setDraft("");
    const reload = await fetch(
      `/api/sessions/mentor-messages?sessionId=${encodeURIComponent(activeSessionId)}`,
      { credentials: "include" },
    );
    const rj = (await reload.json()) as { success?: boolean; data?: { messages: Msg[] } };
    if (rj.success && rj.data?.messages) setMessages(rj.data.messages);
  }

  const active = threads.find((x) => x.sessionId === activeSessionId);

  return (
    <div className="grid min-h-[420px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-xl border bg-white p-3">
        <h2 className="px-2 py-2 text-sm font-bold">{t("title")}</h2>
        <ul className="space-y-1">
          {threads.map((th) => (
            <li key={th.id}>
              <button
                type="button"
                className={`w-full rounded-lg px-3 py-2 text-start text-sm ${th.sessionId === activeSessionId ? "bg-[#E8F4F8] font-semibold" : "hover:bg-gray-50"}`}
                onClick={() => setActiveSessionId(th.sessionId)}
              >
                {th.otherName}
                <span className="block truncate text-xs text-[#6B7280]">{th.lastBody || t("noMessages")}</span>
              </button>
            </li>
          ))}
        </ul>
        {threads.length === 0 ? <p className="px-2 py-4 text-xs text-[#6B7280]">{t("noThreads")}</p> : null}
      </aside>
      <section className="flex flex-col rounded-xl border bg-white p-4">
        <p className="font-semibold text-[#0D2137]">{active?.otherName ?? "—"}</p>
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto text-sm">
          {messages.map((m) => (
            <div key={m.id} className={`rounded-lg px-3 py-2 ${m.isMine ? "ms-8 bg-[#E8F4F8]" : "me-8 bg-gray-100"}`}>
              {m.body}
            </div>
          ))}
        </div>
        {filterErr ? <p className="mt-2 text-xs text-red-600">{filterErr}</p> : null}
        <div className="mt-3 flex gap-2">
          <input
            className="min-h-11 flex-1 rounded-lg border px-3 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("placeholder")}
          />
          <Button type="button" onClick={() => void send()}>
            {t("send")}
          </Button>
        </div>
      </section>
    </div>
  );
}
