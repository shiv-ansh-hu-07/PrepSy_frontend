import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Animated "how-to" demo: self-playing mock app screens with a moving cursor
// that performs each flow step-by-step (create a room, join + focus, YouTube
// cohort, track progress). A stylised demo of the real UI, not a recording.

const PURPLE = "#7c3aed";

// Each step: a flow label, a caption (the action), a mock screen, and a cursor
// target in % of the screen area. Steps are grouped into flows via `flow`.
const STEPS = [
  // ── Flow 1: Create & host a room ──
  { flow: "Create & host a room", tint: "#7c3aed", ms: 4200, screen: "dash", cursor: [17, 74], caption: "Click “Start a Room” in the sidebar." },
  { flow: "Create & host a room", tint: "#7c3aed", ms: 5200, screen: "createForm", cursor: [70, 46], caption: "Name it, pick a topic and a collaboration style." },
  { flow: "Create & host a room", tint: "#7c3aed", ms: 4600, screen: "createGo", cursor: [80, 84], caption: "Set the Pomodoro length and hit Create." },
  { flow: "Create & host a room", tint: "#7c3aed", ms: 4600, screen: "roomLive", cursor: null, caption: "You're hosting a live room — peers can join you." },

  // ── Flow 2: Join a live room + focus ──
  { flow: "Join a live room + focus", tint: "#0ea5e9", ms: 4600, screen: "roomsList", cursor: [86, 40], caption: "Open “Rooms”, find a live one, and click Join." },
  { flow: "Join a live room + focus", tint: "#0ea5e9", ms: 4600, screen: "roomCam", cursor: [50, 86], caption: "Turn on your camera and the AI focus monitor." },
  { flow: "Join a live room + focus", tint: "#0ea5e9", ms: 5000, screen: "roomFocus", cursor: null, caption: "Study a Pomodoro — your focus score builds live." },

  // ── Flow 3: YouTube co-learning cohort ──
  { flow: "YouTube co-learning cohort", tint: "#f43f5e", ms: 5000, screen: "cohortNew", cursor: [82, 44], caption: "Paste a YouTube playlist and create a cohort." },
  { flow: "YouTube co-learning cohort", tint: "#f43f5e", ms: 4600, screen: "cohortPlan", cursor: null, caption: "PrepSy builds a day-by-day schedule automatically." },
  { flow: "YouTube co-learning cohort", tint: "#f43f5e", ms: 4800, screen: "cohortQuiz", cursor: [72, 82], caption: "Watch in sync, then take the checkpoint quiz." },

  // ── Flow 4: Track progress & connect ──
  { flow: "Track progress & connect", tint: "#6366f1", ms: 4600, screen: "analytics", cursor: null, caption: "Open Analytics for your streak and focus trend." },
  { flow: "Track progress & connect", tint: "#6366f1", ms: 4600, screen: "community", cursor: [80, 34], caption: "Climb the leaderboard, post wins, add friends." },
];

const CSS = `
  @keyframes ht-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ht-pop { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  @keyframes ht-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.28; } }
  @keyframes ht-cursor-in { from { opacity: 0; transform: translate(14px, 14px); } to { opacity: 1; transform: translate(0,0); } }
  @keyframes ht-click { 0% { transform: scale(0.3); opacity: 0.55; } 70% { opacity: 0.2; } 100% { transform: scale(1.7); opacity: 0; } }
  @keyframes ht-rise { from { transform: scaleY(0.2); opacity: 0.4; } to { transform: scaleY(1); opacity: 1; } }
  @keyframes ht-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .ht-ctrl { transition: transform 0.15s ease; }
  .ht-ctrl:hover { transform: translateY(-1px); }
  .ht-bar { transform-origin: bottom; animation: ht-rise 0.6s ease both; }
  .ht-hl { animation: ht-in 0.4s ease both; }
`;

// ── Cursor + click ripple, positioned in % of the screen ──
function Cursor({ pos }) {
  if (!pos) return null;
  const [x, y] = pos;
  return (
    <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, zIndex: 5, pointerEvents: "none", animation: "ht-cursor-in 0.5s ease both" }}>
      <span style={{ position: "absolute", left: -3, top: -3, width: 30, height: 30, borderRadius: "50%", background: "rgba(124,58,237,0.35)", animation: "ht-click 1.4s ease-out infinite 0.4s" }} />
      <svg width="20" height="20" viewBox="0 0 20 20" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>
        <path d="M2 2 L2 15 L6 11 L9 17 L11 16 L8 10 L14 10 Z" fill="#fff" stroke="#1f2440" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── App-window chrome ──
