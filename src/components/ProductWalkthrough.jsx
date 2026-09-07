import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A self-playing, video-style walkthrough of the whole product. Not a recorded
// clip — an animated "player" that auto-advances through feature scenes with
// play/pause, seek, and replay. Each feature scene names AND explains every
// feature in that area (kept in sync with the /feature page).

const PURPLE = "#7c3aed";

const SCENES = [
  {
    key: "intro", ms: 3400, tint: "#7c3aed", kind: "cinematic",
    title: "Welcome to PrepSy", sub: "Study with people. Stay focused. See yourself improve — a tour of everything inside.",
  },
  {
    key: "rooms", ms: 8200, tint: "#7c3aed", visual: "rooms",
    title: "Live study rooms", sub: "The quiet accountability of a real study hall, online.",
    features: [
      { icon: "🎥", name: "Live video rooms", desc: "Join on camera, audio-only, or just observe." },
      { icon: "🤝", name: "Collaboration styles", desc: "Quiet Focus, Pair Study, Interview Practice & more." },
      { icon: "📺", name: "Screen share + audio", desc: "Share your IDE, slides, or a video with system sound." },
      { icon: "👩", name: "Female-only rooms", desc: "Verified, access-controlled at the room level." },
      { icon: "🌌", name: "Ambient study stage", desc: "Calm animated scenes + gentle nature sound." },
      { icon: "💬", name: "In-room chat & notes", desc: "Chat, share links, export notes as a PDF." },
      { icon: "🎯", name: "Goal-based discovery", desc: "DSA, System Design, HR… plus smart recommendations." },
    ],
  },
  {
    key: "focus", ms: 6600, tint: "#10b981", visual: "focus",
    title: "Focus & AI", sub: "On-device AI reads your attention — no frame ever leaves your browser.",
    features: [
      { icon: "🧠", name: "AI Focus Monitor", desc: "Gaze, phone & drowsiness detected every 5 seconds." },
      { icon: "✨", name: "AI Focus Coach", desc: "Turns your numbers into one concrete next-session tip." },
      { icon: "📊", name: "Session breakdown", desc: "0–100 score with note-taking / phone / look-away split." },
      { icon: "⏱️", name: "Synced Pomodoro", desc: "One shared timer keeps the whole room in rhythm." },
    ],
  },
  {
    key: "cohorts", ms: 7800, tint: "#f43f5e", visual: "cohorts",
    title: "YouTube co-learning cohorts", sub: "Turn a playlist into a daily cohort that learns together.",
    features: [
      { icon: "▶️", name: "Synced watch parties", desc: "Up to 6 people watch in perfect sync." },
      { icon: "📅", name: "Daily schedule", desc: "A day-by-day plan built from the playlist." },
      { icon: "🎯", name: "Checkpoint quizzes", desc: "An AI quiz scoped to each day's topic." },
      { icon: "🗣️", name: "Checkpoint discussions", desc: "Per-day threads to clear doubts in context." },
      { icon: "🏅", name: "Progress & leaderboard", desc: "% complete, streaks, on-track vs behind." },
      { icon: "🔁", name: "Resume anytime", desc: "Picks up at your next unwatched video." },
    ],
  },
  {
    key: "analytics", ms: 6600, tint: "#6366f1", visual: "analytics",
    title: "Progress & accountability", sub: "The numbers that prove you're actually improving.",
    features: [
      { icon: "📈", name: "Analytics dashboard", desc: "Streak, focus heatmap, AI score trend, distractions." },
      { icon: "🔥", name: "Streaks + rescue email", desc: "A gentle nudge before you lose your streak." },
      { icon: "🏆", name: "Leaderboards", desc: "Rank by real study time — friends and global." },
      { icon: "🧩", name: "Concept mastery", desc: "See what you've mastered vs. what needs review." },
    ],
  },
  {
    key: "community", ms: 5600, tint: "#0ea5e9", visual: "community",
    title: "Community", sub: "Real peers, real momentum — the people who keep you coming back.",
    features: [
      { icon: "👥", name: "Community feed", desc: "Post wins, share resources, ask questions." },
      { icon: "✉️", name: "Friends & messaging", desc: "Add friends and DM them in real time." },
      { icon: "🧭", name: "Find your people", desc: "Matched to peers & rooms by your goals." },
    ],
  },
  {
    key: "outro", ms: 3800, tint: "#7c3aed", kind: "cinematic",
    title: "That's PrepSy — end to end", sub: "Your first focused session is a minute away. Bring a friend and start tonight.",
  },
];

