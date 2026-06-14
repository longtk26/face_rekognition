import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { FaceCaptureCamera } from "~/components/face-capture-camera";
import { FaceMonitorCamera } from "~/components/face-monitor-camera";

export function meta() {
  return [{ title: "Exam — Face Monitor" }];
}

const FRAUD_WARN_AT = 1;
const FRAUD_TERMINATE_AT = 2;

const QUESTIONS = [
  {
    id: 1,
    text: "Which data structure follows Last In, First Out (LIFO) ordering?",
    options: ["Queue", "Stack", "Linked List", "Binary Tree"],
    correct: 1,
  },
  {
    id: 2,
    text: "What is the worst-case time complexity of binary search?",
    options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"],
    correct: 2,
  },
  {
    id: 3,
    text: "Which HTTP method is conventionally used to create a new resource?",
    options: ["GET", "PUT", "POST", "DELETE"],
    correct: 2,
  },
  {
    id: 4,
    text: "In object-oriented programming, encapsulation means:",
    options: [
      "Inheriting properties from a parent class",
      "Bundling data and the methods that operate on it within one unit",
      "Taking multiple forms depending on context",
      "Hiding all implementation details behind a public interface",
    ],
    correct: 1,
  },
  {
    id: 5,
    text: "What does SQL stand for?",
    options: [
      "Standard Query Language",
      "Sequential Query Language",
      "Structured Query Language",
      "Simple Query Language",
    ],
    correct: 2,
  },
];

type Phase =
  | "identity-check"
  | "in-progress"
  | "completed"
  | "fraud-terminated";

interface User {
  id: string;
  name: string;
}

type IdentityStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "matched"; name: string }
  | { type: "no_match"; name: string }
  | { type: "error"; message: string };

