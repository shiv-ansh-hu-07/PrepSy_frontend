import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A self-playing, video-style walkthrough of the whole product. Not a recorded
// clip — an animated "player" that auto-advances through feature scenes with
// play/pause, seek, and replay. Used in-app (modal) and mirrors the shareable
// Artifact version.

const PURPLE = "#7c3aed";

const SCENES = [
  { key: "intro", ms: 3200, tint: "#7c3aed", title: "Welcome to PrepSy", sub: "Study with people. Stay focused. See yourself improve — a 60-second tour." },
  { key: "rooms", ms: 4800, tint: "#7c3aed", title: "Live study rooms", sub: "Join peers on camera, audio-only, or just observe. The quiet accountability of a real study hall." },
  { key: "focus", ms: 4800, tint: "#10b981", title: "On-device AI focus monitor", sub: "Reads your attention every 5s — note-taking vs. distraction — and scores each session. Nothing leaves your browser." },
  { key: "pomodoro", ms: 4200, tint: "#f59e0b", title: "Synced Pomodoro + notes", sub: "One shared timer keeps the whole room in rhythm. Chat, share your screen, export notes as PDF." },
  { key: "cohorts", ms: 4800, tint: "#f43f5e", title: "YouTube co-learning cohorts", sub: "Watch a playlist together on a daily schedule, with an AI checkpoint quiz at every stop." },
  { key: "analytics", ms: 4800, tint: "#6366f1", title: "Analytics that prove it", sub: "Streak, focus score trend, peak-hour heatmap, and AI coaching — all in one place." },
  { key: "community", ms: 4200, tint: "#0ea5e9", title: "A community + leaderboard", sub: "Post wins, share resources, add friends, and climb the study-time board together." },
  { key: "outro", ms: 3600, tint: "#7c3aed", title: "Your first session is a minute away", sub: "Jump into a live room now — bring a friend and study together tonight." },
];

const CSS = `
  @keyframes pw-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pw-pop { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  @keyframes pw-scan { 0% { top: 14%; opacity: 0.9; } 85% { top: 78%; opacity: 0.55; } 100% { top: 14%; opacity: 0; } }
  @keyframes pw-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.28; } }
  @keyframes pw-rise { from { transform: scaleY(0.15); opacity: 0.4; } to { transform: scaleY(1); opacity: 1; } }
  @keyframes pw-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  .pw-ctrl { transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease; }
  .pw-ctrl:hover { transform: translateY(-1px); }
  .pw-bar { transform-origin: bottom; animation: pw-rise 0.6s ease both; }
`;

