import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import HowToWalkthrough from "./HowToWalkthrough";

const PURPLE = "#7c3aed";

// ─── Tour steps ───────────────────────────────────────────────────────────────
// selector: which [data-tour] element to spotlight. Missing element (e.g. sidebar
// hidden on mobile) → the step falls back to a centered card automatically.
const STEPS = [
  {
    id: "welcome",
    welcome: true,
    title: "Welcome to PrepSy 👋",
    body: "Study with people, stay focused, and watch your progress compound. Here's the 30-second tour — or skip and dive right in.",
  },
  {
    id: "rooms",
    selector: '[data-tour="nav-rooms"]',
    title: "Live study rooms",
    body: "Browse rooms by goal or start your own in one click. Join with camera, audio-only, or just observe — peers keep you accountable.",
  },
  {
    id: "cohort",
    selector: '[data-tour="nav-cohort"]',
    title: "YouTube co-learning cohorts",
    body: "Turn a playlist into a daily cohort that watches in sync and takes an AI checkpoint quiz at each stop. Great for a structured syllabus.",
  },
  {
    id: "analytics",
    selector: '[data-tour="nav-analytics"]',
    title: "Your analytics",
    body: "Focus score, streak, peak-hour heatmap, and AI coaching — all tracked per session and over time, so you can see yourself improve.",
  },
  {
    id: "start",
    selector: '[data-tour="start-room"]',
    title: "Start your first session",
    body: "Ready when you are — spin up a room and begin a focused Pomodoro. Bring a friend and study together.",
  },
  {
    id: "sessions",
    selector: '[data-tour="sessions"]',
    title: "Active & upcoming sessions",
    body: "Live and scheduled rooms show up here. Hit Join when one's live — that's your golden path. Enjoy the focus! ✨",
  },
];

const CSS = `
  @keyframes tour-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes tour-pop { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes tour-ring { 0% { box-shadow: 0 0 0 0 rgba(124,58,237,0.45); } 100% { box-shadow: 0 0 0 12px rgba(124,58,237,0); } }
  @keyframes tour-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  @keyframes tour-launch-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .tour-btn { transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease; }
  .tour-btn:hover { transform: translateY(-1px); }
  .tour-launch { transition: transform 0.18s ease, box-shadow 0.18s ease; }
  .tour-launch:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(124,58,237,0.4) !important; }
`;

// ─── Animated explainer (self-playing, on the welcome card) ─────────────────────
const SCENES = [
  { key: "join", label: "1 · Join a live room", tint: "#7c3aed" },
  { key: "focus", label: "2 · Focus together", tint: "#0ea5e9" },
  { key: "score", label: "3 · AI scores your focus", tint: "#10b981" },
  { key: "streak", label: "4 · Build your streak", tint: "#f59e0b" },
];

