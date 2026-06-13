import { useEffect, useRef } from "react";

const CAPTURE_DELAY = 1500; // ms of continuous valid positioning before auto-capture
const MEDIAPIPE_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

// Oval guide proportions relative to frame dimensions
const OVAL_W = 0.45;
const OVAL_H = 0.70;

// Face width bounds relative to oval horizontal radius
const MIN_FACE = 0.70;
const MAX_FACE = 1.90;

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

interface Props {
  onCapture: (blob: Blob) => void;
  onError?: (message: string) => void;
}

export function FaceCaptureCamera({ onCapture, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const rafRef = useRef<number | null>(null);
  const validSinceRef = useRef<number | null>(null);
  const capturedRef = useRef(false);
  const onCaptureRef = useRef(onCapture);
  const onErrorRef = useRef(onError);

  // Keep callback refs current without restarting the effect
  useEffect(() => { onCaptureRef.current = onCapture; });
  useEffect(() => { onErrorRef.current = onError; });

  useEffect(() => {
    let cancelled = false;

    const drawScene = (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      video: HTMLVideoElement,
      isReady: boolean,
      isValid: boolean,
      progress: number,
    ) => {
      const { width: w, height: h } = canvas;
      const cx = w / 2;
      const cy = h / 2;
      const rx = (w * OVAL_W) / 2;
      const ry = (h * OVAL_H) / 2;

      // Mirror-draw video (selfie mode)
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      // Darken area outside the oval guide
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2, true);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill("evenodd");
      ctx.restore();

      // Oval guide border
      const color = !isReady
        ? "rgba(255,255,255,0.35)"
        : isValid
        ? "#22c55e"
        : "#ef4444";
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      if (isReady) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
      }
      ctx.stroke();
      ctx.restore();

      // Countdown progress ring (slightly outside the oval)
      if (isValid && progress > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(
          cx, cy, rx + 12, ry + 12, 0,
          -Math.PI / 2,
          -Math.PI / 2 + 2 * Math.PI * progress,
        );
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();
      }

      // Hint text pill at the bottom
      const text = !isReady
        ? "Loading face detection…"
        : isValid
        ? "Hold still…"
        : "Align your face in the oval";
      ctx.save();
      ctx.font = "600 13px system-ui, -apple-system, sans-serif";
      const tw = ctx.measureText(text).width + 24;
      const th = 30;
      const ty = h - 20;
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2, ty - th / 2, tw, th, 15);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fill();
      ctx.fillStyle = !isReady
        ? "rgba(255,255,255,0.75)"
        : isValid
        ? "#86efac"
        : "#fca5a5";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, cx, ty);
      ctx.restore();
    };

    const captureImage = () => {
      const video = videoRef.current;
      if (!video) return;
      // Capture at native resolution without mirroring for accurate recognition
      const cap = document.createElement("canvas");
      cap.width = video.videoWidth;
      cap.height = video.videoHeight;
      cap.getContext("2d")!.drawImage(video, 0, 0);
      cap.toBlob(
        (blob) => { if (blob) onCaptureRef.current(blob); },
        "image/jpeg",
        0.92,
      );
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };

    const detect = (timestamp: number) => {
      if (cancelled || capturedRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // Keep canvas sized to the actual video dimensions
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const detector = detectorRef.current;
      let isValid = false;
      let progress = 0;

      if (detector) {
        const results = detector.detectForVideo(video, timestamp);
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const rx = (w * OVAL_W) / 2;
        const ry = (h * OVAL_H) / 2;

        if (results.detections.length === 1) {
          const bb = results.detections[0].boundingBox;
          if (bb) {
            // Face center in unmirrored video space; oval is symmetric so mirroring
            // only flips the sign of normX, which doesn't affect normX^2 + normY^2
            const fcx = bb.originX + bb.width / 2;
            const fcy = bb.originY + bb.height / 2;
            const nx = (fcx - cx) / rx;
            const ny = (fcy - cy) / ry;
            const inOval = nx * nx + ny * ny <= 1;
            const goodSize = bb.width >= rx * MIN_FACE && bb.width <= rx * MAX_FACE;
            isValid = inOval && goodSize;
          }
        }

        if (isValid) {
          if (!validSinceRef.current) validSinceRef.current = timestamp;
          const elapsed = timestamp - validSinceRef.current;
          progress = Math.min(elapsed / CAPTURE_DELAY, 1);
          if (elapsed >= CAPTURE_DELAY && !capturedRef.current) {
            capturedRef.current = true;
            drawScene(ctx, canvas, video, true, true, 1);
            captureImage();
            return;
          }
        } else {
          validSinceRef.current = null;
        }
      }

      drawScene(ctx, canvas, video, !!detector, isValid, progress);
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
          await new Promise<void>((resolve) => {
            video.onloadedmetadata = () => resolve();
          });
          await video.play();
        }

        // Start the render loop immediately so the user sees the video
        // while MediaPipe loads in the background
        rafRef.current = requestAnimationFrame(detect);

        const { FaceDetector, FilesetResolver } = await import(
          "@mediapipe/tasks-vision"
        );
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
          onErrorRef.current?.(
            err instanceof Error ? err.message : "Camera initialization failed",
          );
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
    <div className="relative w-full rounded-lg overflow-hidden bg-black aspect-[4/3]">
      {/* Hidden video — source for the canvas and MediaPipe detection */}
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />
      {/* Canvas renders video + oval guide overlay */}
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