function Win({ children }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#f4f5fb", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid #e3e6f3" }}>
      <div style={{ height: 18, background: "#e9ebf5", display: "flex", alignItems: "center", gap: 5, padding: "0 8px", flexShrink: 0 }}>
        {["#ef6a5f", "#f5bd4f", "#61c554"].map((c) => <span key={c} style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />)}
        <span style={{ marginLeft: 8, fontSize: 8, color: "#9aa3c0" }}>prepsy.in</span>
      </div>
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>{children}</div>
    </div>
  );
}

const railItem = (label, active) => (
  <div key={label} style={{ fontSize: 8.5, padding: "4px 6px", borderRadius: 5, color: active ? "#fff" : "#6b78a0", background: active ? PURPLE : "transparent", fontWeight: active ? 700 : 500, whiteSpace: "nowrap" }}>{label}</div>
);

function Rail({ active, cta }) {
  return (
    <div style={{ width: 88, background: "#fff", borderRight: "1px solid #edeef7", padding: 7, display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#2f3b63", padding: "2px 6px 6px" }}>PrepSy</div>
      {["Home", "Cohort", "Community", "Rooms", "Analytics"].map((l) => railItem(l, l === active))}
      <div style={{ marginTop: "auto" }}>
        <div style={{ fontSize: 8.5, textAlign: "center", padding: "6px 4px", borderRadius: 7, background: cta ? PURPLE : "#efeafc", color: cta ? "#fff" : PURPLE, fontWeight: 800 }}>Start a Room</div>
      </div>
    </div>
  );
}

// ── Mock screens ──
function ScreenBody({ screen }) {
  switch (screen) {
    case "dash":
      return (
        <div style={{ display: "flex", height: "100%" }}>
          <Rail active="Home" cta />
          <div style={{ flex: 1, padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#2f3b63", marginBottom: 8 }}>Welcome back, Shivanshu</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[["🔥", "12", "streak"], ["⏱", "42h", "focus"], ["✓", "30", "sessions"]].map(([e, v, l]) => (
                <div key={l} style={{ background: "#fff", borderRadius: 7, padding: 7, border: "1px solid #edeef7" }}>
                  <div style={{ fontSize: 11 }}>{e} <b style={{ color: "#2f3b63" }}>{v}</b></div>
                  <div style={{ fontSize: 7.5, color: "#9aa3c0" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case "createForm":
    case "createGo": {
      const go = screen === "createGo";
      return (
        <div style={{ padding: 12, height: "100%", background: "#fff" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#2f3b63", marginBottom: 8 }}>Create a room</div>
          <Field label="Room name" value="DSA Grind — evening" />
          <div style={{ fontSize: 8, color: "#6b78a0", margin: "8px 0 4px" }}>Topic</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["DSA", "System Design", "Aptitude"].map((t, k) => (
              <span key={t} className={!go && k === 0 ? "ht-hl" : ""} style={{ fontSize: 8.5, padding: "3px 8px", borderRadius: 999, border: `1px solid ${!go && k === 0 ? PURPLE : "#e0e3f0"}`, background: !go && k === 0 ? "rgba(124,58,237,0.1)" : "#fff", color: !go && k === 0 ? PURPLE : "#6b78a0", fontWeight: 700 }}>{t}</span>
            ))}
          </div>
          <div style={{ fontSize: 8, color: "#6b78a0", margin: "8px 0 4px" }}>Pomodoro length</div>
          <div style={{ height: 6, borderRadius: 999, background: "#ece8fb", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: go ? "55%" : "40%", background: PURPLE, borderRadius: 999, transition: "width 0.5s ease" }} />
          </div>
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <span className={go ? "ht-hl" : ""} style={{ fontSize: 9.5, fontWeight: 800, color: "#fff", background: go ? PURPLE : "#c3b6ee", padding: "6px 16px", borderRadius: 8 }}>Create room</span>
          </div>
        </div>
      );
    }
    case "roomLive":
    case "roomCam":
    case "roomFocus": {
      const focus = screen === "roomFocus";
      const cam = screen !== "roomCam";
      return (
        <div style={{ height: "100%", background: "linear-gradient(160deg,#1a1e33,#20233a)", padding: 10, position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: "#c7d2fe", fontWeight: 700 }}>● Live · DSA Grind</span>
            {focus && <span className="ht-hl" style={{ fontSize: 8.5, color: "#4ade80", background: "rgba(34,197,94,0.15)", padding: "2px 8px", borderRadius: 999 }}>AI Focus 86</span>}
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            {[0, 1, 2].map((k) => (
              <div key={k} style={{ width: 58, height: 40, borderRadius: 7, background: (k === 0 && cam) ? "#2b3152" : "#171a2b", border: k === 0 ? `1.5px solid ${focus ? "#22c55e" : PURPLE}` : "1px solid #333a5c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
                {k === 0 ? (cam ? "🧑‍💻" : "📷") : ["👩‍💻", "👨‍💻"][k - 1]}
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, display: "flex", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: `4px solid ${focus ? "#f59e0b" : "#3a4066"}`, borderTopColor: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fde68a" }}>{focus ? "24:1" : "25:0"}</div>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {["🎥", "🎙", "🖥"].map((e, k) => <span key={k} style={{ width: 26, height: 26, borderRadius: 7, background: (k === 0 && !cam) ? "#3a4066" : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{e}</span>)}
            </div>
          </div>
        </div>
      );
    }
    case "roomsList":
      return (
        <div style={{ display: "flex", height: "100%" }}>
          <Rail active="Rooms" />
          <div style={{ flex: 1, padding: 10 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "#2f3b63", marginBottom: 8 }}>Live & upcoming rooms</div>
            {[["Digital Logic — FSM", true], ["Python Intermediate", false], ["System Design", false]].map(([n, live], k) => (
              <div key={n} className={live ? "ht-hl" : ""} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: `1px solid ${live ? "rgba(34,197,94,0.4)" : "#edeef7"}`, borderRadius: 8, padding: "7px 9px", marginBottom: 5 }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "#2f3b63" }}>{n}</div>
                  <div style={{ fontSize: 7.5, color: live ? "#16a34a" : "#9aa3c0" }}>{live ? "● 3 studying" : "starts soon"}</div>
                </div>
                <span style={{ fontSize: 8.5, fontWeight: 800, color: "#fff", background: live ? PURPLE : "#dfe3f2", padding: "4px 12px", borderRadius: 7 }}>{live ? "Join" : "Soon"}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "cohortNew":
      return (
        <div style={{ display: "flex", height: "100%" }}>
          <Rail active="Cohort" />
          <div style={{ flex: 1, padding: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "#2f3b63", marginBottom: 8 }}>New YouTube cohort</div>
            <Field label="Playlist URL" value="youtube.com/playlist?list=…" />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <Field label="Start date" value="Today" small />
              <Field label="Cohort size" value="6" small />
            </div>
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <span className="ht-hl" style={{ fontSize: 9.5, fontWeight: 800, color: "#fff", background: "#f43f5e", padding: "6px 16px", borderRadius: 8 }}>Analyze & create</span>
            </div>
          </div>
        </div>
      );
    case "cohortPlan":
      return (
        <div style={{ padding: 12, height: "100%", background: "#fff" }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: "#2f3b63", marginBottom: 8 }}>Your 5-day plan</div>
          {[["Day 1", "Intro + Basics", "done"], ["Day 2", "Combinational Logic", "done"], ["Day 3", "Sequential Circuits", "today"], ["Day 4", "FSM & Timing", ""]].map(([d, t, s], k) => (
            <div key={d} className="ht-hl" style={{ animationDelay: `${k * 90}ms`, display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #f0f1f8" }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: s === "done" ? "#22c55e" : s === "today" ? "#f43f5e" : "#dfe3f2", color: "#fff", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>{s === "done" ? "✓" : ""}</span>
              <span style={{ fontSize: 8.5, fontWeight: 700, color: "#6b78a0", width: 30 }}>{d}</span>
              <span style={{ fontSize: 9, color: "#2f3b63" }}>{t}</span>
              {s === "today" && <span style={{ marginLeft: "auto", fontSize: 7.5, color: "#f43f5e", fontWeight: 800 }}>TODAY</span>}
            </div>
          ))}
        </div>
      );
    case "cohortQuiz":
      return (
        <div style={{ height: "100%", display: "flex", background: "#fff" }}>
          <div style={{ flex: 1, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "13px solid #f43f5e" }} />
            <span style={{ position: "absolute", bottom: 6, right: 7, fontSize: 7.5, color: "#fecdd3" }}>▶ synced 4/6</span>
          </div>
          <div style={{ width: 118, padding: 10 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: "#e11d48", marginBottom: 7 }}>🎯 Checkpoint</div>
            <div style={{ fontSize: 8.5, color: "#2f3b63", marginBottom: 7 }}>A flip-flop stores…</div>
            {["1 bit", "8 bits", "a byte"].map((o, k) => (
              <div key={o} className="ht-hl" style={{ animationDelay: `${k * 100}ms`, fontSize: 8.5, padding: "4px 7px", borderRadius: 6, border: `1px solid ${k === 0 ? "#22c55e" : "#e6e2f5"}`, color: k === 0 ? "#16a34a" : "#6b78a0", marginBottom: 4, fontWeight: k === 0 ? 700 : 500 }}>{o} {k === 0 ? "✓" : ""}</div>
            ))}
          </div>
        </div>
      );
    case "analytics":
      return (
        <div style={{ display: "flex", height: "100%" }}>
          <Rail active="Analytics" />
          <div style={{ flex: 1, padding: 10 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "#2f3b63", marginBottom: 8 }}>Your analytics</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
                {[40, 55, 48, 70, 62, 82, 96].map((h, k) => <div key={k} className="ht-bar" style={{ width: 9, height: `${h}%`, borderRadius: 3, background: "linear-gradient(#8b5cf6,#6366f1)", animationDelay: `${k * 70}ms` }} />)}
              </div>
              <div>
                <div style={{ fontSize: 15 }}>🔥 <b style={{ color: "#b45309" }}>12</b></div>
                <div style={{ fontSize: 7.5, color: "#9aa3c0" }}>day streak</div>
                <div style={{ fontSize: 13, marginTop: 4, color: "#059669", fontWeight: 800 }}>84 ↑</div>
                <div style={{ fontSize: 7.5, color: "#9aa3c0" }}>avg focus</div>
              </div>
            </div>
          </div>
        </div>
      );
    case "community":
      return (
        <div style={{ display: "flex", height: "100%" }}>
          <Rail active="Community" />
          <div style={{ flex: 1, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: "#2f3b63" }}>Community</span>
              <span className="ht-hl" style={{ fontSize: 8, fontWeight: 800, color: "#fff", background: PURPLE, padding: "3px 9px", borderRadius: 999 }}>+ Add friend</span>
            </div>
            {[["🎉", "Got the Flipkart SDE-1 offer!"], ["💡", "Sharing my DP sheet"], ["🏆", "You're #3 this week"]].map(([e, t], k) => (
              <div key={k} className="ht-hl" style={{ animationDelay: `${k * 110}ms`, background: "#fff", border: "1px solid #edeef7", borderRadius: 7, padding: "6px 8px", marginBottom: 4, fontSize: 8.5, color: "#475569" }}>
                <span style={{ fontSize: 11 }}>{e}</span> {t}
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return <div style={{ height: "100%", background: "#f4f5fb" }} />;
  }
}

function Field({ label, value, small }) {
  return (
    <div style={{ flex: small ? 1 : "none" }}>
      <div style={{ fontSize: 8, color: "#6b78a0", margin: "0 0 3px" }}>{label}</div>
      <div style={{ fontSize: 9, color: "#2f3b63", background: "#f6f7fc", border: "1px solid #e6e8f3", borderRadius: 6, padding: "5px 8px" }}>{value}</div>
    </div>
  );
}

// ── Player ──
export default function HowToWalkthrough({ open, onClose }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [ended, setEnded] = useState(false);
  const raf = useRef(0);
  const startRef = useRef(0);
  const baseRef = useRef(0);
  const step = STEPS[i];

  useEffect(() => { if (open) { setI(0); setPlaying(true); setProgress(0); setEnded(false); baseRef.current = 0; } }, [open]);

  useEffect(() => {
    if (!open || !playing || ended) return undefined;
    startRef.current = performance.now();
    const dur = STEPS[i].ms;
    const tick = (now) => {
      const elapsed = baseRef.current * dur + (now - startRef.current);
      const p = Math.min(1, elapsed / dur);
      setProgress(p);
      if (p >= 1) { baseRef.current = 0; if (i >= STEPS.length - 1) { setEnded(true); setPlaying(false); } else { setI(i + 1); setProgress(0); } return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [open, playing, i, ended]);

  const goto = useCallback((idx) => { baseRef.current = 0; setEnded(false); setProgress(0); setI(Math.max(0, Math.min(idx, STEPS.length - 1))); setPlaying(true); }, []);
  const togglePlay = () => { if (ended) { goto(0); return; } if (playing) { baseRef.current = progress; setPlaying(false); } else setPlaying(true); };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // step index within the current flow, for the header
  const flowStart = STEPS.findIndex((s) => s.flow === step.flow);
  const flowSteps = STEPS.filter((s) => s.flow === step.flow).length;

  return createPortal(
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{ position: "fixed", inset: 0, zIndex: 10050, animation: "ht-fade 0.25s ease both", background: "rgba(12,14,32,0.78)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{CSS}</style>
      <div style={{ width: "min(600px, 100%)", maxHeight: "92vh", overflowY: "auto", background: "var(--tour-surface)", borderRadius: 20, border: "1px solid var(--card-border)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)", animation: "ht-pop 0.3s ease both" }}>
        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--card-border)", background: "var(--tour-surface)" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: step.tint, animation: "ht-blink 1.8s ease-in-out infinite" }} />
            How to use PrepSy
          </span>
          <button className="ht-ctrl" onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ padding: 16 }}>
          {/* Flow + step label */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: step.tint, background: `${step.tint}16`, border: `1px solid ${step.tint}30`, padding: "3px 10px", borderRadius: 999 }}>{step.flow}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>step {i - flowStart + 1} / {flowSteps}</span>
          </div>

          {/* Mock screen (16:9) with cursor */}
          <div key={i} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 30px rgba(17,19,45,0.18)", animation: "ht-pop 0.35s ease both" }}>
            <Win><ScreenBody screen={step.screen} /></Win>
            <Cursor pos={step.cursor} />
          </div>

          {/* Caption */}
          <p style={{ margin: "13px 0 0", fontSize: 14, color: "var(--text-primary)", fontWeight: 600, lineHeight: 1.5 }}>{step.caption}</p>

          {/* Segmented progress */}
          <div style={{ display: "flex", gap: 3, marginTop: 14 }}>
            {STEPS.map((s, k) => (
              <button key={k} onClick={() => goto(k)} title={s.flow} style={{ flex: 1, height: 5, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: "var(--card-border)", position: "relative", overflow: "hidden" }}>
                <span style={{ position: "absolute", inset: 0, transformOrigin: "left", transform: `scaleX(${k < i ? 1 : k === i ? progress : 0})`, background: s.tint, transition: k === i ? "none" : "transform 0.2s ease" }} />
              </button>
            ))}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="ht-ctrl" onClick={() => goto(i - 1)} disabled={i === 0 && !ended} aria-label="Previous" style={ctrlBtn(i === 0 && !ended)}>‹</button>
              <button className="ht-ctrl" onClick={togglePlay} aria-label={ended ? "Replay" : playing ? "Pause" : "Play"} style={{ ...ctrlBtn(false), background: PURPLE, color: "#fff", width: 40, height: 40, fontSize: 16 }}>{ended ? "↻" : playing ? "❚❚" : "▶"}</button>
              <button className="ht-ctrl" onClick={() => goto(i + 1)} disabled={i >= STEPS.length - 1} aria-label="Next" style={ctrlBtn(i >= STEPS.length - 1)}>›</button>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>{i + 1} / {STEPS.length}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ctrlBtn(disabled) {
  return { width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--card-border)", background: "var(--tour-surface-2)", color: "var(--text-secondary)", fontSize: 15, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
}
