"use client";

import { useEffect, useRef, useState } from "react";
import type { FacialSnapshot } from "@/lib/interview/facial-analysis-types";

type UseFacialAnalysisOptions = {
  cameraStream: MediaStream | null;
  isActive: boolean;
  interviewId: string;
  questionNumber: number;
};

export function useFacialAnalysis({
  cameraStream,
  isActive,
  interviewId,
  questionNumber,
}: UseFacialAnalysisOptions) {
  const [expressions, setExpressions] = useState<FacialSnapshot[]>([]);
  const questionRef = useRef(questionNumber);
  const interviewRef = useRef(interviewId);

  useEffect(() => {
    questionRef.current = questionNumber;
  }, [questionNumber]);

  useEffect(() => {
    interviewRef.current = interviewId;
  }, [interviewId]);

  useEffect(() => {
    if (!isActive || !interviewId || !cameraStream) return;

    const track = cameraStream.getVideoTracks()[0];
    if (!track || track.readyState !== "live") return;

    const video = document.createElement("video");
    video.srcObject = cameraStream;
    video.muted = true;
    void video.play().catch(() => {});

    const captureFrame = async () => {
      if (!interviewRef.current) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w < 16 || h < 16) return;

      const canvas = document.createElement("canvas");
      canvas.width = Math.min(640, w);
      canvas.height = Math.min(480, h);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
      if (!imageBase64) return;

      try {
        const res = await fetch("/api/interview/analyze-face", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64,
            interviewId: interviewRef.current,
            timestamp: new Date().toISOString(),
            questionNumber: questionRef.current,
          }),
        });
        const data = (await res.json()) as { snapshot?: FacialSnapshot | null };
        if (data.snapshot) {
          setExpressions((prev) => [...prev, data.snapshot as FacialSnapshot]);
        }
      } catch {
        /* silent fail — never interrupt interview */
      }
    };

    const interval = setInterval(() => {
      void captureFrame();
    }, 10_000);

    return () => {
      clearInterval(interval);
      video.srcObject = null;
    };
  }, [isActive, interviewId, cameraStream]);

  return { expressions };
}