// ── Scene visuals ────────────────────────────────────────────────────────────
function Screen({ children, bg }) {
  return (
    <div style={{
      position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 14,
      overflow: "hidden", background: bg || "linear-gradient(160deg, #ede9fe 0%, #eef2ff 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {children}
    </div>
  );
}

function SceneVisual({ scene }) {
  switch (scene) {
    case "intro":
      return (
        <Screen bg="linear-gradient(140deg, #2e2350 0%, #4a3882 55%, #7c3aed 100%)">
          <div style={{ textAlign: "center", color: "#fff", animation: "pw-pop 0.6s ease both" }}>
            <div style={{
              width: 66, height: 66, borderRadius: 20, margin: "0 auto 14px",
              background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 800, fontFamily: "Georgia, serif", animation: "pw-float 3s ease-in-out infinite",
            }}>PS</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "Georgia, serif" }}>PrepSy</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Study right, not just more.</div>
          </div>
        </Screen>
      );
    case "rooms":
      return (
        <Screen>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{
              width: 120, height: 74, borderRadius: 12, background: "#1f2440",
              border: `2px solid ${PURPLE}`, position: "relative", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 30,
              boxShadow: "0 8px 20px rgba(124,58,237,0.28)",
            }}>
              🧑‍💻
              <span style={{ position: "absolute", bottom: 5, left: 6, fontSize: 9, color: "#c7d2fe", background: "rgba(0,0,0,0.4)", padding: "1px 6px", borderRadius: 6 }}>You</span>
            </div>
            {["👩‍💻", "👨‍💻", "🧑‍🎓"].map((e, k) => (
              <div key={k} style={{
                width: 52, height: 52, borderRadius: "50%", background: "#fff", border: "2px solid #c7b6f5",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                animation: `pw-float ${2.6 + k * 0.4}s ease-in-out infinite`,
              }}>{e}</div>
            ))}
          </div>
        </Screen>
      );
    case "focus":
      return (
        <Screen bg="linear-gradient(160deg, #06251c 0%, #0b3b2b 100%)">
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ position: "relative", width: 96, height: 108 }}>
              <div style={{
                position: "absolute", inset: 0, margin: "auto", width: 72, height: 90,
                border: "2px solid rgba(34,197,94,0.8)", borderRadius: "50% 50% 44% 44%",
                boxShadow: "0 0 16px rgba(34,197,94,0.3)",
              }} />
              <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(34,197,94,0.9),transparent)", animation: "pw-scan 2.4s ease-in-out infinite" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 70, height: 70, borderRadius: "50%", margin: "0 auto",
                background: "conic-gradient(#22c55e 0% 86%, rgba(255,255,255,0.15) 86% 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#06251c", color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>86</div>
              </div>
              <div style={{ fontSize: 11, color: "#86efac", marginTop: 7, fontWeight: 700 }}>Focused · Note-taking ✓</div>
            </div>
          </div>
        </Screen>
      );
    case "pomodoro":
      return (
        <Screen>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{
              width: 84, height: 84, borderRadius: "50%", border: "7px solid #fde7c2",
              borderTopColor: "#f59e0b", borderRightColor: "#f59e0b",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, fontWeight: 800, color: "#b45309",
            }}>24:12</div>
            <div style={{
              width: 120, height: 74, borderRadius: 10, background: "#fff", border: "1px solid #e6e2f5",
              padding: 10, boxShadow: "0 6px 16px rgba(100,116,180,0.14)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", marginBottom: 6 }}>📝 Session notes</div>
              {[92, 74, 84, 60].map((w, k) => (
                <div key={k} style={{ height: 5, width: `${w}%`, background: "#ece8fb", borderRadius: 3, marginBottom: 5 }} />
              ))}
            </div>
          </div>
        </Screen>
      );
    case "cohorts":
      return (
        <Screen bg="linear-gradient(160deg, #2a0f1a 0%, #4a1526 100%)">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 128, height: 74, borderRadius: 10, background: "#111", border: "1px solid rgba(244,63,94,0.5)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 0, height: 0, borderTop: "11px solid transparent", borderBottom: "11px solid transparent", borderLeft: "18px solid #f43f5e", marginLeft: 4 }} />
              <span style={{ position: "absolute", bottom: 5, right: 6, fontSize: 9, color: "#fecdd3", background: "rgba(0,0,0,0.5)", padding: "1px 6px", borderRadius: 6 }}>▶ synced · 4/6</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 10, padding: "10px 12px", width: 128 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#e11d48", marginBottom: 6 }}>🎯 Checkpoint quiz</div>
              {["Q1 ✓", "Q2 ✓", "Q3 …"].map((q, k) => (
                <div key={k} style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{q}</div>
              ))}
            </div>
          </div>
        </Screen>
      );
    case "analytics":
      return (
        <Screen>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 84 }}>
              {[40, 55, 48, 70, 62, 82, 96].map((h, k) => (
                <div key={k} className="pw-bar" style={{ width: 12, height: `${h}%`, borderRadius: 4, background: "linear-gradient(#8b5cf6,#6366f1)", animationDelay: `${k * 70}ms` }} />
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ background: "#fff", borderRadius: 10, padding: "8px 12px", boxShadow: "0 4px 12px rgba(100,116,180,0.12)" }}>
                <span style={{ fontSize: 18 }}>🔥</span> <b style={{ color: "#b45309", fontSize: 16 }}>12</b>
                <div style={{ fontSize: 9, color: "#92400e" }}>day streak</div>
              </div>
              <div style={{ background: "#fff", borderRadius: 10, padding: "8px 12px", boxShadow: "0 4px 12px rgba(100,116,180,0.12)" }}>
                <b style={{ color: "#059669", fontSize: 16 }}>84</b>
                <div style={{ fontSize: 9, color: "#047857" }}>avg focus ↑</div>
              </div>
            </div>
          </div>
        </Screen>
      );
    case "community":
      return (
        <Screen>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "78%" }}>
            {[
              { e: "🎉", t: "Got the Flipkart SDE-1 offer!" },
              { e: "💡", t: "Sharing my DP sheet resources" },
              { e: "🏆", t: "You're #3 on the weekly board" },
            ].map((p, k) => (
              <div key={k} style={{
                background: "#fff", borderRadius: 10, padding: "8px 12px", fontSize: 11.5, color: "#475569",
                boxShadow: "0 3px 10px rgba(100,116,180,0.1)", display: "flex", alignItems: "center", gap: 8,
                animation: `pw-pop 0.5s ease both`, animationDelay: `${k * 140}ms`,
              }}>
                <span style={{ fontSize: 15 }}>{p.e}</span> {p.t}
              </div>
            ))}
          </div>
        </Screen>
      );
    case "outro":
      return (
        <Screen bg="linear-gradient(140deg, #2e2350 0%, #7c3aed 100%)">
          <div style={{ textAlign: "center", color: "#fff", animation: "pw-pop 0.6s ease both" }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🚀</div>
            <div style={{ fontSize: 19, fontWeight: 800, fontFamily: "Georgia, serif" }}>Ready to prep smarter?</div>
            <div style={{
              display: "inline-block", marginTop: 12, background: "#fff", color: PURPLE,
              padding: "8px 20px", borderRadius: 999, fontSize: 12, fontWeight: 800,
              boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
            }}>Start Prepping Free →</div>
          </div>
        </Screen>
      );
    default:
      return <Screen />;
  }
}

