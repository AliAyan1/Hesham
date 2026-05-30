"use client";

import { useCallback, useRef } from "react";
import {
  getSpeechRecognitionCtor,
  speechRecognitionLang,
  type SpeechRecognitionInstance,
} from "@/lib/interview/speech-recognition";

function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

type UseInterviewAutoAnswerOptions = {
  locale: string;
  micStream: MediaStream | null;
  muted: boolean;
  onTranscriptUpdate: (text: string) => void;
  onFinalize: (text: string) => Promise<void>;
  silenceMs?: number;
};

export function useInterviewAutoAnswer({
  locale,
  micStream,
  muted,
  onTranscriptUpdate,
  onFinalize,
  silenceMs = 2000,
}: UseInterviewAutoAnswerOptions) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizingRef = useRef(false);
  const transcriptRef = useRef("");

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopCapture = useCallback(() => {
    clearSilenceTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {
      /* ignore */
    }
  }, [clearSilenceTimer]);

  const scheduleFinalize = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      void (async () => {
        if (finalizingRef.current) return;
        finalizingRef.current = true;
        stopCapture();

        let text = transcriptRef.current.trim();
        if (!text && chunksRef.current.length > 0 && micStream) {
          const mime = pickRecorderMime();
          const blob = new Blob(chunksRef.current, {
            type: mime ? mime.split(";")[0] : "audio/webm",
          });
          chunksRef.current = [];
          if (blob.size >= 500) {
            const fd = new FormData();
            fd.append("file", blob, "answer.webm");
            fd.append("locale", locale);
            try {
              const res = await fetch("/api/interview/transcribe", {
                method: "POST",
                body: fd,
                credentials: "include",
              });
              const j = (await res.json()) as { success?: boolean; data?: { text: string } };
              if (res.ok && j.success && j.data?.text) {
                text = j.data.text.trim();
              }
            } catch {
              /* ignore */
            }
          }
        }

        await onFinalize(text);
        finalizingRef.current = false;
      })();
    }, silenceMs);
  }, [clearSilenceTimer, locale, micStream, onFinalize, silenceMs, stopCapture]);

  const startCapture = useCallback(() => {
    if (muted || !micStream || finalizingRef.current) return;
    stopCapture();
    finalizingRef.current = false;
    transcriptRef.current = "";
    onTranscriptUpdate("");
    chunksRef.current = [];

    const Ctor = getSpeechRecognitionCtor();
    if (Ctor) {
      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechRecognitionLang(locale);
      recognition.onresult = (event) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i];
          const line = piece[0]?.transcript ?? "";
          if (piece.isFinal) final += line;
          else interim += line;
        }
        const combined = (final || interim).trim();
        if (combined) {
          transcriptRef.current = combined;
          onTranscriptUpdate(combined);
          scheduleFinalize();
        }
      };
      recognition.onerror = () => scheduleFinalize();
      recognition.onend = () => {
        if (!finalizingRef.current) scheduleFinalize();
      };
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
      }
    }

    const track = micStream.getAudioTracks()[0];
    if (track?.readyState === "live") {
      const mime = pickRecorderMime();
      try {
        const rec = mime
          ? new MediaRecorder(micStream, { mimeType: mime })
          : new MediaRecorder(micStream);
        recorderRef.current = rec;
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.start(250);
      } catch {
        recorderRef.current = null;
      }
    }

    if (!Ctor) scheduleFinalize();
  }, [locale, micStream, muted, onTranscriptUpdate, scheduleFinalize, stopCapture]);

  return { startCapture, stopCapture };
}
