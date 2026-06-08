import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";

const MODEL_CDN = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";

// Module-level singleton so models load only once per page
let modelCache = null;

async function loadModels() {
  if (modelCache) return modelCache;
  modelCache = (async () => {
    const faceapi = (await import("face-api.js")).default;
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_CDN),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_CDN),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_CDN),
    ]);
    return faceapi;
  })();
  return modelCache;
}

function euclidean(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Eye Aspect Ratio — 6-point eye landmark array
function ear(pts) {
  return (
    (euclidean(pts[1], pts[5]) + euclidean(pts[2], pts[4])) /
    (2 * euclidean(pts[0], pts[3]) || 0.001)
  );
}

function scoreDetection(det) {
  if (!det) return { score: 0, label: "Away", expression: "absent" };

  const lm = det.landmarks.positions;

  // Eye openness (average EAR across both eyes)
  const leftEAR = ear([lm[36], lm[37], lm[38], lm[39], lm[40], lm[41]]);
  const rightEAR = ear([lm[42], lm[43], lm[44], lm[45], lm[46], lm[47]]);
  const avgEAR = (leftEAR + rightEAR) / 2;

  // Head yaw: nose tip horizontal offset from eye-span center, normalised
  const noseTip = lm[30];
  const eyeCx = (lm[36].x + lm[39].x + lm[42].x + lm[45].x) / 4;
  const eyeSpan = euclidean(lm[36], lm[45]) || 1;
  const yaw = Math.abs(noseTip.x - eyeCx) / eyeSpan;
  const lookingForward = yaw < 0.38;

  // Dominant expression
  const expr = det.expressions;
  const dominant = Object.entries(expr).sort(([, a], [, b]) => b - a)[0][0];
  const focused = ["neutral", "happy"].includes(dominant);

  if (!lookingForward) {
    return { score: Math.round(10 + yaw * 20), label: "Distracted", expression: dominant };
  }

  const drowsy = avgEAR < 0.17;
  const eyePoints = Math.min(35, avgEAR * 120);
  const exprPoints = focused ? 30 : dominant === "surprised" ? 12 : 8;
  const penalty = drowsy ? 28 : 0;
  const raw = Math.round(35 + eyePoints + exprPoints - penalty);
  const score = Math.max(0, Math.min(100, raw));
  const label =
    score >= 80 ? "High Focus" :
    score >= 62 ? "Focused" :
    score >= 44 ? "Moderate" : "Low Focus";

  return { score, label, expression: dominant, lookingForward: true, avgEAR };
}

export default function useFocusMonitor({ enabled, intervalMs = 5000 }) {
  const { cameraTrack } = useLocalParticipant();

  const [status, setStatus] = useState("idle"); // idle | loading | active | no-camera | error
  const [currentLevel, setCurrentLevel] = useState(null); // { score, label, color }

  const samplesRef = useRef([]);
  const videoElRef = useRef(null);
  const timerRef = useRef(null);
  const faceApiRef = useRef(null);
  const activeRef = useRef(false);

  const levelColor = (score) =>
    score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  // ── Video element tied to the LiveKit camera track ─────────────────────────
  const syncVideo = useCallback(() => {
    const mst = cameraTrack?.track?.mediaStreamTrack;
    if (!mst) {
      if (videoElRef.current) {
        videoElRef.current.srcObject = null;
      }
      return null;
    }
    if (!videoElRef.current) {
      const v = document.createElement("video");
      v.autoplay = true;
      v.playsInline = true;
      v.muted = true;
      v.width = 320;
      v.height = 240;
      v.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:320px;height:240px;";
      document.body.appendChild(v);
      videoElRef.current = v;
    }
    const existing = videoElRef.current.srcObject;
    if (!existing || existing.getTracks()[0] !== mst) {
      videoElRef.current.srcObject = new MediaStream([mst]);
    }
    return videoElRef.current;
  }, [cameraTrack]);

  const teardown = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (videoElRef.current) {
      videoElRef.current.srcObject = null;
      videoElRef.current.remove();
      videoElRef.current = null;
    }
  }, []);

  // ── Single frame analysis ──────────────────────────────────────────────────
  const runSample = useCallback(async () => {
    if (!activeRef.current || !faceApiRef.current) return;
    const video = videoElRef.current;
    if (!video || video.readyState < 2) return;

    try {
      const faceapi = faceApiRef.current;
      const det = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
        .withFaceLandmarks(true)
        .withFaceExpressions();

      const result = scoreDetection(det || null);
      const sample = { ...result, facePresent: Boolean(det), ts: Date.now() };
      samplesRef.current = [...samplesRef.current, sample];

      if (activeRef.current) {
        setCurrentLevel({
          score: sample.score,
          label: sample.label,
          color: levelColor(sample.score),
        });
      }
    } catch {
      // swallow — network blip or model error shouldn't stop the session
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start monitoring ───────────────────────────────────────────────────────
  const startMonitoring = useCallback(async () => {
    if (activeRef.current) return;
    setStatus("loading");

    let faceapi;
    try {
      faceapi = await loadModels();
    } catch {
      modelCache = null; // allow retry next time
      setStatus("error");
      return;
    }

    const video = syncVideo();
    if (!video) {
      setStatus("no-camera");
      return;
    }

    faceApiRef.current = faceapi;

    // Wait for video to have valid frames
    if (video.readyState < 2) {
      await new Promise((res) => {
        video.addEventListener("loadeddata", res, { once: true });
        setTimeout(res, 4000); // fallback timeout
      });
    }

    activeRef.current = true;
    setStatus("active");
    timerRef.current = setInterval(runSample, intervalMs);
  }, [syncVideo, runSample, intervalMs]);

  // ── React to enabled / cameraTrack changes ────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      if (activeRef.current) teardown();
      setStatus("idle");
      setCurrentLevel(null);
      return;
    }

    const mst = cameraTrack?.track?.mediaStreamTrack;
    if (!mst) {
      if (activeRef.current) teardown();
      setStatus("no-camera");
      setCurrentLevel(null);
      return;
    }

    if (!activeRef.current) {
      samplesRef.current = [];
      startMonitoring();
    } else {
      // Camera track changed (e.g. device switch) — re-sync the video element
      syncVideo();
    }
  }, [enabled, cameraTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => teardown();
  }, [teardown]);

  // ── Session summary ────────────────────────────────────────────────────────
  const getSessionSummary = useCallback(() => {
    const s = samplesRef.current;
    if (s.length < 6) return null; // < 30 s of data — not worth saving

    const n = s.length;
    const focusScore = Math.round(s.reduce((acc, x) => acc + x.score, 0) / n);

    const presentFwd = s.filter((x) => x.facePresent && x.lookingForward).length;
    const engagementScore = Math.round((presentFwd / n) * 100);

    const offScreenSeconds = Math.round(
      s.filter((x) => !x.facePresent).length * (intervalMs / 1000),
    );

    // Count distraction events: score drops from ≥50 to <30
    let distractionCount = 0;
    for (let i = 1; i < n; i++) {
      if (s[i].score < 30 && s[i - 1].score >= 50) distractionCount++;
    }

    const highFocusPercent = Math.round(s.filter((x) => x.score >= 75).length / n * 100);
    const medFocusPercent = Math.round(s.filter((x) => x.score >= 50 && x.score < 75).length / n * 100);
    const lowFocusPercent = Math.round(s.filter((x) => x.score < 50).length / n * 100);

    return {
      focusScore,
      engagementScore,
      distractionCount,
      offScreenSeconds,
      highFocusPercent,
      medFocusPercent,
      lowFocusPercent,
      totalSamples: n,
      durationMinutes: Math.round((n * intervalMs) / 60000),
    };
  }, [intervalMs]);

  return {
    status,              // 'idle' | 'loading' | 'active' | 'no-camera' | 'error'
    currentLevel,        // { score, label, color } | null
    sampleCount: samplesRef.current.length,
    getSessionSummary,
  };
}