export default function Exam() {
  const [phase, setPhase] = useState<Phase>("identity-check");

  // Identity check state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus>({ type: "idle" });
  const captureIdRef = useRef(0);

  // Exam state
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [fraudWarning, setFraudWarning] = useState(false);
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const [monitorStats, setMonitorStats] = useState({ totalChecks: 0, fraudCount: 0 });
  const fraudCountRef = useRef(0);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: User[]) => setUsers(data))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, []);

  const resetIdentity = useCallback(() => {
    captureIdRef.current++;
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCameraError(null);
    setIdentityStatus({ type: "idle" });
  }, [capturedUrl]);

  const handleIdentityCapture = useCallback(async (blob: Blob) => {
    if (!selectedUser) return;
    const id = ++captureIdRef.current;
    setCapturedUrl(URL.createObjectURL(blob));
    setIdentityStatus({ type: "loading" });

    const formData = new FormData();
    formData.append("user_id", selectedUser.id);
    formData.append("image", blob, "capture.jpg");

    try {
      const res = await fetch("/api/face/verify", { method: "POST", body: formData });
      const data = await res.json();
      if (id !== captureIdRef.current) return;
      if (!res.ok) {
        setIdentityStatus({ type: "error", message: data?.detail ?? "Verification failed" });
        return;
      }
      if (data.matched) {
        setIdentityStatus({ type: "matched", name: data.name });
      } else {
        setIdentityStatus({ type: "no_match", name: data.name });
      }
    } catch {
      if (id !== captureIdRef.current) return;
      setIdentityStatus({ type: "error", message: "Network error. Is the backend running?" });
    }
  }, [selectedUser]);

  const startExam = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    fraudCountRef.current = 0;
    setAnswers({});
    setFraudWarning(false);
    setMonitorStats({ totalChecks: 0, fraudCount: 0 });
    setPhase("in-progress");
  }, [capturedUrl]);

  const handleCheckResult = useCallback((matched: boolean, totalChecks: number, fraudCount: number) => {
    setMonitorStats({ totalChecks, fraudCount });
    fraudCountRef.current = fraudCount;

    if (!matched) {
      if (fraudCount >= FRAUD_TERMINATE_AT) {
        setPhase("fraud-terminated");
      } else if (fraudCount >= FRAUD_WARN_AT) {
        setFraudWarning(true);
      }
    }
  }, []);

  const submitExam = useCallback(() => {
    setPhase("completed");
  }, []);

  const score = QUESTIONS.filter((q) => answers[q.id] === q.correct).length;
  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined);

  // ── Phase 1: Identity Check ──────────────────────────────────────────────
  if (phase === "identity-check") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Before You Begin</h1>
              <p className="text-sm text-gray-500 mt-0.5">Identity verification required</p>
            </div>
            <Link to="/" className="text-sm text-blue-600 hover:underline">← Home</Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              Your face will be verified before the exam starts and continuously monitored throughout to ensure exam integrity.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Who are you?</label>
              {usersLoading ? (
                <p className="text-sm text-gray-400">Loading users…</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No registered users yet.{" "}
                  <Link to="/face/register" className="text-blue-600 hover:underline">Register first →</Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        captureIdRef.current++;
                        if (capturedUrl) URL.revokeObjectURL(capturedUrl);
                        setCapturedUrl(null);
                        setCameraError(null);
                        setIdentityStatus({ type: "idle" });
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

            {selectedUser && (
              <>
                {cameraError ? (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                    {cameraError}
                  </div>
                ) : capturedUrl ? (
                  <>
                    <img src={capturedUrl} alt="Captured" className="w-full rounded-lg object-cover aspect-[4/3]" />
                    {identityStatus.type === "loading" && (
                      <p className="text-center text-sm text-gray-500 animate-pulse">Verifying identity…</p>
                    )}
                  </>
                ) : (
                  <FaceCaptureCamera onCapture={handleIdentityCapture} onError={setCameraError} />
                )}

                {(identityStatus.type === "no_match" || identityStatus.type === "error") && (
                  <button onClick={resetIdentity} className="w-full rounded-lg border border-gray-300 text-gray-700 py-2 text-sm font-medium hover:bg-gray-50">
                    Try again
                  </button>
                )}
              </>
            )}

            {identityStatus.type === "matched" && (
              <div className="space-y-3">
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800">
                  <div className="text-base font-bold">✓ Identity verified</div>
                  <div className="text-sm mt-0.5">Welcome, <strong>{identityStatus.name}</strong>!</div>
                </div>
                <button
                  onClick={startExam}
                  className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-sm font-semibold hover:bg-blue-500 transition-colors"
                >
                  Start Exam →
                </button>
              </div>
            )}

            {identityStatus.type === "no_match" && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800">
                <div className="font-bold">✗ Identity mismatch</div>
                <div className="text-sm mt-0.5">Face does not match <strong>{identityStatus.name}</strong>. Please try again.</div>
              </div>
            )}

            {identityStatus.type === "error" && (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
                ⚠ {identityStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Phase 2: Exam In Progress ────────────────────────────────────────────
  if (phase === "in-progress") {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Computer Science Fundamentals</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Candidate: <strong>{selectedUser?.name}</strong> · {QUESTIONS.length} questions
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-gray-400 mb-1">Face Monitor</p>
              {monitorError ? (
                <div className="w-48 aspect-[4/3] rounded-lg bg-red-50 border border-red-200 flex items-center justify-center p-2">
                  <p className="text-xs text-red-600 text-center">{monitorError}</p>
                </div>
              ) : (
                <FaceMonitorCamera
                  userId={selectedUser!.id}
                  onCheckResult={handleCheckResult}
                  onError={setMonitorError}
                />
              )}
            </div>
          </div>

          {/* Fraud warning banner */}
          {fraudWarning && (
            <div className="mb-5 rounded-lg bg-yellow-50 border border-yellow-300 px-4 py-3 flex items-start justify-between gap-3">
              <div className="text-sm text-yellow-800">
                <span className="font-bold">⚠ Suspicious activity detected.</span>{" "}
                This incident has been recorded. Further violations will terminate the exam.
              </div>
              <button
                onClick={() => setFraudWarning(false)}
                className="shrink-0 text-yellow-600 hover:text-yellow-800 text-lg leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Questions */}
          <div className="space-y-5">
            {QUESTIONS.map((q, qi) => (
              <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-xs font-medium text-gray-400 mb-2">Question {qi + 1} of {QUESTIONS.length}</p>
                <p className="text-gray-900 font-medium mb-4">{q.text}</p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        answers[q.id] === oi
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q${q.id}`}
                        value={oi}
                        checked={answers[q.id] === oi}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-gray-800">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Progress + Submit */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{Object.keys(answers).length} of {QUESTIONS.length} answered</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${(Object.keys(answers).length / QUESTIONS.length) * 100}%` }}
                />
              </div>
            </div>
            <button
              onClick={submitExam}
              disabled={!allAnswered}
              className="shrink-0 rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Submit Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase 3 & 4: Results / Fraud Terminated ──────────────────────────────
  const isFraudTerminated = phase === "fraud-terminated";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-lg">
        {/* Result header */}
        {isFraudTerminated ? (
          <div className="rounded-xl bg-red-50 border border-red-300 p-6 mb-5 text-center">
            <div className="text-4xl mb-2">🚨</div>
            <h1 className="text-2xl font-bold text-red-800">Exam Terminated</h1>
            <p className="text-sm text-red-700 mt-1">
              Fraud detected {monitorStats.fraudCount} time{monitorStats.fraudCount !== 1 ? "s" : ""}.
              The exam has been stopped and this incident has been logged.
            </p>
          </div>
        ) : (
          <div
            className={`rounded-xl p-6 mb-5 text-center border ${
              score >= 4
                ? "bg-green-50 border-green-300"
                : score >= 2
                ? "bg-blue-50 border-blue-300"
                : "bg-yellow-50 border-yellow-300"
            }`}
          >
            <div className="text-5xl font-black mb-1 text-gray-900">
              {score}/{QUESTIONS.length}
            </div>
            <p className={`text-sm font-medium ${score >= 4 ? "text-green-700" : score >= 2 ? "text-blue-700" : "text-yellow-700"}`}>
              {score >= 4 ? "Excellent work!" : score >= 2 ? "Good effort!" : "Keep practicing!"}
            </p>
          </div>
        )}

        {/* Answer review */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Answer Review</h2>
          <div className="space-y-3">
            {QUESTIONS.map((q, qi) => {
              const chosen = answers[q.id];
              const correct = chosen === q.correct;
              const skipped = chosen === undefined;
              return (
                <div key={q.id} className={`rounded-lg border px-4 py-3 text-sm ${
                  skipped ? "border-gray-200 bg-gray-50" : correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}>
                  <p className="font-medium text-gray-800 mb-1">
                    {qi + 1}. {q.text}
                  </p>
                  {skipped ? (
                    <p className="text-gray-500 text-xs">Not answered</p>
                  ) : (
                    <div className="text-xs space-y-0.5">
                      <p className={correct ? "text-green-700" : "text-red-700"}>
                        Your answer: {q.options[chosen]} {correct ? "✓" : "✗"}
                      </p>
                      {!correct && (
                        <p className="text-gray-600">Correct: {q.options[q.correct]}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Monitoring summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Monitoring Summary</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 text-gray-500">Candidate</td>
                <td className="py-2 font-medium text-gray-900 text-right">{selectedUser?.name}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Total face checks</td>
                <td className="py-2 font-medium text-gray-900 text-right">{monitorStats.totalChecks}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Fraud detections</td>
                <td className={`py-2 font-medium text-right ${monitorStats.fraudCount > 0 ? "text-red-600" : "text-green-600"}`}>
                  {monitorStats.fraudCount}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Exam status</td>
                <td className={`py-2 font-semibold text-right ${isFraudTerminated ? "text-red-600" : "text-green-600"}`}>
                  {isFraudTerminated ? "Terminated (fraud)" : "Completed"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex gap-3">
          <Link
            to="/"
            className="flex-1 text-center rounded-lg border border-gray-300 text-gray-700 py-2 text-sm font-medium hover:bg-gray-50"
          >
            ← Home
          </Link>
          <button
            onClick={() => {
              setPhase("identity-check");
              setSelectedUser(null);
              setAnswers({});
              setMonitorStats({ totalChecks: 0, fraudCount: 0 });
              setFraudWarning(false);
              setMonitorError(null);
              setIdentityStatus({ type: "idle" });
              setCapturedUrl(null);
              setCameraError(null);
            }}
            className="flex-1 rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold hover:bg-blue-500"
          >
            Retake Exam
          </button>
        </div>
      </div>
    </div>
  );
}
