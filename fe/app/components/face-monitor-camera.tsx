import { useEffect, useRef } from "react";

const CHECK_INTERVAL = 10_000;
const RESULT_DISPLAY = 4_000;
const MEDIAPIPE_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

const MIN_FACE_WIDTH_RATIO = 0.08;

interface BoundingBox {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

interface Detection {
  boundingBox: BoundingBox | null;
}

interface FaceDetector {
  detectForVideo(video: HTMLVideoElement, timestamp: number): { detections: Detection[] };
  close(): void;
}

type DrawState = "init" | "monitoring" | "checking" | "ok" | "fraud";

interface Props {
  userId: string;
  checkIntervalMs?: number;
  onCheckResult: (matched: boolean, totalChecks: number, fraudCount: number) => void;
  onError?: (message: string) => void;
}

export function FaceMonitorCamera({ userId, checkIntervalMs = CHECK_INTERVAL, onCheckResult, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const rafRef = useRef<number | null>(null);
  const isCheckingRef = useRef(false);
  const lastCheckTimeRef = useRef<number | null>(null);
  const checkResultRef = useRef<boolean | null>(null);
  const checkResultUntilRef = useRef<number>(0);
  const totalChecksRef = useRef(0);
  const fraudCountRef = useRef(0);
  const onCheckResultRef = useRef(onCheckResult);
  const onErrorRef = useRef(onError);
  const userIdRef = useRef(userId);
  const checkIntervalRef = useRef(checkIntervalMs);

  useEffect(() => { onCheckResultRef.current = onCheckResult; });
  useEffect(() => { onErrorRef.current = onError; });
  useEffect(() => { userIdRef.current = userId; });
  useEffect(() => { checkIntervalRef.current = checkIntervalMs; });

  useEffect(() => {
    let cancelled = false;

    const getDrawState = (timestamp: number): DrawState => {
      if (!detectorRef.current) return "init";
      if (isCheckingRef.current) return "checking";
      if (checkResultRef.current !== null && timestamp < checkResultUntilRef.current) {
        return checkResultRef.current ? "ok" : "fraud";
      }
      return "monitoring";
    };

    const drawScene = (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      video: HTMLVideoElement,
      state: DrawState,
    ) => {
      const { width: w, height: h } = canvas;

      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      const stateColors: Record<DrawState, string> = {
        init: "rgba(255,255,255,0.35)",
        monitoring: "#3b82f6",
        checking: "#f59e0b",
        ok: "#22c55e",
        fraud: "#ef4444",
      };
      const color = stateColors[state];

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.strokeRect(3, 3, w - 6, h - 6);
      ctx.restore();

      const stateLabels: Record<DrawState, string> = {
        init: "Initializing…",
        monitoring: "Monitoring",
        checking: "Checking…",
        ok: "✓ Verified",
        fraud: "⚠ Fraud!",
      };
      const text = stateLabels[state];

      ctx.save();
      ctx.font = "600 11px system-ui, -apple-system, sans-serif";
      const tw = ctx.measureText(text).width + 16;
      const th = 22;
      const ty = h - 14;
      ctx.beginPath();
      ctx.roundRect(w / 2 - tw / 2, ty - th / 2, tw, th, 11);
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fill();
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, w / 2, ty);
      ctx.restore();

      const total = totalChecksRef.current;
      if (total > 0) {
        const fraud = fraudCountRef.current;
        const statsText = fraud > 0 ? `${fraud}/${total} ⚠` : `${total} ✓`;
        ctx.save();
        ctx.font = "600 10px system-ui, -apple-system, sans-serif";
        const sw = ctx.measureText(statsText).width + 12;
        const sh = 18;
        ctx.beginPath();
        ctx.roundRect(w - sw - 6, 6, sw, sh, 9);
        ctx.fillStyle = fraud > 0 ? "rgba(239,68,68,0.9)" : "rgba(34,197,94,0.9)";
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(statsText, w - sw / 2 - 6, 6 + sh / 2);
        ctx.restore();
      }
    };

    const performVerification = (video: HTMLVideoElement) => {
      const cap = document.createElement("canvas");
      cap.width = video.videoWidth;
      cap.height = video.videoHeight;
      cap.getContext("2d")!.drawImage(video, 0, 0);
      cap.toBlob(async (blob) => {
        if (!blob || cancelled) {
          isCheckingRef.current = false;
          return;
        }
        const formData = new FormData();
        formData.append("user_id", userIdRef.current);
        formData.append("image", blob, "monitor.jpg");
        try {
          const res = await fetch("/api/face/verify", { method: "POST", body: formData });
          if (cancelled) return;
          const data = await res.json();
          const matched = res.ok && Boolean(data.matched);
          totalChecksRef.current++;
          if (!matched) fraudCountRef.current++;
          checkResultRef.current = matched;
          checkResultUntilRef.current = performance.now() + RESULT_DISPLAY;
          onCheckResultRef.current(matched, totalChecksRef.current, fraudCountRef.current);
        } catch {
          if (!cancelled) checkResultRef.current = null;
        } finally {
          if (!cancelled) isCheckingRef.current = false;
        }
      }, "image/jpeg", 0.85);
    };

    const detect = (timestamp: number) => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const detector = detectorRef.current;

      if (detector) {
        const results = detector.detectForVideo(video, timestamp);
        let facePresent = false;
        if (results.detections.length === 1) {
          const bb = results.detections[0].boundingBox;
          if (bb && bb.width >= canvas.width * MIN_FACE_WIDTH_RATIO) {
            facePresent = true;
          }
        }

        if (
          facePresent &&
          !isCheckingRef.current &&
          (lastCheckTimeRef.current === null ||
            timestamp - lastCheckTimeRef.current >= checkIntervalRef.current)
        ) {
          isCheckingRef.current = true;
          lastCheckTimeRef.current = timestamp;
          performVerification(video);
        }
      }

      drawScene(ctx, canvas, video, getDrawState(timestamp));
      rafRef.current = requestAnimationFrame(detect);
    };

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await new Promise<void>((resolve) => { video.onloadedmetadata = () => resolve(); });
          await video.play();
        }
        rafRef.current = requestAnimationFrame(detect);

        const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
        if (cancelled) return;
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
        if (cancelled) return;
        const faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
          minSuppressionThreshold: 0.3,
        });
        if (cancelled) { faceDetector.close(); return; }
        detectorRef.current = faceDetector as unknown as FaceDetector;
      } catch (err) {
        if (!cancelled) {
          onErrorRef.current?.(err instanceof Error ? err.message : "Camera initialization failed");
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      detectorRef.current?.close();
      detectorRef.current = null;
    };
  }, []);

  return (
    <div className="relative rounded-lg overflow-hidden bg-black w-48 aspect-[4/3] shadow-lg">
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
