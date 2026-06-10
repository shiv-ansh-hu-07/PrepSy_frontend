import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";

const MODEL_CDN =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

// Module-level singleton so models load only once per page
let modelCache = null;

async function loadModels() {
  if (modelCache) return modelCache;
  modelCache = (async () => {
    const faceapi = await import("face-api.js");
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

function ear(pts) {
  return (
    (euclidean(pts[1], pts[5]) + euclidean(pts[2], pts[4])) /
    (2 * euclidean(pts[0], pts[3]) || 0.001)
  );
}

// ── Head pose + expression → focus score ──────────────────────────────────────
// Returns { score, label, lookingForward, facePresent, noteTaking, expression }
function scoreDetection(det, recentSamples = []) {
  if (!det) {
    // No face detected — could be note-taking (head angled down out of frame)
    // or truly distracted. Don't immediately punish.
    const recentlyFocused = recentSamples.slice(-3).some((s) => s.score >= 55);
    return {
      score: recentlyFocused ? 38 : 22,
      label: "Off-screen",
      expression: "absent",
      lookingForward: false,
      facePresent: false,
      noteTaking: false,
    };
  }

  const lm = det.landmarks.positions;

  // Eye aspect ratio — measures eye openness (drowsiness detection)
  const leftEAR = ear([lm[36], lm[37], lm[38], lm[39], lm[40], lm[41]]);
  const rightEAR = ear([lm[42], lm[43], lm[44], lm[45], lm[46], lm[47]]);
  const avgEAR = (leftEAR + rightEAR) / 2;

  const noseTip = lm[30];
  const eyeCx = (lm[36].x + lm[39].x + lm[42].x + lm[45].x) / 4;
  const eyeCy = (lm[36].y + lm[39].y + lm[42].y + lm[45].y) / 4;
  const eyeSpan = euclidean(lm[36], lm[45]) || 1;

  // Yaw: horizontal rotation (looking left/right) — primary distraction signal
  const yaw = Math.abs(noseTip.x - eyeCx) / eyeSpan;

  // Pitch: vertical head tilt.
  // When looking down at a notebook, the nose moves further below the eye centre
  // in the image plane → pitchRatio increases beyond the neutral ~0.7–0.9 range.
  const pitchRatio = (noseTip.y - eyeCy) / eyeSpan;
  const lookingDown = pitchRatio > 1.05 && yaw < 0.28;
  const lookingSideways = yaw > 0.36;

  const expr = det.expressions;
  const dominant = Object.entries(expr).sort(([, a], [, b]) => b - a)[0][0];
  const isFocusedExpr = ["neutral", "happy"].includes(dominant);

  // ── Note-taking: head tilted down but not sideways ────────────────────────
  if (lookingDown) {
    return {
      score: 73,
      label: "Note-taking",
      expression: dominant,
      lookingForward: false,
      facePresent: true,
      noteTaking: true,
    };
  }

  // ── Distracted: clearly looking sideways ──────────────────────────────────
  if (lookingSideways) {
    const score = Math.max(5, Math.round(20 - (yaw - 0.36) * 40));
    return {
      score,
      label: "Distracted",
      expression: dominant,
      lookingForward: false,
      facePresent: true,
      noteTaking: false,
    };
  }

  // ── Looking at screen — standard scoring ──────────────────────────────────
  const drowsy = avgEAR < 0.17;
  const eyePoints = Math.min(35, avgEAR * 120);
  const exprPoints = isFocusedExpr ? 30 : dominant === "surprised" ? 12 : 8;
  const drowsyPenalty = drowsy ? 28 : 0;
  const raw = Math.round(35 + eyePoints + exprPoints - drowsyPenalty);
  const score = Math.max(0, Math.min(100, raw));
  const label =
    score >= 80 ? "High Focus" :
    score >= 62 ? "Focused" :
    score >= 44 ? "Moderate" : "Low Focus";

  return { score, label, expression: dominant, lookingForward: true, facePresent: true, noteTaking: false, avgEAR };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export default function useFocusMonitor({ enabled, intervalMs = 5000 }) {
  const { cameraTrack, microphoneTrack } = useLocalParticipant();

  const [status, setStatus] = useState("idle");
  const [currentLevel, setCurrentLevel] = useState(null);

  const samplesRef   = useRef([]);
  const videoElRef   = useRef(null);
  const timerRef     = useRef(null);
  const faceApiRef   = useRef(null);
  const activeRef    = useRef(false);

  // ── Audio analysis (background noise) ────────────────────────────────────
  const audioCtxRef     = useRef(null);
  const audioAnalyserRef = useRef(null);

  const setupAudio = useCallback((micMST) => {
    if (!micMST || audioCtxRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      ctx.createMediaStreamSource(new MediaStream([micMST])).connect(analyser);
      audioCtxRef.current  = ctx;
      audioAnalyserRef.current = analyser;
    } catch (e) {
      console.warn("[FocusMonitor] Audio analysis unavailable:", e.message);
    }
  }, []);

  const teardownAudio = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current  = null;
      audioAnalyserRef.current = null;
    }
  }, []);

  // Returns 0-100 noise level from mic (0 = silent, 100 = loud)
  const getNoiseLevel = useCallback(() => {
    if (!audioAnalyserRef.current) return 0;
    const arr = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
    audioAnalyserRef.current.getByteFrequencyData(arr);
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }, []);

  // Watch mic track from LiveKit — no extra permission needed
  useEffect(() => {
    const micMST = microphoneTrack?.track?.mediaStreamTrack;
    if (micMST) {
      setupAudio(micMST);
    } else {
      teardownAudio();
    }
  }, [microphoneTrack, setupAudio, teardownAudio]);

  // ── Camera video element ──────────────────────────────────────────────────
  const syncVideo = useCallback(() => {
    const mst = cameraTrack?.track?.mediaStreamTrack;
    if (!mst) {
      if (videoElRef.current) videoElRef.current.srcObject = null;
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

  // ── Single frame analysis ─────────────────────────────────────────────────
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

      const result = scoreDetection(det || null, samplesRef.current);

      // Background noise penalty — loud sustained noise reduces focus score
      const noiseLevel = getNoiseLevel();
      const noisePenalty = noiseLevel > 40 ? Math.min(15, Math.round((noiseLevel - 40) / 3)) : 0;
      const finalScore = Math.max(0, Math.min(100, result.score - noisePenalty));

      const sample = {
        ...result,
        score: finalScore,
        noiseLevel,
        noisePenalty,
        facePresent: Boolean(det),
        ts: Date.now(),
      };
      samplesRef.current = [...samplesRef.current, sample];

      if (activeRef.current) {
        setCurrentLevel({
          score: finalScore,
          label: result.label,
          color: levelColor(finalScore),
          noteTaking: result.noteTaking,
          noiseLevel,
        });
      }
    } catch {
      // swallow — network blip or model error shouldn't stop the session
    }
  }, [getNoiseLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  const levelColor = (score) =>
    score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  // ── Start monitoring ──────────────────────────────────────────────────────
  const startMonitoring = useCallback(async () => {
    if (activeRef.current) return;
    setStatus("loading");

    let faceapi;
    try {
      faceapi = await loadModels();
    } catch (err) {
      console.error("[FocusMonitor] Failed to load models:", err);
      modelCache = null;
      setStatus("error");
      return;
    }

    const video = syncVideo();
    if (!video) {
      setStatus("no-camera");
      return;
    }

    faceApiRef.current = faceapi;

    if (video.readyState < 2) {
      await new Promise((res) => {
        video.addEventListener("loadeddata", res, { once: true });
        setTimeout(res, 4000);
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
      syncVideo();
    }
  }, [enabled, cameraTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { teardown(); teardownAudio(); }, [teardown, teardownAudio]);

  // ── Session summary ───────────────────────────────────────────────────────
  const getSessionSummary = useCallback(() => {
    const s = samplesRef.current;
    if (s.length < 6) return null;

    const n = s.length;
    const focusScore = Math.round(s.reduce((acc, x) => acc + x.score, 0) / n);

    // Engagement: face present and looking forward OR note-taking
    const engagedCount = s.filter((x) => x.facePresent && (x.lookingForward || x.noteTaking)).length;
    const engagementScore = Math.round((engagedCount / n) * 100);

    // Off-screen: face NOT present (excludes note-taking which has facePresent=true)
    const offScreenSeconds = Math.round(
      s.filter((x) => !x.facePresent).length * (intervalMs / 1000),
    );

    // Note-taking time
    const noteTakingPercent = Math.round(
      (s.filter((x) => x.noteTaking).length / n) * 100,
    );

    // Distractions: score drops from ≥55 to <30, excluding note-taking transitions
    let distractionCount = 0;
    for (let i = 1; i < n; i++) {
      if (s[i].score < 30 && !s[i].noteTaking && s[i - 1].score >= 55) distractionCount++;
    }

    // Average background noise (only when mic was active)
    const noiseSamples = s.filter((x) => x.noiseLevel > 0);
    const avgNoiseLevel = noiseSamples.length
      ? Math.round(noiseSamples.reduce((a, b) => a + b.noiseLevel, 0) / noiseSamples.length)
      : 0;

    const highFocusPercent = Math.round(s.filter((x) => x.score >= 75).length / n * 100);
    const medFocusPercent  = Math.round(s.filter((x) => x.score >= 50 && x.score < 75).length / n * 100);
    const lowFocusPercent  = Math.round(s.filter((x) => x.score < 50).length / n * 100);

    return {
      focusScore,
      engagementScore,
      distractionCount,
      offScreenSeconds,
      noteTakingPercent,
      avgNoiseLevel,
      highFocusPercent,
      medFocusPercent,
      lowFocusPercent,
      totalSamples: n,
      durationMinutes: Math.round((n * intervalMs) / 60000),
    };
  }, [intervalMs]);

  return {
    status,
    currentLevel,
    sampleCount: samplesRef.current.length,
    getSessionSummary,
  };
}
