import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

export function meta() {
  return [{ title: "Register Face" }];
}

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; name: string; id: string }
  | { type: "error"; message: string };

export default function FaceRegister() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [name, setName] = useState("");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      setCapturedBlob(blob);
      setCapturedUrl(URL.createObjectURL(blob));
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }, "image/jpeg");
  }, []);

  const retake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setStatus({ type: "idle" });
    startCamera();
  }, [capturedUrl, startCamera]);

  const register = useCallback(async () => {
    if (!capturedBlob || !name.trim()) return;
    setStatus({ type: "loading" });

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("image", capturedBlob, "capture.jpg");

    try {
      const res = await fetch("/api/face/register", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", message: data?.detail ?? "Registration failed" });
        return;
      }
      setStatus({ type: "success", name: data.name, id: data.id });
      setName("");
      setCapturedBlob(null);
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedUrl(null);
      startCamera();
    } catch {
      setStatus({ type: "error", message: "Network error. Is the backend running?" });
    }
  }, [capturedBlob, capturedUrl, name, startCamera]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Register Face</h1>
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← Home
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Camera / Preview */}
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            {cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm text-center px-4">
                {cameraError}
              </div>
            ) : capturedUrl ? (
              <img
                src={capturedUrl}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Camera controls */}
          <div className="flex gap-2">
            {!capturedUrl ? (
              <button
                onClick={capture}
                disabled={!!cameraError}
                className="flex-1 rounded-lg bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-40"
              >
                Capture
              </button>
            ) : (
              <button
                onClick={retake}
                className="flex-1 rounded-lg border border-gray-300 text-gray-700 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Retake
              </button>
            )}
          </div>

          {/* Register button */}
          <button
            onClick={register}
            disabled={!capturedBlob || !name.trim() || status.type === "loading"}
            className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status.type === "loading" ? "Registering…" : "Register Face"}
          </button>

          {/* Status */}
          {status.type === "success" && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              ✓ <strong>{status.name}</strong> registered successfully!
              <div className="text-xs text-green-600 mt-0.5">ID: {status.id}</div>
            </div>
          )}
          {status.type === "error" && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              ✗ {status.message}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Want to verify?{" "}
          <Link to="/face/verify" className="text-blue-600 hover:underline">
            Go to verification →
          </Link>
        </p>
      </div>
    </div>
  );
}
