"use client";

import { useCallback, useRef, useState } from "react";

export type LaraTtsStatus = "idle" | "preparing" | "speaking" | "error";

function cacheKey(locale: string, text: string): string {
  return `${locale}::${text}`;
}

/** Minimal silent WAV — unlocks browser autoplay after a user gesture. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

export function useLaraTts(locale: string) {
  const blobCacheRef = useRef<Map<string, string>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);
  const [status, setStatus] = useState<LaraTtsStatus>("idle");

  const unlockAudio = useCallback(async (): Promise<boolean> => {
    if (unlockedRef.current || typeof window === "undefined") return unlockedRef.current;

    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        if (!audioContextRef.current) audioContextRef.current = new Ctx();
        await audioContextRef.current.resume();
        unlockedRef.current = true;
        return true;
      }
    } catch {
      /* fall through */
    }

    try {
      const probe = new Audio(SILENT_WAV);
      probe.volume = 0.001;
      await probe.play();
      unlockedRef.current = true;
      return true;
    } catch {
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    audioRef.current = null;
    setStatus("idle");
  }, []);

  const speak = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed) return true;

      stop();
      setStatus("preparing");
      await unlockAudio();

      try {
        const key = cacheKey(locale, trimmed);
        let objectUrl = blobCacheRef.current.get(key);

        if (!objectUrl) {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 25_000);
          let res: Response;
          try {
            res = await fetch("/api/interview/text-to-speech", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: trimmed.slice(0, 8000), locale }),
              signal: controller.signal,
            });
          } finally {
            window.clearTimeout(timeout);
          }
          if (!res.ok) {
            setStatus("error");
            return false;
          }
          const blob = await res.blob();
          if (!blob.size) {
            setStatus("error");
            return false;
          }
          objectUrl = URL.createObjectURL(blob);
          blobCacheRef.current.set(key, objectUrl);
        }

        setStatus("speaking");

        return await new Promise<boolean>((resolve) => {
          const audio = new Audio(objectUrl);
          audio.preload = "auto";
          audio.volume = 1;
          audioRef.current = audio;

          let settled = false;
          const finish = (ok: boolean) => {
            if (settled) return;
            settled = true;
            audioRef.current = null;
            setStatus(ok ? "idle" : "error");
            resolve(ok);
          };

          audio.onended = () => finish(true);
          audio.onerror = () => finish(false);

          const tryPlay = () => {
            void audio.play().then(() => {}).catch(() => finish(false));
          };

          if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            tryPlay();
          } else {
            audio.oncanplaythrough = () => tryPlay();
            audio.load();
          }
        });
      } catch {
        setStatus("error");
        return false;
      }
    },
    [locale, stop, unlockAudio],
  );

  return { status, speak, stop, unlockAudio, isUnlocked: () => unlockedRef.current };
}
