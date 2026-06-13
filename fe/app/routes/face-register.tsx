import { useCallback, useState } from "react";
import { Link } from "react-router";
import { FaceCaptureCamera } from "~/components/face-capture-camera";

export function meta() {
  return [{ title: "Register Face" }];
}

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; name: string; id: string }
  | { type: "error"; message: string };

export default function FaceRegister() {
  const [name, setName] = useState("");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  const handleCapture = useCallback((blob: Blob) => {
    setCapturedBlob(blob);
    setCapturedUrl(URL.createObjectURL(blob));
  }, []);

  const retake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setCameraError(null);
    setStatus({ type: "idle" });
  }, [capturedUrl]);

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
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedBlob(null);
      setCapturedUrl(null);
    } catch {
      setStatus({ type: "error", message: "Network error. Is the backend running?" });
    }
  }, [capturedBlob, capturedUrl, name]);

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
          {/* Camera / Preview */}
          {cameraError ? (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {cameraError}
            </div>
          ) : capturedUrl ? (
            <>
              <img
                src={capturedUrl}
                alt="Captured"
                className="w-full rounded-lg object-cover aspect-[4/3]"
              />
              <button
                onClick={retake}
                className="w-full rounded-lg border border-gray-300 text-gray-700 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Retake
              </button>
            </>
          ) : (
            <FaceCaptureCamera onCapture={handleCapture} onError={setCameraError} />
          )}

          {/* Name + submit — shown only after capture */}
          {capturedUrl && (
            <>
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

              <button
                onClick={register}
                disabled={!name.trim() || status.type === "loading"}
                className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status.type === "loading" ? "Registering…" : "Register Face"}
              </button>
            </>
          )}

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
