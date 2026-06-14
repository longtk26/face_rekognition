# Exam Monitor Feature — Implementation Plan

## Overview

Add an **exam page** that verifies a student's identity before the exam, then continuously monitors the webcam throughout the session. If a different face is detected, the system flags fraud and eventually terminates the exam.

No backend changes are required — the existing `/api/face/verify` endpoint is reused for both the identity check and the periodic monitoring.

---

## User Flow

```
Home ──► /exam
           │
           ▼
   ┌──────────────────┐
   │ Phase 1          │  Select registered user → one-shot face verify
   │ Identity Check   │  Must match to proceed
   └────────┬─────────┘
            │ verified
            ▼
   ┌──────────────────┐
   │ Phase 2          │  5 sample MCQ questions (CS fundamentals)
   │ Exam In Progress │  FaceMonitorCamera widget (fixed bottom-right)
   │                  │  Checks every 10 s when face is present
   │                  │  ─ 1st mismatch → yellow warning banner
   │                  │  ─ 2nd mismatch → terminate exam immediately
   └────────┬─────────┘
            │ submit or 2nd fraud
            ▼
   ┌──────────────────┐
   │ Phase 3          │  Score (X/5 correct)
   │ Results          │  Monitoring stats (total checks, fraud count)
   │ or Terminated    │  Fraud reason if terminated
   └──────────────────┘
```

---

## Components

### `FaceMonitorCamera` (`fe/app/components/face-monitor-camera.tsx`)

A **passive monitoring widget** — small camera pip that runs in the background without interrupting the exam.

| Aspect | Detail |
|--------|--------|
| Size | `w-48 aspect-[4/3]` (fixed bottom-right overlay) |
| Rendering | All canvas-based — no React state, same rAF loop pattern as `FaceCaptureCamera` |
| Detection | MediaPipe `FaceDetector` (same model + WASM) |
| Check trigger | Face present (≥1 detection, bounding box > 8% canvas width) AND ≥ `checkIntervalMs` since last check |
| Default interval | 10 000 ms |
| API call | `POST /api/face/verify` with `user_id` + JPEG blob |
| Callback | `onCheckResult(matched, totalChecks, fraudCount)` — parent owns fraud logic |
| Canvas states | `init` (white) → `monitoring` (blue) → `checking` (yellow) → `ok` (green) → `fraud` (red) |
| Stats badge | Top-right corner of canvas: "3 ✓" or "1/3 ⚠" |

```
Props:
  userId: string
  checkIntervalMs?: number          (default 10 000)
  onCheckResult(matched, total, frauds): void
  onError?(message): void
```

### Exam Route (`fe/app/routes/exam.tsx`)

| State | Type | Description |
|-------|------|-------------|
| `phase` | `'identity-check' \| 'in-progress' \| 'completed' \| 'fraud-terminated'` | Page phase |
| `selectedUser` | `User \| null` | Chosen from /api/users |
| `answers` | `Record<number, number>` | questionId → optionIndex |
| `monitorStats` | `{ totalChecks, fraudCount }` | Updated from FaceMonitorCamera |
| `fraudWarning` | `boolean` | Visible 1st-fraud banner |

---

## Sample Questions (5 MCQ — CS Fundamentals)

1. Which data structure follows LIFO ordering? → **Stack**
2. Worst-case time complexity of binary search? → **O(log n)**
3. Which HTTP method creates a new resource? → **POST**
4. What is encapsulation in OOP? → **Bundling data and methods within a class**
5. What does SQL stand for? → **Structured Query Language**

---

## Files Changed

| Action | Path |
|--------|------|
| Create | `fe/app/components/face-monitor-camera.tsx` |
| Create | `fe/app/routes/exam.tsx` |
| Edit | `fe/app/routes.ts` — add `route("exam", ...)` |
| Edit | `fe/app/routes/home.tsx` — add Exam card link |

---

## Fraud Thresholds

| Event | Action |
|-------|--------|
| 1st mismatch | Yellow banner: "Suspicious activity detected. This incident has been recorded." |
| 2nd mismatch | Exam immediately transitions to `fraud-terminated` phase |

The thresholds are defined as constants at the top of `exam.tsx` (`FRAUD_WARN_AT = 1`, `FRAUD_TERMINATE_AT = 2`) so they can be tuned easily.
