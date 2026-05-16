"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PROCTORING_MAX_WARNINGS } from "@/lib/assessment/proctoring-policy";

type ViolationCode =
  | "TAB_SWITCH"
  | "FULLSCREEN_EXIT"
  | "SCREEN_SHARE_ENDED"
  | "NOT_MONITOR_SHARE"
  | "FACE_NOT_VISIBLE"
  | "MULTIPLE_FACES"
  | "LOOKING_AWAY"
  | "COPY_PASTE_ATTEMPT"
  | "AI_TYPING_PATTERN";

export type ProctoringSuspensionInfo = {
  cooldownUntil: string;
  talentPoolAdded?: boolean;
};

export type UseProctoringOptions = {
  enabled: boolean;
  assessmentId?: string;
  interviewId?: string;
  displayStream: MediaStream | null;
  cameraStream: MediaStream | null;
  onFlagged?: () => void;
  onSuspended?: (info: ProctoringSuspensionInfo) => void;
};

type ProctoringApiOk = { success: true; data: { sessionId: string; warningCount: number } };
type ProctoringApiErr = { success: false; error?: string };

type FlagApiOk = {
  success: true;
  data: { ok: true; cooldownUntil: string; talentPoolAdded: boolean };
};

async function postProctoring(body: object): Promise<{ sessionId: string; warningCount: number }> {
  const res = await fetch("/api/assessment/proctoring", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ProctoringApiOk | ProctoringApiErr;
  if (!res.ok || !json.success || !("data" in json)) {
    throw new Error("proctoring_failed");
  }
  return json.data;
}

function counterDeltaFor(code: ViolationCode): {
  tabSwitches?: number;
  faceNotVisible?: number;
  multipleFaces?: number;
  copyPasteAttempts?: number;
  aiToolDetected?: number;
} {
  switch (code) {
    case "TAB_SWITCH":
      return { tabSwitches: 1 };
    case "FULLSCREEN_EXIT":
    case "SCREEN_SHARE_ENDED":
    case "NOT_MONITOR_SHARE":
      return {};
    case "FACE_NOT_VISIBLE":
      return { faceNotVisible: 1 };
    case "MULTIPLE_FACES":
      return { multipleFaces: 1 };
    case "LOOKING_AWAY":
      return { faceNotVisible: 1 };
    case "COPY_PASTE_ATTEMPT":
      return { copyPasteAttempts: 1 };
    case "AI_TYPING_PATTERN":
      return { aiToolDetected: 1 };
    default:
      return {};
  }
}

export function useProctoring(opts: UseProctoringOptions) {
  const sessionIdRef = useRef<string | null>(null);
  const warningCountRef = useRef(0);
  const lastViolationKindRef = useRef<string>("suspicious_activity");
  const lookAwayRef = useRef(0);
  const noFaceRef = useRef(0);
  const typingBufRef = useRef("");
  const typingStartRef = useRef<number | null>(null);
  const visionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasFsRef = useRef(false);
  const monitorWarnedRef = useRef(false);

  const [proctorSessionId, setProctorSessionId] = useState<string | null>(null);
  const [warningCount, setWarningCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isFlagged, setIsFlagged] = useState(false);
  const [suspension, setSuspension] = useState<ProctoringSuspensionInfo | null>(null);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [screenTrackLive, setScreenTrackLive] = useState(false);
  const [cameraPreviewLive, setCameraPreviewLive] = useState(false);

  const pushServer = useCallback(async (patch: Record<string, unknown>) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    const data = await postProctoring({
      action: "patch",
      sessionId: sid,
      ...patch,
    });
    warningCountRef.current = data.warningCount;
    setWarningCount(data.warningCount);
  }, []);

  const finalizeFlag = useCallback(async () => {
    if (isFlagged) return;
    setIsFlagged(true);
    setWarningMessage(null);
    const flags = {
      reason: "max_warnings",
      warnings: warningCountRef.current,
      lastViolation: lastViolationKindRef.current,
    };
    try {
      const body = {
        flagReason: `Proctoring: ${warningCountRef.current} of ${PROCTORING_MAX_WARNINGS} warnings`,
        proctoringFlags: flags,
        warningCount: warningCountRef.current,
        violationKind: lastViolationKindRef.current,
      };
      let cooldownUntil: string | undefined;
      if (opts.assessmentId) {
        const res = await fetch("/api/assessment/flag", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentId: opts.assessmentId, ...body }),
        });
        const json = (await res.json()) as FlagApiOk | { success: false };
        if (res.ok && json.success && "data" in json) {
          cooldownUntil = json.data.cooldownUntil;
          setSuspension({
            cooldownUntil: json.data.cooldownUntil,
            talentPoolAdded: json.data.talentPoolAdded,
          });
        }
      } else if (opts.interviewId) {
        const res = await fetch("/api/interview/flag", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewId: opts.interviewId, ...body }),
        });
        const json = (await res.json()) as FlagApiOk | { success: false };
        if (res.ok && json.success && "data" in json) {
          cooldownUntil = json.data.cooldownUntil;
          setSuspension({
            cooldownUntil: json.data.cooldownUntil,
            talentPoolAdded: json.data.talentPoolAdded,
          });
        }
      }
      if (cooldownUntil) {
        opts.onSuspended?.({ cooldownUntil });
      }
    } catch {
      /* still stop UI */
    }
    await pushServer({ isFlagged: true, severity: "HIGH", warningCount: warningCountRef.current }).catch(
      () => {},
    );
    opts.onFlagged?.();
  }, [isFlagged, opts, pushServer]);

  const registerViolation = useCallback(
    async (code: ViolationCode, label: string) => {
      if (!opts.enabled || isFlagged) return;
      lastViolationKindRef.current = label;
      const next = warningCountRef.current + 1;
      warningCountRef.current = next;
      setWarningCount(next);
      setWarningMessage(label);

      const delta = counterDeltaFor(code);
      try {
        await pushServer({
          ...delta,
          warningCount: next,
        });
      } catch {
        /* ignore */
      }

      if (next >= PROCTORING_MAX_WARNINGS) {
        await finalizeFlag();
      }
    },
    [finalizeFlag, isFlagged, opts.enabled, pushServer],
  );

  const startSession = useCallback(async () => {
    if (!opts.assessmentId && !opts.interviewId) return;
    const data = await postProctoring({
      action: "start",
      assessmentId: opts.assessmentId,
      interviewId: opts.interviewId,
    });
    sessionIdRef.current = data.sessionId;
    setProctorSessionId(data.sessionId);
    warningCountRef.current = data.warningCount;
    setWarningCount(data.warningCount);
  }, [opts.assessmentId, opts.interviewId]);

  const stopSession = useCallback(() => {
    if (visionTimerRef.current) {
      clearInterval(visionTimerRef.current);
      visionTimerRef.current = null;
    }
    sessionIdRef.current = null;
    setProctorSessionId(null);
  }, []);

  useEffect(() => {
    if (!opts.enabled) return;
    const onFs = () => {
      const on = Boolean(document.fullscreenElement);
      setFullscreenActive(on);
      if (on) {
        wasFsRef.current = true;
      } else if (wasFsRef.current) {
        void registerViolation("FULLSCREEN_EXIT", "fullscreen_exit");
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [opts.enabled, registerViolation]);

  useEffect(() => {
    if (!opts.enabled) return;
    const onVis = () => {
      if (document.hidden) {
        void registerViolation("TAB_SWITCH", "tab_switch");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [opts.enabled, registerViolation]);

  useEffect(() => {
    if (!opts.enabled) return;
    const block = (e: Event) => {
      e.preventDefault();
      void registerViolation("COPY_PASTE_ATTEMPT", "copy_paste");
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        void registerViolation("COPY_PASTE_ATTEMPT", "copy_paste");
      }
    };
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    document.addEventListener("cut", block);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("keydown", onKey);
    };
  }, [opts.enabled, registerViolation]);

  useEffect(() => {
    if (!opts.enabled) {
      setScreenTrackLive(false);
      monitorWarnedRef.current = false;
      return;
    }
    const track = opts.displayStream?.getVideoTracks()[0];
    if (!track) {
      setScreenTrackLive(false);
      return;
    }
    setScreenTrackLive(track.readyState === "live");
    const settings = track.getSettings() as { displaySurface?: string };
    if (!monitorWarnedRef.current && settings.displaySurface && settings.displaySurface !== "monitor") {
      monitorWarnedRef.current = true;
      void registerViolation("NOT_MONITOR_SHARE", "not_monitor");
    }
    const onEnded = () => {
      setScreenTrackLive(false);
      void registerViolation("SCREEN_SHARE_ENDED", "screen_share");
    };
    track.addEventListener("ended", onEnded);
    return () => track.removeEventListener("ended", onEnded);
  }, [opts.displayStream, opts.enabled, registerViolation]);

  useEffect(() => {
    if (!opts.enabled) {
      setCameraPreviewLive(false);
      return;
    }
    const track = opts.cameraStream?.getVideoTracks()[0];
    setCameraPreviewLive(Boolean(track && track.readyState === "live"));
  }, [opts.cameraStream, opts.enabled]);

  useEffect(() => {
    if (!opts.enabled || isFlagged) return;
    setFullscreenActive(Boolean(document.fullscreenElement));
  }, [isFlagged, opts.enabled]);

  useEffect(() => {
    if (!opts.enabled || !proctorSessionId || isFlagged) {
      if (visionTimerRef.current) {
        clearInterval(visionTimerRef.current);
        visionTimerRef.current = null;
      }
      return;
    }
    const stream = opts.cameraStream;
    const track = stream?.getVideoTracks()[0];
    if (!track || track.readyState !== "live") return;

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    void video.play().catch(() => {});

    const tick = async () => {
      if (!sessionIdRef.current || isFlagged) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w < 16 || h < 16) return;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(640, w);
      canvas.height = Math.min(480, h);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.55);
      const base64 = dataUrl.split(",")[1];
      if (!base64) return;
      try {
        const res = await fetch("/api/assessment/proctoring/vision", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            imageBase64: base64,
            mediaType: "image/jpeg",
          }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: {
            faceVisible: boolean;
            multipleFaces: boolean;
            lookingAway: boolean;
            suspiciousActivity: boolean;
          };
        };
        if (!res.ok || !json.success || !json.data) return;
        const { faceVisible, multipleFaces, lookingAway } = json.data;
        if (multipleFaces) {
          void registerViolation("MULTIPLE_FACES", "multiple_faces");
          lookAwayRef.current = 0;
          noFaceRef.current = 0;
          return;
        }
        if (!faceVisible) {
          noFaceRef.current += 1;
          if (noFaceRef.current >= 2) {
            void registerViolation("FACE_NOT_VISIBLE", "face_not_visible");
            noFaceRef.current = 0;
          }
        } else {
          noFaceRef.current = 0;
        }
        if (lookingAway) {
          lookAwayRef.current += 1;
          if (lookAwayRef.current >= 3) {
            void registerViolation("LOOKING_AWAY", "looking_away");
            lookAwayRef.current = 0;
          }
        } else {
          lookAwayRef.current = 0;
        }
        if (json.data.suspiciousActivity) {
          void registerViolation("AI_TYPING_PATTERN", "suspicious_activity");
        }
      } catch {
        /* ignore */
      }
    };

    visionTimerRef.current = setInterval(() => {
      void tick();
    }, 30_000);
    void tick();

    return () => {
      if (visionTimerRef.current) {
        clearInterval(visionTimerRef.current);
        visionTimerRef.current = null;
      }
      video.srcObject = null;
    };
  }, [cameraPreviewLive, isFlagged, opts.cameraStream, opts.enabled, proctorSessionId, registerViolation]);

  const onAnswerInput = useCallback(
    (chunk: string) => {
      if (!opts.enabled || isFlagged) return;
      const now = Date.now();
      if (!typingStartRef.current) typingStartRef.current = now;
      typingBufRef.current += chunk;
      const start = typingStartRef.current;
      if (now - start > 400) {
        const elapsedMin = (now - start) / 60_000;
        const cpm = elapsedMin > 0 ? typingBufRef.current.length / elapsedMin : 0;
        if (cpm > 1200) {
          void registerViolation("AI_TYPING_PATTERN", "ai_typing");
        }
        typingBufRef.current = "";
        typingStartRef.current = now;
      }
    },
    [isFlagged, opts.enabled, registerViolation],
  );

  const warningsRemaining = Math.max(0, PROCTORING_MAX_WARNINGS - warningCount);

  return {
    startSession,
    stopSession,
    warningCount,
    warningsRemaining,
    maxWarnings: PROCTORING_MAX_WARNINGS,
    warningMessage,
    isFlagged,
    suspension,
    fullscreenActive,
    screenTrackLive,
    cameraPreviewLive,
    onAnswerInput,
    registerViolation,
  };
}