const CSS = `
  @keyframes pw-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pw-pop { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  @keyframes pw-scan { 0% { top: 12%; opacity: 0.9; } 85% { top: 76%; opacity: 0.55; } 100% { top: 12%; opacity: 0; } }
  @keyframes pw-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.28; } }
  @keyframes pw-rise { from { transform: scaleY(0.15); opacity: 0.4; } to { transform: scaleY(1); opacity: 1; } }
  @keyframes pw-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes pw-item { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
  .pw-ctrl { transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease; }
  .pw-ctrl:hover { transform: translateY(-1px); }
  .pw-bar { transform-origin: bottom; animation: pw-rise 0.6s ease both; }
  .pw-feat { animation: pw-item 0.5s ease both; }
`;

// ── Compact per-category visuals ─────────────────────────────────────────────
function Visual({ kind }) {
  const box = { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, overflow: "hidden" };
  switch (kind) {
    case "rooms":
      return (
        <div style={{ ...box, background: "linear-gradient(160deg,#ede9fe,#eef2ff)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ width: 74, height: 48, borderRadius: 9, background: "#1f2440", border: `2px solid ${PURPLE}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🧑‍💻</div>
            {["👩‍💻", "👨‍💻", "🧑‍🎓"].map((e, k) => (
              <div key={k} style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "2px solid #c7b6f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, animation: `pw-float ${2.4 + k * 0.4}s ease-in-out infinite` }}>{e}</div>
            ))}
          </div>
        </div>
      );
    case "focus":
      return (
        <div style={{ ...box, background: "linear-gradient(160deg,#06251c,#0b3b2b)", position: "relative" }}>
          <div style={{ position: "relative", width: 70, height: 84 }}>
            <div style={{ position: "absolute", inset: 0, margin: "auto", width: 54, height: 68, border: "2px solid rgba(34,197,94,0.8)", borderRadius: "50% 50% 44% 44%", boxShadow: "0 0 14px rgba(34,197,94,0.3)" }} />
            <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(34,197,94,0.9),transparent)", animation: "pw-scan 2.4s ease-in-out infinite" }} />
          </div>
          <div style={{ marginLeft: 12, width: 56, height: 56, borderRadius: "50%", background: "conic-gradient(#22c55e 0% 86%, rgba(255,255,255,0.15) 86% 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#06251c", color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>86</div>
          </div>
        </div>
      );
    case "cohorts":
      return (
        <div style={{ ...box, background: "linear-gradient(160deg,#2a0f1a,#4a1526)" }}>
          <div style={{ width: 96, height: 58, borderRadius: 9, background: "#111", border: "1px solid rgba(244,63,94,0.5)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 0, height: 0, borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderLeft: "15px solid #f43f5e", marginLeft: 4 }} />
            <span style={{ position: "absolute", bottom: 4, right: 5, fontSize: 8, color: "#fecdd3", background: "rgba(0,0,0,0.5)", padding: "1px 5px", borderRadius: 5 }}>▶ 4/6</span>
          </div>
        </div>
      );
    case "analytics":
      return (
        <div style={{ ...box, background: "linear-gradient(160deg,#ede9fe,#eef2ff)" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 72 }}>
            {[40, 55, 48, 70, 62, 82, 96].map((h, k) => (
              <div key={k} className="pw-bar" style={{ width: 10, height: `${h}%`, borderRadius: 3, background: "linear-gradient(#8b5cf6,#6366f1)", animationDelay: `${k * 70}ms` }} />
            ))}
          </div>
          <div style={{ marginLeft: 10, textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>🔥</div>
            <b style={{ color: "#b45309", fontSize: 15 }}>12</b>
          </div>
        </div>
      );
    case "community":
      return (
        <div style={{ ...box, background: "linear-gradient(160deg,#ede9fe,#eef2ff)", flexDirection: "column", gap: 6, padding: 10 }}>
          {["🎉", "💡", "🏆"].map((e, k) => (
            <div key={k} className="pw-feat" style={{ animationDelay: `${k * 150}ms`, width: "100%", background: "#fff", borderRadius: 8, padding: "6px 9px", fontSize: 11, color: "#475569", boxShadow: "0 3px 9px rgba(100,116,180,0.1)" }}>
              <span style={{ fontSize: 13 }}>{e}</span> {["Got the offer!", "Shared DP sheet", "#3 this week"][k]}
            </div>
          ))}
        </div>
      );
    default:
      return <div style={{ ...box, background: "linear-gradient(160deg,#ede9fe,#eef2ff)" }} />;
  }
}

function Cinematic({ scene }) {
  const intro = scene.key === "intro";
  return (
    <div style={{
      width: "100%", aspectRatio: "16 / 9", borderRadius: 14, overflow: "hidden",
      background: intro ? "linear-gradient(140deg,#2e2350,#4a3882 55%,#7c3aed)" : "linear-gradient(140deg,#2e2350,#7c3aed)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center", color: "#fff", animation: "pw-pop 0.6s ease both" }}>
        {intro ? (
          <>
            <div style={{ width: 62, height: 62, borderRadius: 18, margin: "0 auto 12px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, fontFamily: "Georgia, serif", animation: "pw-float 3s ease-in-out infinite" }}>PS</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Georgia, serif" }}>PrepSy</div>
            <div style={{ fontSize: 12, opacity: 0.82, marginTop: 4 }}>Study right, not just more.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🚀</div>
            <div style={{ fontSize: 19, fontWeight: 800, fontFamily: "Georgia, serif" }}>Ready to prep smarter?</div>
            <div style={{ display: "inline-block", marginTop: 12, background: "#fff", color: PURPLE, padding: "8px 20px", borderRadius: 999, fontSize: 12, fontWeight: 800, boxShadow: "0 8px 20px rgba(0,0,0,0.2)" }}>Start Prepping Free →</div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Player ─────────────────────────────────────────────────────────────────────
export default function ProductWalkthrough({ open, onClose }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [ended, setEnded] = useState(false);
  const raf = useRef(0);
  const startRef = useRef(0);
  const baseRef = useRef(0);

  const scene = SCENES[i];

  useEffect(() => {
    if (open) { setI(0); setPlaying(true); setProgress(0); setEnded(false); baseRef.current = 0; }
  }, [open]);

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
    baseRef.current = 0; setEnded(false); setProgress(0);
    setI(Math.max(0, Math.min(idx, SCENES.length - 1))); setPlaying(true);
  }, []);

  const togglePlay = () => {
    if (ended) { goto(0); return; }
    if (playing) { baseRef.current = progress; setPlaying(false); } else { setPlaying(true); }
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const cinematic = scene.kind === "cinematic";

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
        width: "min(640px, 100%)", maxHeight: "92vh", overflowY: "auto",
        background: "var(--tour-surface)", borderRadius: 20,
        border: "1px solid var(--card-border)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        animation: "pw-pop 0.3s ease both",
      }}>
        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--card-border)", background: "var(--tour-surface)" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pw-blink 1.8s ease-in-out infinite" }} />
            Product walkthrough
          </span>
          <button className="pw-ctrl" onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ padding: 16 }}>
          {/* Scene title */}
          <div key={`h-${scene.key}`} style={{ animation: "pw-pop 0.4s ease both", marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.25 }}>{scene.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{scene.sub}</p>
          </div>

          {/* Stage */}
          {cinematic ? (
            <div key={scene.key}><Cinematic scene={scene} /></div>
          ) : (
            <div key={scene.key} style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 168px", minWidth: 140, minHeight: 150 }}>
                <Visual kind={scene.visual} />
              </div>
              <ul style={{ flex: 1, minWidth: 210, listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                {scene.features.map((f, k) => (
                  <li key={f.name} className="pw-feat" style={{ animationDelay: `${120 + k * 130}ms`, display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: `${scene.tint}16`, border: `1px solid ${scene.tint}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{f.icon}</span>
                    <span style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 700 }}>{f.name}</b>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.4 }}>{f.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Segmented progress bar (click to seek) */}
          <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
            {SCENES.map((s, k) => (
              <button key={s.key} onClick={() => goto(k)} title={s.title} style={{ flex: 1, height: 5, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: "var(--card-border)", position: "relative", overflow: "hidden" }}>
                <span style={{ position: "absolute", inset: 0, transformOrigin: "left", transform: `scaleX(${k < i ? 1 : k === i ? progress : 0})`, background: scene.tint, transition: k === i ? "none" : "transform 0.2s ease" }} />
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
