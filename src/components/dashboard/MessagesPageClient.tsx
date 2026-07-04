"use client";

import axios from "axios";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { containsContactInfo, MESSAGE_FILTER_ERROR } from "@/lib/message-filter";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { cn } from "@/lib/cn";

type ThreadRow = {
  id: string;
  otherUserId: string;
  otherName: string;
  lastBody: string;
  lastAt: string;
};

type MsgRow = { id: string; senderId: string; body: string; createdAt: string };

export function MessagesPageClient() {
  const t = useTranslations("messages");
  const tc = useTranslations("common");
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const searchParams = useSearchParams();
  const toParam = searchParams.get("to");

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [draft, setDraft] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [sending, setSending] = useState(false);
  const [filterErr, setFilterErr] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    setErr(false);
    try {
      const res = await axios.get<{ success: boolean; data: { threads: ThreadRow[] } }>("/api/messages");
      const list = res.data?.data?.threads ?? [];
      setThreads(list);
      setSelectedId((prev) => {
        if (prev && list.some((x) => x.id === prev)) return prev;
        if (toParam) {
          const match = list.find((x) => x.otherUserId === toParam);
          if (match) return match.id;
        }
        return list[0]?.id ?? null;
      });
      if (toParam && !list.some((x) => x.otherUserId === toParam)) {
        setRecipientId(toParam);
      }
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, [toParam]);

  const loadMessages = useCallback(async (threadId: string) => {
    try {
      const res = await axios.get<{ success: boolean; data: { messages: MsgRow[] } }>(
        `/api/messages/${encodeURIComponent(threadId)}`,
      );
      if (res.data?.success) setMessages(res.data.data.messages);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
    const timer = window.setInterval(() => {
      void loadThreads();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
    const timer = window.setInterval(() => {
      void loadMessages(selectedId);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadMessages, selectedId]);

  const selected = threads.find((x) => x.id === selectedId);

  async function send() {
    const rid = selected?.otherUserId || recipientId.trim();
    const body = draft.trim();
    if (!rid || !body) return;
    if (containsContactInfo(body)) {
      setFilterErr(t("filterWarning"));
      return;
    }
    setFilterErr(null);
    setSending(true);
    try {
      if (selectedId) {
        const res = await axios.post<{ success: boolean; error?: string }>(
          `/api/messages/${encodeURIComponent(selectedId)}`,
          { body },
        );
        if (!res.data?.success) {
          setFilterErr(
            res.data?.error === MESSAGE_FILTER_ERROR ? t("filterWarning") : (res.data?.error ?? t("sendFailed")),
          );
          return;
        }
      } else {
        const res = await axios.post<{ success: boolean; error?: string; data: { threadId: string } }>(
          "/api/messages",
          { recipientId: rid, body },
        );
        if (!res.data?.success) {
          setFilterErr(
            res.data?.error === MESSAGE_FILTER_ERROR ? t("filterWarning") : (res.data?.error ?? t("sendFailed")),
          );
          return;
        }
        setSelectedId(res.data.data.threadId);
      }
      setDraft("");
      await loadThreads();
      if (selectedId) await loadMessages(selectedId);
    } finally {
      setSending(false);
    }
  }

  if (loading && !threads.length) return <LoadingSkeleton rows={5} />;
  if (err) return <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={loadThreads} />;

  if (!threads.length && !recipientId && !toParam) {
    return (
      <EmptyState
        title={t("emptyThreads")}
        description={t("noMessagesYet")}
      />
    );
  }

  return (
    <div className="grid min-h-[420px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-[#EEF2F7] bg-white p-3 shadow-sm">
        <h2 className="px-2 py-2 text-sm font-bold text-[#0D2137]">{t("threadsTitle")}</h2>
        <ul className="max-h-[480px] space-y-1 overflow-y-auto">
          {threads.map((th) => (
            <li key={th.id}>
              <button
                type="button"
                onClick={() => setSelectedId(th.id)}
                className={`w-full rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                  th.id === selectedId ? "bg-brand-lightTeal font-semibold text-brand-teal" : "hover:bg-gray-50"
                }`}
              >
                <span className="block truncate font-medium text-[#0D2137]">{th.otherName}</span>
                <span className="line-clamp-2 text-xs text-[#6B7280]">{th.lastBody || t("emptyPreview")}</span>
                <span className="mt-1 block text-[10px] text-[#9CA3AF]">
                  {new Date(th.lastAt).toLocaleString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex flex-col rounded-xl border border-[#EEF2F7] bg-white shadow-sm">
        <header className="border-b border-[#EEF2F7] px-4 py-3">
          <h3 className="font-semibold text-[#0D2137]">
            {selected ? selected.otherName : t("newConversation")}
          </h3>
          {!selected && (
            <label className="mt-2 block text-xs font-medium text-[#374151]">
              {t("recipientIdLabel")}
              <input
                className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2 text-sm"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                placeholder={t("recipientPlaceholder")}
              />
            </label>
          )}
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "360px" }}>
          {messages.map((m) => {
            const mine = m.senderId === userId;
            return (
              <div
                key={m.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "bg-[#0F4C75] text-white" : "bg-[#F3F4F6] text-[#111827]",
                  )}
                >
                  <p className="text-[10px] opacity-80">{new Date(m.createdAt).toLocaleString()}</p>
                  <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            );
          })}
          {!messages.length ? <p className="text-sm text-[#6B7280]">{t("noMessagesYet")}</p> : null}
        </div>

        <footer className="border-t border-[#EEF2F7] p-3">
          <textarea
            className="min-h-11 w-full rounded-lg border px-3 py-2 text-sm"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("composePlaceholder")}
          />
          {filterErr ? <p className="mb-2 text-xs text-red-600">{filterErr}</p> : null}
          <div className="mt-2 flex justify-end">
            <Button type="button" className="min-h-11 min-w-[100px]" loading={sending} onClick={() => void send()}>
              {sending ? t("sending") : t("send")}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}
