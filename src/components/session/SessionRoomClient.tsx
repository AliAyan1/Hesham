"use client";

import DailyIframe from "@daily-co/daily-js";
import type { DailyCall } from "@daily-co/daily-js";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MESSAGE_FILTER_ERROR } from "@/lib/message-filter";

type SessionPayload = {
  id: string;
  status: string;
  duration: number;
  topic: string | null;
  notes: string | null;
  scheduledAt: string | null;
  canJoin: boolean;
  joinOpensAt: string | null;
  otherParty: { id: string; name: string | null; image: string | null } | null;
};

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  sender: { name: string | null };
};

type JoinPayload = {
  token: string;
  roomName: string;
  dailyDomain: string;
  duration: number;
  userName: string;
};

export default function SessionRoomClient({ sessionId }: { sessionId: string }) {
  const t = useTranslations("session");
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [phase, setPhase] = useState<"prejoin" | "live" | "loading">("loading");
  const [countdownMin, setCountdownMin] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [panel, setPanel] = useState<"chat" | "notes" | null>("chat");
  const callRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      credentials: "include",
    });
    const j = (await res.json()) as {
      success?: boolean;
      data?: { session: SessionPayload };
      error?: string;
    };
    if (!j.success || !j.data?.session) {
      setError(j.error ?? "Session not found");
      return;
    }
    setSession(j.data.session);
    setNotes(j.data.session.notes ?? "");
    setPhase(j.data.session.status === "IN_PROGRESS" ? "live" : "prejoin");
  }, [sessionId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!session?.scheduledAt || session.canJoin) {
      setCountdownMin(null);
      return;
    }
    const tick = () => {
      const openAt = session.joinOpensAt
        ? new Date(session.joinOpensAt).getTime()
        : new Date(session.scheduledAt!).getTime() - 5 * 60 * 1000;
      const diff = openAt - Date.now();
      setCountdownMin(diff > 0 ? Math.ceil(diff / 60000) : 0);
    };
    tick();
    const id = window.setInterval(tick, 10000);
    return () => window.clearInterval(id);
  }, [session]);

  const loadChat = useCallback(async () => {
    const res = await fetch(
      `/api/sessions/mentor-messages?sessionId=${encodeURIComponent(sessionId)}`,
      { credentials: "include" },
    );
    const j = (await res.json()) as {
      success?: boolean;
      data?: { messages: ChatMessage[] };
    };
    if (j.success && j.data?.messages) setMessages(j.data.messages);
  }, [sessionId]);

  useEffect(() => {
    if (phase !== "live") return;
    void loadChat();
    const id = window.setInterval(() => void loadChat(), 5000);
    return () => window.clearInterval(id);
  }, [phase, loadChat]);

  useEffect(() => {
    if (phase !== "live" || !session) return;
    setRemainingSec(session.duration * 60);
    const id = window.setInterval(() => {
      setRemainingSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, session]);

  async function saveNotes(value: string) {
    await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/notes`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });
  }

  async function endSession() {
    if (callRef.current) {
      await callRef.current.leave().catch(() => undefined);
      callRef.current.destroy();
      callRef.current = null;
    }
    await fetch("/api/sessions/end", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    router.push(`/session/${sessionId}/complete`);
  }

  async function joinCall() {
    if (!session?.canJoin) return;
    setJoining(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/join", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const j = (await res.json()) as {
        success?: boolean;
        data?: JoinPayload;
        error?: string;
      };
      if (!j.success || !j.data) {
        setError(j.error ?? "Could not join");
        return;
      }
      const el = containerRef.current;
      if (!el) return;

      const frame = DailyIframe.createFrame(el, {
        iframeStyle: {
          position: "absolute",
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: "12px",
        },
        showLeaveButton: false,
        showFullscreenButton: true,
        showLocalVideo: true,
        showParticipantsBar: false,
      });

      callRef.current = frame;
      frame.on("left-meeting", () => {
        void endSession();
      });
      frame.on("error", () => {
        setError(t("connectionError"));
      });

      await frame.join({
        url: `https://${j.data.dailyDomain}/${j.data.roomName}`,
        token: j.data.token,
      });
      setPhase("live");
    } catch {
      setError(t("connectionError"));
    } finally {
      setJoining(false);
    }
  }

  async function sendChat() {
    const body = chatDraft.trim();
    if (!body) return;
    setChatError(null);
    const res = await fetch("/api/sessions/mentor-messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, body }),
    });
    const j = (await res.json()) as { success?: boolean; error?: string };
    if (!j.success) {
      setChatError(j.error === MESSAGE_FILTER_ERROR ? t("messageFilter") : (j.error ?? t("connectionError")));
      return;
    }
    setChatDraft("");
    await loadChat();
  }

  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;

  if (error && !session) {
    return <p className="p-6 text-sm text-red-600">{error}</p>;
  }

  if (!session) {
    return <p className="p-6 text-sm text-[#6B7280]">{t("loading")}</p>;
  }

  const other = session.otherParty;

  if (phase === "prejoin") {
    return (
      <div className="mx-auto max-w-lg space-y-6 p-6">
        <div className="flex items-center gap-3">
          {other?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={other.image} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F4F8] text-lg font-bold text-[#0F4C75]">
              {(other?.name ?? "?")[0]}
            </div>
          )}
          <div>
            <p className="font-bold text-[#0D2137]">{other?.name ?? "—"}</p>
            {session.topic ? (
              <p className="text-sm text-[#6B7280]">
                {t("topic")}: {session.topic}
              </p>
            ) : null}
            <p className="text-sm text-[#6B7280]">
              {t("duration")}: {session.duration} {t("minutes")}
            </p>
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          type="button"
          className="w-full"
          loading={joining}
          disabled={!session.canJoin}
          onClick={() => void joinCall()}
        >
          {session.canJoin
            ? t("joinNow")
            : countdownMin != null && countdownMin > 0
              ? `${t("startsIn")} ${countdownMin} ${t("minutes")}`
              : t("join")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <div className="relative min-h-[50vh] flex-1 lg:min-h-0 lg:w-[70%]">
        <div ref={containerRef} className="absolute inset-0" />
      </div>
      <aside className="flex flex-col border-t bg-white lg:w-[30%] lg:border-t-0 lg:border-s">
        <div className="border-b p-4">
          <p className="font-semibold text-[#0D2137]">{other?.name ?? "—"}</p>
          <p className="text-xs text-[#6B7280]">
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")} {t("remaining")}
          </p>
        </div>
        <div className="flex gap-2 border-b p-2 lg:hidden">
          <Button type="button" size="sm" variant="outline" onClick={() => setPanel(panel === "chat" ? null : "chat")}>
            Chat
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setPanel(panel === "notes" ? null : "notes")}>
            {t("notes")}
          </Button>
        </div>
        <div className={`flex flex-1 flex-col overflow-hidden ${panel === null ? "hidden lg:flex" : "flex"}`}>
          {(panel === "chat" || panel === null) && (
            <div className="flex flex-1 flex-col overflow-hidden p-3">
              <div className="flex-1 space-y-2 overflow-y-auto text-sm">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg px-3 py-2 ${m.isMine ? "ms-8 bg-[#E8F4F8]" : "me-8 bg-gray-100"}`}
                  >
                    {m.body}
                  </div>
                ))}
              </div>
              {chatError ? <p className="mt-1 text-xs text-red-600">{chatError}</p> : null}
              <div className="mt-2 flex gap-2">
                <input
                  className="min-h-11 flex-1 rounded-lg border px-3 text-sm"
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  placeholder={t("chatPlaceholder")}
                />
                <Button type="button" size="sm" onClick={() => void sendChat()}>
                  {t("send")}
                </Button>
              </div>
            </div>
          )}
          {(panel === "notes" || panel === null) && (
            <div className="hidden flex-col border-t p-3 lg:flex">
              <label className="text-xs font-semibold text-[#6B7280]">{t("notes")}</label>
              <textarea
                className="mt-1 min-h-[120px] flex-1 rounded-lg border p-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => void saveNotes(notes)}
              />
            </div>
          )}
        </div>
        <div className="border-t p-4">
          <Button type="button" variant="danger" className="w-full" onClick={() => void endSession()}>
            {t("end")}
          </Button>
        </div>
      </aside>
    </div>
  );
}