function WalkthroughAnimation() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % SCENES.length), 2400);
    return () => clearInterval(id);
  }, []);
  const scene = SCENES[i];

  return (
    <div style={{
      borderRadius: 16, overflow: "hidden", border: "1px solid var(--card-border)",
      background: "linear-gradient(160deg, #f5f3ff 0%, #eef2ff 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    }}>
      {/* Screen */}
      <div style={{ position: "relative", height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Scene 1 — room with avatars */}
        <SceneWrap show={scene.key === "join"}>
          <div style={{ display: "flex", gap: 8 }}>
            {["👩‍💻", "🧑‍💻", "👨‍💻"].map((e, k) => (
              <div key={k} style={{
                width: 40, height: 40, borderRadius: "50%", background: "#fff",
                border: `2px solid ${PURPLE}`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 19, boxShadow: "0 4px 12px rgba(124,58,237,0.18)",
              }}>{e}</div>
            ))}
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: PURPLE, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800,
            }}>you</div>
          </div>
        </SceneWrap>

        {/* Scene 2 — pomodoro + focus bars */}
        <SceneWrap show={scene.key === "focus"}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", border: "5px solid #dbe4ff",
              borderTopColor: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "#0369a1", animation: "tour-ring 1.6s ease-out infinite",
            }}>25:00</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
              {[60, 80, 45, 90, 70, 85].map((h, k) => (
                <div key={k} style={{ width: 7, height: `${h}%`, borderRadius: 3, background: "#0ea5e9", opacity: 0.8 }} />
              ))}
            </div>
          </div>
        </SceneWrap>

        {/* Scene 3 — focus score */}
        <SceneWrap show={scene.key === "score"}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 74, height: 74, borderRadius: "50%", margin: "0 auto",
              background: "conic-gradient(#10b981 0% 86%, #d1fae5 86% 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: 800, color: "#059669",
              }}>86</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "#059669" }}>Great focus</div>
          </div>
        </SceneWrap>

        {/* Scene 4 — streak */}
        <SceneWrap show={scene.key === "streak"}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 40 }}>🔥</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#b45309", lineHeight: 1 }}>12</div>
              <div style={{ fontSize: 11, color: "#92400e", marginTop: 3 }}>day streak</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40, marginLeft: 6 }}>
              {[30, 45, 40, 60, 70, 85, 100].map((h, k) => (
                <div key={k} style={{ width: 6, height: `${h}%`, borderRadius: 2, background: "#f59e0b", opacity: 0.85 }} />
              ))}
            </div>
          </div>
        </SceneWrap>
      </div>

      {/* Caption + progress */}
      <div style={{
        padding: "10px 14px", background: "var(--tour-surface)", borderTop: "1px solid var(--card-border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: scene.tint }}>{scene.label}</span>
        <div style={{ display: "flex", gap: 5 }}>
          {SCENES.map((s, k) => (
            <span key={s.key} style={{
              width: k === i ? 16 : 6, height: 6, borderRadius: 999,
              background: k === i ? scene.tint : "var(--card-border)", transition: "all 0.3s ease",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SceneWrap({ show, children }) {
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      opacity: show ? 1 : 0, transform: show ? "scale(1)" : "scale(0.96)",
      transition: "opacity 0.5s ease, transform 0.5s ease", pointerEvents: "none",
    }}>
      {children}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────────
export default function OnboardingTour({ autoStart = false, onSeen }) {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null); // spotlight target rect, or null (centered)
  const [showLauncher, setShowLauncher] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const startedRef = useRef(false);

  const begin = useCallback(() => {
    setStep(0);
    setRunning(true);
  }, []);

  const finish = useCallback(() => {
    setRunning(false);
    setRect(null);
    onSeen?.(); // persist account-scoped "seen" flag (follows the user across devices)
    setShowLauncher(true);
  }, [onSeen]);

  // Auto-start once for a user who hasn't seen it (the parent decides this from the
  // account flag, so it fires per-user, not per-browser). Launcher shows otherwise.
  useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      const t = setTimeout(begin, 650); // let the dashboard paint first
      return () => clearTimeout(t);
    }
    if (!autoStart) setShowLauncher(true);
    return undefined;
  }, [autoStart, begin]);

  // Position the spotlight for the current step.
  const reposition = useCallback(() => {
    const s = STEPS[step];
    if (!s || s.welcome || !s.selector) { setRect(null); return; }
    const el = document.querySelector(s.selector);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { setRect(null); return; }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    if (!running) return undefined;
    const s = STEPS[step];
    const el = s?.selector ? document.querySelector(s.selector) : null;
    if (el) el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    const raf1 = requestAnimationFrame(() => requestAnimationFrame(reposition));
    const t = setTimeout(reposition, 320); // after smooth scroll settles
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(t);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [running, step, reposition]);

  // Keyboard: Esc = skip, arrows = navigate.
  useEffect(() => {
    if (!running) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight" || e.key === "Enter") setStep((n) => Math.min(n + 1, STEPS.length - 1));
      else if (e.key === "ArrowLeft") setStep((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, finish]);

  const next = () => (step >= STEPS.length - 1 ? finish() : setStep(step + 1));
  const back = () => setStep((n) => Math.max(n - 1, 0));

  if (typeof document === "undefined") return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // ── Launcher pills (when tour isn't running): replay tour + watch walkthrough ──
  const launcher = showLauncher && !running ? (
    <div style={{
      position: "fixed", right: 20, bottom: 20, zIndex: 9990,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10,
      animation: "tour-launch-in 0.4s ease both",
    }}>
      <button
        className="tour-launch"
        onClick={() => setShowHowTo(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "9px 15px", borderRadius: 999,
          border: `1px solid ${PURPLE}33`, background: "var(--tour-surface)",
          color: PURPLE, fontWeight: 700, fontSize: 13, cursor: "pointer",
          boxShadow: "0 6px 18px rgba(17,19,45,0.16)",
        }}
        title="See how to use PrepSy, step by step"
      >
        <span style={{ fontSize: 13 }}>▶</span> How to use it
      </button>
      <button
        className="tour-launch"
        onClick={begin}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 999, border: "none",
          background: PURPLE, color: "#fff", fontWeight: 700, fontSize: 13,
          cursor: "pointer", boxShadow: "0 8px 24px rgba(124,58,237,0.34)",
        }}
        title="Replay the product tour"
      >
        <span style={{ fontSize: 15 }}>🧭</span> Take a tour
      </button>
    </div>
  ) : null;

  // ── Tooltip position ──
  let tipStyle = {
    // Opacity-only entrance — the card uses `transform` for positioning
    // (translate centering / translateY(-100%) above a target), so the entrance
    // animation must NOT touch transform or it clobbers the placement.
    position: "fixed", zIndex: 10002, width: "min(340px, calc(100vw - 32px))",
    animation: "tour-fade 0.28s ease both",
  };
  const centered = !rect;
  if (centered) {
    tipStyle = { ...tipStyle, top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(400px, calc(100vw - 32px))" };
  } else {
    const vh = window.innerHeight, vw = window.innerWidth;
    const below = rect.top + rect.height + 14;
    const placeBelow = below + 200 < vh || rect.top < 220;
    const tipW = Math.min(340, vw - 32);
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(16, Math.min(left, vw - tipW - 16));
    if (placeBelow) tipStyle = { ...tipStyle, top: below, left, width: tipW };
    else tipStyle = { ...tipStyle, top: Math.max(16, rect.top - 14), left, width: tipW, transform: "translateY(-100%)" };
  }

  const overlay = running ? (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, animation: "tour-fade 0.25s ease both" }}>
      {/* Click catcher / dim (used when no target) */}
      {centered && <div style={{ position: "absolute", inset: 0, background: "rgba(17,19,45,0.7)", backdropFilter: "blur(2px)" }} />}

      {/* Spotlight cutout (dims everything except the target via a huge box-shadow) */}
      {!centered && (
        <>
          <div style={{ position: "absolute", inset: 0 }} />
          <div style={{
            position: "fixed",
            top: rect.top - 8, left: rect.left - 8,
            width: rect.width + 16, height: rect.height + 16,
            borderRadius: 14, boxShadow: "0 0 0 9999px rgba(17,19,45,0.7)",
            border: `2px solid ${PURPLE}`, pointerEvents: "none",
            animation: "tour-ring 1.8s ease-out infinite",
            transition: "top 0.28s ease, left 0.28s ease, width 0.28s ease, height 0.28s ease",
          }} />
        </>
      )}

      {/* Tooltip card — flex column so the action row stays pinned while the
          (possibly tall) welcome content scrolls; capped to the viewport. */}
      <div style={{
        ...tipStyle,
        background: "var(--tour-surface)", borderRadius: 18, padding: 0,
        border: "1px solid var(--card-border)", boxShadow: "0 24px 60px rgba(17,19,45,0.4)",
        display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 24px)",
      }}>
        {/* Scrollable content */}
        <div style={{ overflowY: "auto", padding: "20px 20px 6px" }}>
          {s.welcome && (
            <div style={{ marginBottom: 16 }}>
              <WalkthroughAnimation />
              <button
                className="tour-btn"
                onClick={() => setShowHowTo(true)}
                style={{
                  marginTop: 10, width: "100%", padding: "9px 0", borderRadius: 10, border: "none",
                  background: PURPLE, color: "#fff", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  boxShadow: "0 6px 16px rgba(124,58,237,0.3)",
                }}
              >
                <span style={{ fontSize: 14 }}>▶</span> See how to use it
              </button>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: PURPLE, background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.22)", padding: "2px 9px", borderRadius: 999,
            }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>

          <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.25 }}>
            {s.title}
          </h3>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {s.body}
          </p>

          {/* Progress dots */}
          <div style={{ display: "flex", gap: 6, margin: "16px 0 4px" }}>
            {STEPS.map((_, k) => (
              <span key={k} style={{
                height: 6, borderRadius: 999, flex: k === step ? "0 0 20px" : "0 0 6px",
                background: k === step ? PURPLE : "var(--card-border)", transition: "all 0.3s ease",
              }} />
            ))}
          </div>
        </div>

        {/* Pinned action row — always visible even if the content scrolls */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          padding: "12px 20px", borderTop: "1px solid var(--card-border)", flexShrink: 0,
        }}>
          <button className="tour-btn" onClick={finish} style={{
            background: "transparent", border: "none", color: "var(--text-muted)",
            fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 4px",
          }}>
            Skip tour
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button className="tour-btn" onClick={back} style={{
                background: "transparent", border: "1px solid var(--card-border)",
                color: "var(--text-secondary)", fontSize: 13, fontWeight: 700,
                cursor: "pointer", padding: "8px 16px", borderRadius: 10,
              }}>
                Back
              </button>
            )}
            <button className="tour-btn" onClick={next} style={{
              background: PURPLE, border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", padding: "8px 18px", borderRadius: 10,
              boxShadow: "0 6px 16px rgba(124,58,237,0.32)",
            }}>
              {isLast ? "Got it 🎉" : s.welcome ? "Start tour →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return createPortal(
    <>
      <style>{CSS}</style>
      {launcher}
      {overlay}
      <HowToWalkthrough open={showHowTo} onClose={() => setShowHowTo(false)} />
    </>,
    document.body
  );
}
