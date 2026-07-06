export type CompositeRecordingHandle = {
  stream: MediaStream;
  stop: () => void;
};

/** Screen share (main) + webcam picture-in-picture + microphone for full session video. */
export function startCompositeInterviewRecording(
  display: MediaStream,
  camera: MediaStream,
  mic: MediaStream,
): CompositeRecordingHandle {
  const screenVideo = document.createElement("video");
  screenVideo.srcObject = display;
  screenVideo.muted = true;
  screenVideo.playsInline = true;
  void screenVideo.play().catch(() => {});

  const camVideo = document.createElement("video");
  camVideo.srcObject = camera;
  camVideo.muted = true;
  camVideo.playsInline = true;
  void camVideo.play().catch(() => {});

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fps = 15;

  const draw = () => {
    if (!ctx) return;
    const sw = screenVideo.videoWidth || 1280;
    const sh = screenVideo.videoHeight || 720;
    if (canvas.width !== sw || canvas.height !== sh) {
      canvas.width = sw;
      canvas.height = sh;
    }

    ctx.fillStyle = "#0D2137";
    ctx.fillRect(0, 0, sw, sh);

    if (screenVideo.readyState >= 2) {
      ctx.drawImage(screenVideo, 0, 0, sw, sh);
    }

    const cw = camVideo.videoWidth;
    const ch = camVideo.videoHeight;
    if (camVideo.readyState >= 2 && cw > 0 && ch > 0) {
      const pipWidth = Math.round(sw * 0.22);
      const pipHeight = Math.round((pipWidth * ch) / cw);
      const pad = 14;
      const x = sw - pipWidth - pad;
      const y = sh - pipHeight - pad;
      ctx.fillStyle = "#000";
      ctx.fillRect(x - 3, y - 3, pipWidth + 6, pipHeight + 6);
      ctx.drawImage(camVideo, x, y, pipWidth, pipHeight);
      ctx.strokeStyle = "#1D9E75";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, pipWidth, pipHeight);
    }
  };

  const interval = window.setInterval(draw, Math.round(1000 / fps));
  draw();

  const canvasStream = canvas.captureStream(fps);
  mic.getAudioTracks().forEach((track) => canvasStream.addTrack(track));

  return {
    stream: canvasStream,
    stop: () => {
      clearInterval(interval);
      screenVideo.srcObject = null;
      camVideo.srcObject = null;
      canvasStream.getTracks().forEach((track) => {
        if (track.kind === "video") track.stop();
      });
    },
  };
}
