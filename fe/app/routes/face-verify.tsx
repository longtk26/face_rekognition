import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

export function meta() {
  return [{ title: "Verify Face" }];
}

interface User {
  id: string;
  name: string;
}

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "matched"; name: string }
  | { type: "no_match"; name: string }
  | { type: "error"; message: string };

export default function FaceVerify() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  // Load users
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: User[]) => setUsers(data))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, []);

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

  const verify = useCallback(async () => {
    if (!capturedBlob || !selectedUser) return;
    setStatus({ type: "loading" });

    const formData = new FormData();
    formData.append("user_id", selectedUser.id);
    formData.append("image", capturedBlob, "capture.jpg");

    try {
      const res = await fetch("/api/face/verify", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", message: data?.detail ?? "Verification failed" });
        return;
      }
      setStatus(
        data.matched
          ? { type: "matched", name: data.name }
          : { type: "no_match", name: data.name }
      );
    } catch {
      setStatus({ type: "error", message: "Network error. Is the backend running?" });
    }
  }, [capturedBlob, selectedUser]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Verify Face</h1>
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← Home
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          {/* User selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who are you?
            </label>
            {usersLoading ? (
              <p className="text-sm text-gray-400">Loading users…</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-gray-500">
                No registered users yet.{" "}
                <Link to="/face/register" className="text-blue-600 hover:underline">
                  Register one first →
                </Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setStatus({ type: "idle" });
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selectedUser?.id === u.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}
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

          {/* Verify button */}
          <button
            onClick={verify}
            disabled={!capturedBlob || !selectedUser || status.type === "loading"}
            className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status.type === "loading" ? "Verifying…" : "Verify"}
          </button>

          {/* Result */}
          {status.type === "matched" && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800">
              <div className="text-lg font-bold">✓ Match!</div>
              <div className="text-sm mt-0.5">Welcome, <strong>{status.name}</strong>!</div>
            </div>
          )}
          {status.type === "no_match" && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800">
              <div className="text-lg font-bold">✗ No match</div>
              <div className="text-sm mt-0.5">Face does not match <strong>{status.name}</strong>.</div>
            </div>
          )}
          {status.type === "error" && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
              ⚠ {status.message}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Need to add a face?{" "}
          <Link to="/face/register" className="text-blue-600 hover:underline">
            Register →
          </Link>
        </p>
      </div>
    </div>
  );
}
