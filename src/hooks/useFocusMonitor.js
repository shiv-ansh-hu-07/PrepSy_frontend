import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";

// MediaPipe — 478 face landmarks + iris + 52 blendshapes, plus an object
// detector to catch a phone in frame. WASM runtime + models load from CDN.
const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const OBJ_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite";

// Module-level singleton so models load only once per page.
let modelsPromise = null;
async function loadModels() {
  if (modelsPromise) return modelsPromise;
  modelsPromise = (async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
    // CPU delegate on purpose: the GPU/WebGL path competes with LiveKit's video
    // rendering and can crash the tab.
    const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "CPU" },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });
    // Object detector is best-effort — if it fails, monitoring still works
    // (just without phone detection).
    let objectDetector = null;
    try {
      objectDetector = await vision.ObjectDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: OBJ_MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO",
        scoreThreshold: 0.35,
        maxResults: 5,
      });
    } catch (e) {
      console.warn("[FocusMonitor] Object detector unavailable:", e?.message);
    }
    return { landmarker, objectDetector };
  })();
  return modelsPromise;
}

const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

// ── Tunable thresholds ────────────────────────────────────────────────────────
const CALIB_SAMPLES = 3; // clean frames used to learn neutral pose
const CALIB_MAX_ATTEMPTS = 15; // give up waiting for clean frames after this
const CONFIRM = 2; // consecutive negatives before a soft negative is trusted
const DOWN_MAX = 4; // heads-down frames (×interval) before note-taking decays
const YAW_TURN = 0.11; // head turned left/right
const PITCH_DOWN = 0.1; // head tilted down from baseline
const GAZE_DOWN = 0.45; // eyes looking down (blendshape 0..1)
const GAZE_SIDE = 0.4; // eyes looking left/right (blendshape 0..1)
const BLINK_CLOSED = 0.55; // eyes closed / heavy droop
const PHONE_MIN = 0.35; // object-detector confidence for a phone
const NOTE_SCORE = 60; // note-taking is neutral, not a reward

function readSignals(result) {
  const faces = result?.faceLandmarks;
  if (!faces || !faces.length) return null;
  const lm = faces[0];
  const map = {};
  const bs = result.faceBlendshapes && result.faceBlendshapes[0];
  if (bs) for (const c of bs.categories) map[c.categoryName] = c.score;
  const g = (n) => map[n] || 0;

  const gazeDown = (g("eyeLookDownLeft") + g("eyeLookDownRight")) / 2;
  const gazeSide = Math.max(
    (g("eyeLookInLeft") + g("eyeLookInRight")) / 2,
    (g("eyeLookOutLeft") + g("eyeLookOutRight")) / 2,
  );
  const blink = (g("eyeBlinkLeft") + g("eyeBlinkRight")) / 2;

  const nose = lm[1];
  const lf = lm[234];
  const rf = lm[454];
  const eL = lm[33];
  const eR = lm[263];
  const faceW = Math.hypot(rf.x - lf.x, rf.y - lf.y) || 0.001;
  const yawProxy = (nose.x - (lf.x + rf.x) / 2) / faceW;
  const pitchProxy = (nose.y - (eL.y + eR.y) / 2) / faceW;

  return { gazeDown, gazeSide, blink, yawProxy, pitchProxy };
}

// Rule out "looking away" before crediting "note-taking".
function classify(sig, baseline) {
  const yawDev = Math.abs(sig.yawProxy - baseline.yaw);
  const pitchDev = sig.pitchProxy - baseline.pitch;

  const headTurned = yawDev > YAW_TURN;
  const eyesSide = sig.gazeSide > GAZE_SIDE;
  if (headTurned || eyesSide) {
    const mag = Math.max((yawDev - YAW_TURN) * 130, (sig.gazeSide - GAZE_SIDE) * 50, 0);
    return { state: "distracted", rawScore: clamp(20 - mag), drowsy: false };
  }

  const headDown = pitchDev > PITCH_DOWN;
  const eyesDown = sig.gazeDown > GAZE_DOWN;
  if (headDown || eyesDown) {
    return { state: "notetaking", rawScore: NOTE_SCORE, drowsy: false };
  }

  if (sig.blink > BLINK_CLOSED) {
    return { state: "drowsy", rawScore: 50, drowsy: true };
  }

  return { state: "focused", rawScore: clamp(88 - sig.gazeSide * 22), drowsy: false };
}

function labelFor(state, score) {
  switch (state) {
    case "calibrating": return "Calibrating…";
    case "phone": return "Phone";
    case "notetaking": return "Note-taking";
    case "drowsy": return "Drowsy";
    case "away": return "Away";
    case "offscreen": return "Off-screen";
    case "distracted": return "Distracted";
    default:
      return score >= 80 ? "High Focus" : score >= 62 ? "Focused" : score >= 44 ? "Moderate" : "Low Focus";
  }
}