// ── Player ─────────────────────────────────────────────────────────────────────
export default function ProductWalkthrough({ open, onClose }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // 0..1 of current scene
  const [ended, setEnded] = useState(false);
  const raf = useRef(0);
  const startRef = useRef(0);
  const baseRef = useRef(0); // progress already elapsed (for pause/resume)

  const scene = SCENES[i];

  // Reset when opened.
  useEffect(() => {
    if (open) { setI(0); setPlaying(true); setProgress(0); setEnded(false); baseRef.current = 0; }
  }, [open]);

  // Drive the current scene's progress + auto-advance.
  useEffect(() => {
    if (!open || !playing || ended) return undefined;
    startRef.current = performance.now();
    const dur = SCENES[i].ms;
    const tick = (now) => {
      const elapsed = baseRef.current * dur + (now - startRef.current);
      const p = Math.min(1, elapsed / dur);
      setProgress(p);
      if (p >= 1) {
        baseRef.current = 0;
        if (i >= SCENES.length - 1) { setEnded(true); setPlaying(false); }
        else { setI(i + 1); setProgress(0); }
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [open, playing, i, ended]);

  const goto = useCallback((idx) => {
    baseRef.current = 0;
    setEnded(false);
    setProgress(0);
    setI(Math.max(0, Math.min(idx, SCENES.length - 1)));
    setPlaying(true);
  }, []);

  const togglePlay = () => {
    if (ended) { goto(0); return; }
    if (playing) { baseRef.current = progress; setPlaying(false); }
    else { setPlaying(true); }
  };

  // Esc to close.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 10050, animation: "pw-fade 0.25s ease both",
        background: "rgba(12,14,32,0.78)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <style>{CSS}</style>
      <div style={{
        width: "min(600px, 100%)", background: "var(--tour-surface)", borderRadius: 20,
        border: "1px solid var(--card-border)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        overflow: "hidden", animation: "pw-pop 0.3s ease both",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--card-border)" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pw-blink 1.8s ease-in-out infinite" }} />
            Product walkthrough
          </span>
          <button className="pw-ctrl" onClick={onClose} aria-label="Close" style={{
            background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        {/* Screen */}
        <div style={{ padding: 16 }}>
          <SceneVisual key={scene.key} scene={scene.key} />

          {/* Caption */}
          <div style={{ marginTop: 14, minHeight: 58 }}>
            <h3 style={{ margin: "0 0 5px", fontSize: 17, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.25 }}>
              {scene.title}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>{scene.sub}</p>
          </div>

          {/* Segmented progress bar (click to seek) */}
          <div style={{ display: "flex", gap: 4, marginTop: 14 }}>
            {SCENES.map((s, k) => (
              <button key={s.key} onClick={() => goto(k)} title={s.title} style={{
                flex: 1, height: 5, borderRadius: 999, border: "none", padding: 0, cursor: "pointer",
                background: "var(--card-border)", position: "relative", overflow: "hidden",
              }}>
                <span style={{
                  position: "absolute", inset: 0, transformOrigin: "left",
                  transform: `scaleX(${k < i ? 1 : k === i ? progress : 0})`,
                  background: scene.tint, transition: k === i ? "none" : "transform 0.2s ease",
                }} />
              </button>
            ))}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="pw-ctrl" onClick={() => goto(i - 1)} disabled={i === 0 && !ended} aria-label="Previous" style={ctrlBtn(i === 0 && !ended)}>‹</button>
              <button className="pw-ctrl" onClick={togglePlay} aria-label={ended ? "Replay" : playing ? "Pause" : "Play"} style={{ ...ctrlBtn(false), background: PURPLE, color: "#fff", width: 40, height: 40, fontSize: 16 }}>
                {ended ? "↻" : playing ? "❚❚" : "▶"}
              </button>
              <button className="pw-ctrl" onClick={() => goto(i + 1)} disabled={i >= SCENES.length - 1} aria-label="Next" style={ctrlBtn(i >= SCENES.length - 1)}>›</button>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>{i + 1} / {SCENES.length}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ctrlBtn(disabled) {
  return {
    width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--card-border)",
    background: "var(--tour-surface-2)", color: "var(--text-secondary)", fontSize: 15,
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
}