function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export default function useFocusMonitor({ enabled, intervalMs = 5000 }) {
  const { cameraTrack, microphoneTrack } = useLocalParticipant();

  const effectiveEnabled = enabled && !isMobileBrowser();

  const [status, setStatus] = useState("idle");
  const [currentLevel, setCurrentLevel] = useState(null);

  const samplesRef = useRef([]);
  const videoElRef = useRef(null);
  const timerRef = useRef(null);
  const landmarkerRef = useRef(null);
  const objectDetectorRef = useRef(null);
  const activeRef = useRef(false);

  const calibRef = useRef({ yaw: 0, pitch: 0, n: 0, attempts: 0, ready: false });
  const prevScoreRef = useRef(null);
  const negStreakRef = useRef(0);
  const downStreakRef = useRef(0);

  // ── Audio analysis (background noise) ────────────────────────────────────
  const audioCtxRef = useRef(null);
  const audioAnalyserRef = useRef(null);

  const setupAudio = useCallback((micMST) => {
    if (!micMST || audioCtxRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      ctx.createMediaStreamSource(new MediaStream([micMST])).connect(analyser);
      audioCtxRef.current = ctx;
      audioAnalyserRef.current = analyser;
    } catch (e) {
      console.warn("[FocusMonitor] Audio analysis unavailable:", e.message);
    }
  }, []);

  const teardownAudio = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      audioAnalyserRef.current = null;
    }
  }, []);

  const getNoiseLevel = useCallback(() => {
    if (!audioAnalyserRef.current) return 0;
    const arr = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
    audioAnalyserRef.current.getByteFrequencyData(arr);
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }, []);

  useEffect(() => {
    if (!effectiveEnabled) return;
    const micMST = microphoneTrack?.track?.mediaStreamTrack;
    if (micMST) setupAudio(micMST);
    else teardownAudio();
  }, [effectiveEnabled, microphoneTrack, setupAudio, teardownAudio]);

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
    if (!activeRef.current || !landmarkerRef.current) return;
    const video = videoElRef.current;
    if (!video || video.readyState < 2) return;

    const noiseLevel = getNoiseLevel();

    try {
      const tabHidden = typeof document !== "undefined" && document.visibilityState === "hidden";

      let state, rawScore, facePresent, drowsy = false, phone = false, forceNeg = false;

      if (tabHidden) {
        state = "away";
        rawScore = 12;
        facePresent = false;
        forceNeg = true;
      } else {
        const result = landmarkerRef.current.detectForVideo(video, performance.now());
        const sig = readSignals(result);

        if (!sig) {
          const recentlyFocused = samplesRef.current.slice(-3).some((s) => s.score >= 55);
          state = "offscreen";
          rawScore = recentlyFocused ? 34 : 20;
          facePresent = false;
        } else {
          facePresent = true;
          const cal = calibRef.current;
          if (!cal.ready) {
            cal.attempts += 1;
            // Only learn the baseline from frames where the user is actually
            // looking at the screen — otherwise a crooked baseline makes
            // everything look focused.
            const clean = sig.gazeDown < 0.4 && sig.gazeSide < 0.4 && sig.blink < 0.5;
            if (clean) {
              cal.yaw = (cal.yaw * cal.n + sig.yawProxy) / (cal.n + 1);
              cal.pitch = (cal.pitch * cal.n + sig.pitchProxy) / (cal.n + 1);
              cal.n += 1;
            }
            if (cal.n >= CALIB_SAMPLES || cal.attempts >= CALIB_MAX_ATTEMPTS) cal.ready = true;
            state = "calibrating";
            rawScore = 70;
          } else {
            const r = classify(sig, cal);
            state = r.state;
            rawScore = r.rawScore;
            drowsy = r.drowsy;
            // Genuine note-taking has look-ups; staring down for 20s+ straight
            // is more likely a phone/zoning — decay the score.
            if (state === "notetaking") {
              downStreakRef.current += 1;
              if (downStreakRef.current > DOWN_MAX) {
                rawScore = Math.max(32, rawScore - (downStreakRef.current - DOWN_MAX) * 7);
              }
            } else {
              downStreakRef.current = 0;
            }
          }
        }

        // Phone in frame → hard distraction, regardless of gaze/pose.
        if (objectDetectorRef.current) {
          try {
            const od = objectDetectorRef.current.detectForVideo(video, performance.now());
            phone = (od?.detections || []).some((d) => {
              const c = d.categories && d.categories[0];
              return c && /cell phone|phone/i.test(c.categoryName) && c.score > PHONE_MIN;
            });
          } catch {
            /* ignore a detector blip */
          }
          if (phone) {
            state = "phone";
            rawScore = 10;
            forceNeg = true;
            downStreakRef.current = 0;
          }
        }
      }

      // ── Temporal smoothing + hysteresis ──────────────────────────────────
      const isNeg =
        state === "distracted" || state === "offscreen" || state === "away" || state === "phone";
      if (isNeg) negStreakRef.current += 1;
      else negStreakRef.current = 0;

      const prev = prevScoreRef.current;
      let score;
      let committedState = state;
      let confirmedNeg = false;

      if (state === "calibrating") {
        score = 70;
      } else if (isNeg && forceNeg) {
        // High-confidence negatives (phone, tab hidden) commit immediately.
        score = rawScore;
        confirmedNeg = true;
      } else if (isNeg && negStreakRef.current < CONFIRM) {
        // Soft negative — don't crater on a single blip, but don't stay high.
        score = Math.max(42, Math.round((prev == null ? 55 : prev) * 0.55 + rawScore * 0.45));
        committedState = "settling";
      } else if (isNeg) {
        score = rawScore;
        confirmedNeg = true;
      } else {
        // Positive states: weight the new reading more so it reacts faster.
        score = prev == null ? rawScore : Math.round(prev * 0.4 + rawScore * 0.6);
      }

      const noisePenalty = noiseLevel > 40 ? Math.min(15, Math.round((noiseLevel - 40) / 3)) : 0;
      score = clamp(score - noisePenalty);
      prevScoreRef.current = score;

      const noteTaking = committedState === "notetaking";
      const engaged =
        facePresent && committedState !== "distracted" && committedState !== "phone";
      const label = labelFor(committedState, score);

      samplesRef.current = [
        ...samplesRef.current,
        {
          score,
          state: committedState,
          facePresent,
          engaged,
          noteTaking,
          phone: committedState === "phone",
          drowsy: drowsy && committedState === "drowsy",
          confirmedNeg,
          noiseLevel,
          ts: Date.now(),
        },
      ];

      if (activeRef.current) {
        setCurrentLevel({ score, label, color: levelColor(score), noteTaking, noiseLevel });
      }
    } catch {
      // swallow — a model blip shouldn't stop the session
    }
  }, [getNoiseLevel]);

  const levelColor = (score) => (score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444");

  // ── Start monitoring ──────────────────────────────────────────────────────
  const startMonitoring = useCallback(async () => {
    if (activeRef.current) return;
    setStatus("loading");

    let models;
    try {
      models = await loadModels();
    } catch (err) {
      console.error("[FocusMonitor] Failed to load models:", err);
      modelsPromise = null;
      setStatus("error");
      return;
    }

    const video = syncVideo();
    if (!video) {
      setStatus("no-camera");
      return;
    }

    landmarkerRef.current = models.landmarker;
    objectDetectorRef.current = models.objectDetector;

    calibRef.current = { yaw: 0, pitch: 0, n: 0, attempts: 0, ready: false };
    prevScoreRef.current = null;
    negStreakRef.current = 0;
    downStreakRef.current = 0;

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
    if (!effectiveEnabled) {
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
  }, [effectiveEnabled, cameraTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { teardown(); teardownAudio(); }, [teardown, teardownAudio]);

  // ── Session summary ───────────────────────────────────────────────────────
  const getSessionSummary = useCallback(() => {
    const s = samplesRef.current;
    if (s.length < 6) return null;

    const n = s.length;
    const focusScore = Math.round(s.reduce((acc, x) => acc + x.score, 0) / n);

    const engagedCount = s.filter((x) => x.engaged).length;
    const engagementScore = Math.round((engagedCount / n) * 100);

    const offScreenSeconds = Math.round(
      s.filter((x) => !x.facePresent).length * (intervalMs / 1000),
    );

    const noteTakingPercent = Math.round((s.filter((x) => x.noteTaking).length / n) * 100);
    const drowsinessPercent = Math.round((s.filter((x) => x.drowsy).length / n) * 100);
    const phonePercent = Math.round((s.filter((x) => x.phone).length / n) * 100);
    const lookAwayPercent = Math.round((s.filter((x) => x.state === "distracted").length / n) * 100);

    // Longest unbroken run of focused/decent samples → deep-focus streak.
    let longestRun = 0;
    let run = 0;
    for (const x of s) {
      if (x.score >= 60) {
        run += 1;
        if (run > longestRun) longestRun = run;
      } else {
        run = 0;
      }
    }
    const longestFocusStreakSec = Math.round(longestRun * (intervalMs / 1000));

    let distractionCount = 0;
    for (let i = 1; i < n; i++) {
      const cur = s[i];
      if (
        cur.confirmedNeg &&
        (cur.state === "distracted" || cur.state === "away" || cur.state === "phone") &&
        s[i - 1].engaged
      ) {
        distractionCount++;
      }
    }

    const noiseSamples = s.filter((x) => x.noiseLevel > 0);
    const avgNoiseLevel = noiseSamples.length
      ? Math.round(noiseSamples.reduce((a, b) => a + b.noiseLevel, 0) / noiseSamples.length)
      : 0;

    const highFocusPercent = Math.round((s.filter((x) => x.score >= 75).length / n) * 100);
    const medFocusPercent = Math.round((s.filter((x) => x.score >= 50 && x.score < 75).length / n) * 100);
    const lowFocusPercent = Math.round((s.filter((x) => x.score < 50).length / n) * 100);

    return {
      focusScore,
      engagementScore,
      distractionCount,
      offScreenSeconds,
      noteTakingPercent,
      drowsinessPercent,
      phonePercent,
      lookAwayPercent,
      longestFocusStreakSec,
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
