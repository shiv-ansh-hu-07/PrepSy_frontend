import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWindowWidth } from "../hooks/useBreakpoint";

// ─── Theme tokens (matches Home.jsx / feature.jsx marketing surface) ────────────
const T = {
  bg: "radial-gradient(ellipse at 60% 0%, var(--accent-soft) 0%, var(--card-bg) 55%, var(--card-bg) 100%)",
  purple: "#7c3aed",
  border: "var(--card-border)",
  textDark: "var(--text-primary)",
  textMid: "var(--text-secondary)",
  textLight: "#6b7a99",
};

// ─── The core loop ──────────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: "🎫", accent: "#7c3aed", title: "Get in — in seconds",
    desc: "Sign up with email or Google, or jump straight in as a guest to look around. No setup, no credit card.",
    chip: "Guest mode available",
  },
  {
    icon: "🎯", accent: "#0ea5e9", title: "Set what you're prepping for",
    desc: "Tell PrepSy your goals, skills, and languages. It surfaces the rooms and cohorts that match your exact level.",
    chip: "DSA · System Design · Aptitude · more",
  },
  {
    icon: "🎥", accent: "#8b5cf6", title: "Join or host a room",
    desc: "Browse live rooms by goal or collaboration style — or start your own in one click. Join with camera, audio-only, or just observe.",
    chip: "Quiet Focus · Pair Study · Interview Practice",
  },
  {
    icon: "⏱️", accent: "#f59e0b", title: "Study in sync",
    desc: "A shared Pomodoro keeps the whole room in one rhythm. Chat, share your screen and audio, and keep notes you can export as a PDF.",
    chip: "Synced timer for everyone",
  },
  {
    icon: "🧠", accent: "#10b981", title: "Let the AI watch your focus",
    desc: "Switch on the on-device monitor and it reads your attention every 5 seconds — telling note-taking apart from real distraction. No frame ever leaves your browser.",
    chip: "Powered by Google MediaPipe · on-device",
  },
  {
    icon: "📈", accent: "#6366f1", title: "See it compound",
    desc: "Get a session focus score and AI coaching, build a daily streak, and watch your analytics and leaderboard rank climb as you show up.",
    chip: "Score · streak · heatmap · coaching",
  },
];

// ─── Two ways to study ───────────────────────────────────────────────────────────
const MODES = [
  {
    icon: "🎥", accent: "#7c3aed", title: "Live Study Rooms",
    desc: "Drop into a focus room any time. Solo-friendly, peer-powered, camera optional — the quiet accountability of a real study hall, online.",
    points: ["Study alongside peers chasing the same goal", "Screen share, chat, and synced Pomodoro built in", "AI focus scoring per session"],
  },
  {
    icon: "▶️", accent: "#f43f5e", title: "YouTube Co-Learning Cohorts",
    desc: "Turn any playlist into a daily cohort (up to 6) that watches in perfect sync and pauses to check understanding at every stop.",
    points: ["A shared day-by-day schedule keeps everyone on pace", "AI checkpoint quiz + discussion at each stop", "Per-member progress, streaks, and a leaderboard"],
  },
];

// ─── Animations + interactions ──────────────────────────────────────────────────
const CSS = `
  @keyframes hiw-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
  @keyframes hiw-slide-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }

  .hiw-card {
    transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease !important;
  }
  .hiw-card:hover {
    transform: translateY(-5px) !important;
    box-shadow: 0 20px 48px rgba(100,116,180,0.16) !important;
  }
  .hiw-card:hover .hiw-accent-bar { opacity: 1 !important; }
  .hiw-card:hover .hiw-icon { transform: scale(1.08) rotate(-4deg); }
  .hiw-icon { transition: transform 0.24s ease; }
  .hiw-dot { transition: transform 0.24s ease, box-shadow 0.24s ease; }
  .hiw-row:hover .hiw-dot { transform: scale(1.1); box-shadow: 0 8px 22px rgba(124,58,237,0.32); }

  .hiw-btn { transition: background 0.2s, box-shadow 0.2s, transform 0.2s !important; }
  .hiw-btn-purple:hover { background: #6f3bd6 !important; box-shadow: 0 14px 34px rgba(124,58,237,0.48) !important; transform: translateY(-2px); }
  .hiw-btn-outline:hover { background: rgba(124,58,237,0.07) !important; border-color: rgba(124,58,237,0.42) !important; transform: translateY(-2px); }
`;

function SectionLabel({ text, color = "#7c3aed" }) {
  return (
    <span style={{
      display: "inline-block", padding: "4px 14px", borderRadius: "999px",
      background: `${color}12`, border: `1px solid ${color}30`,
      fontSize: "12px", fontWeight: 700, color, letterSpacing: "0.1em", textTransform: "uppercase",
    }}>
      {text}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HowItWorks() {
  const width = useWindowWidth();
  const sm = width < 900;
  const px = sm ? "20px" : "32px";
  const [visible, setVisible] = useState(new Set());

  // Marketing surface is always light (same as Home.jsx); restore theme on unmount.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "light");
    return () => {
      root.setAttribute("data-theme", localStorage.getItem("theme") === "dark" ? "dark" : (prev || "light"));
    };
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll("[data-s]");
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible((prev) => new Set([...prev, e.target.dataset.s]));
        });
      },
      { threshold: 0.06 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const fi = (key, delay = 0) => ({
    opacity: visible.has(key) ? 1 : 0,
    transform: visible.has(key) ? "translateY(0)" : "translateY(24px)",
    transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
  });

  return (
    <main style={{ background: T.bg, fontFamily: "'Inter', system-ui, sans-serif", color: T.textDark, overflowX: "hidden" }}>
      <style>{CSS}</style>

      {/* ══════════════ HERO ══════════════ */}
      <section style={{
        maxWidth: "900px", margin: "0 auto",
        padding: sm ? "72px 20px 44px" : "104px 32px 60px",
        textAlign: "center",
      }}>
        <div style={{ animation: "hiw-slide-up 0.7s ease both" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            padding: "5px 16px 5px 10px", borderRadius: "999px",
            background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)",
            fontSize: "13px", fontWeight: 500, color: T.purple, marginBottom: "24px",
          }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "hiw-blink 2s ease-in-out infinite" }} />
            From landing to focused in under a minute
          </div>

          <h1 style={{
            fontSize: sm ? "34px" : "52px", fontWeight: 800, lineHeight: 1.14,
            letterSpacing: "-0.03em", color: T.textDark, margin: "0 0 18px",
            fontFamily: "Georgia, serif",
          }}>
            How{" "}
            <span style={{
              background: "linear-gradient(130deg, #7c3aed 0%, #6366f1 48%, #0ea5e9 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              PrepSy
            </span>{" "}
            works.
          </h1>

          <p style={{ fontSize: sm ? "16px" : "18px", color: T.textMid, lineHeight: 1.68, maxWidth: "540px", margin: "0 auto" }}>
            Six steps from signing up to a streak you can see. Study alone-but-together in live rooms, or learn a playlist in sync with a cohort.
          </p>
        </div>
      </section>

      {/* ══════════════ THE CORE LOOP — TIMELINE ══════════════ */}
      <section data-s="loop-head" style={{ maxWidth: "820px", margin: "0 auto", padding: `0 ${px} 8px` }}>
        <div style={{ textAlign: "center", marginBottom: "36px", ...fi("loop-head") }}>
          <SectionLabel text="The core loop" />
        </div>
      </section>

      <section style={{ maxWidth: "820px", margin: "0 auto", padding: `0 ${px} ${sm ? "56px" : "80px"}` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: sm ? 16 : 22 }}>
          {STEPS.map((s, i) => {
            const last = i === STEPS.length - 1;
            return (
              <div key={s.title} data-s={`step-${i}`} className="hiw-row" style={{
                display: "flex", gap: sm ? 14 : 20, alignItems: "stretch", ...fi(`step-${i}`, 40),
              }}>
                {/* Rail: numbered dot + connector line */}
                <div style={{ position: "relative", flexShrink: 0, width: sm ? 44 : 52, display: "flex", justifyContent: "center" }}>
                  <div className="hiw-dot" style={{
                    width: sm ? 44 : 52, height: sm ? 44 : 52, borderRadius: "50%",
                    background: `linear-gradient(140deg, ${s.accent} 0%, ${s.accent}cc 100%)`,
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: sm ? 16 : 19, fontWeight: 800, fontFamily: "Georgia, serif",
                    boxShadow: `0 6px 18px ${s.accent}44`, zIndex: 1,
                  }}>
                    {i + 1}
                  </div>
                  {!last && (
                    <div style={{
                      position: "absolute", top: sm ? 44 : 52, bottom: sm ? -16 : -22,
                      left: "50%", width: 2, transform: "translateX(-50%)",
                      background: `linear-gradient(${s.accent}55, ${T.border})`,
                    }} />
                  )}
                </div>

                {/* Card */}
                <div className="hiw-card" style={{
                  flex: 1, background: "var(--card-bg)", borderRadius: 20, padding: sm ? "18px 18px" : "22px 24px",
                  border: `1px solid ${T.border}`, boxShadow: "0 4px 20px rgba(100,116,180,0.07)",
                  position: "relative", overflow: "hidden",
                }}>
                  <div className="hiw-accent-bar" style={{
                    position: "absolute", top: 0, left: 0, bottom: 0, width: 3,
                    background: s.accent, opacity: 0.45, transition: "opacity 0.2s",
                  }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 9 }}>
                    <div className="hiw-icon" style={{
                      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                      background: `${s.accent}14`, border: `1px solid ${s.accent}28`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19,
                    }}>{s.icon}</div>
                    <h3 style={{ fontSize: sm ? 16 : 18, fontWeight: 800, color: T.textDark, margin: 0, lineHeight: 1.25 }}>
                      {s.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: 13.5, color: T.textMid, lineHeight: 1.66, margin: 0 }}>
                    {s.desc}
                  </p>
                  {s.chip && (
                    <span style={{
                      display: "inline-block", marginTop: 12, fontSize: 11, fontWeight: 600,
                      color: s.accent, background: `${s.accent}12`, border: `1px solid ${s.accent}26`,
                      padding: "3px 10px", borderRadius: 999,
                    }}>
                      {s.chip}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════ TWO WAYS TO STUDY ══════════════ */}
      <section data-s="modes" style={{ maxWidth: "1000px", margin: "0 auto", padding: `0 ${px} ${sm ? "56px" : "80px"}` }}>
        <div style={{ textAlign: "center", marginBottom: "34px", ...fi("modes") }}>
          <SectionLabel text="Two ways to study" color="#0ea5e9" />
          <h2 style={{
            fontSize: sm ? "24px" : "32px", fontWeight: 800, letterSpacing: "-0.025em",
            color: T.textDark, margin: "14px 0 10px", fontFamily: "Georgia, serif", lineHeight: 1.2,
          }}>
            Pick your rhythm.
          </h2>
          <p style={{ fontSize: "15px", color: T.textMid, maxWidth: "540px", margin: "0 auto" }}>
            The same focus loop powers both — study on your own schedule, or move through a playlist together.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: sm ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: 18, alignItems: "stretch" }}>
          {MODES.map((m, i) => (
            <div key={m.title} data-s={`mode-${i}`} className="hiw-card" style={{
              background: "var(--card-bg)", borderRadius: 24, padding: sm ? "26px 22px" : "32px 30px",
              border: `1px solid ${T.border}`, boxShadow: "0 6px 28px rgba(100,116,180,0.09)",
              position: "relative", overflow: "hidden", display: "flex", flexDirection: "column",
              ...fi(`mode-${i}`, i * 90),
            }}>
              <div className="hiw-accent-bar" style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: m.accent, opacity: 0.6, transition: "opacity 0.2s",
              }} />
              <div style={{
                position: "absolute", top: -40, right: -40, width: 170, height: 170, borderRadius: "50%",
                background: `radial-gradient(circle, ${m.accent}14 0%, transparent 70%)`, pointerEvents: "none",
              }} />
              <div className="hiw-icon" style={{
                width: 48, height: 48, borderRadius: 14, marginBottom: 15,
                background: `${m.accent}14`, border: `1px solid ${m.accent}28`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
              }}>{m.icon}</div>
              <h3 style={{ fontSize: sm ? 18 : 20, fontWeight: 800, color: T.textDark, margin: "0 0 10px", lineHeight: 1.25 }}>
                {m.title}
              </h3>
              <p style={{ fontSize: 14, color: T.textMid, lineHeight: 1.7, margin: "0 0 16px" }}>
                {m.desc}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: "auto" }}>
                {m.points.map((p) => (
                  <div key={p} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: T.textLight }}>
                    <span style={{ color: m.accent, fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {p}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ CTA ══════════════ */}
      <section data-s="cta" style={{ maxWidth: "860px", margin: "0 auto", padding: `0 ${px} ${sm ? "72px" : "100px"}` }}>
        <div style={{
          background: "linear-gradient(140deg, var(--text-primary) 0%, #7c3aed 100%)",
          borderRadius: "28px", padding: sm ? "48px 26px" : "64px 60px",
          textAlign: "center", boxShadow: "0 28px 72px rgba(124,58,237,0.24)",
          ...fi("cta"),
        }}>
          <h2 style={{ fontSize: sm ? "26px" : "38px", fontWeight: 800, color: "#fff", margin: "0 0 14px", lineHeight: 1.18, fontFamily: "Georgia, serif" }}>
            Ready to try the loop?
          </h2>
          <p style={{ fontSize: "16px", color: "var(--card-bg)", lineHeight: 1.72, maxWidth: "440px", margin: "0 auto 32px" }}>
            Your first focused session is a minute away. Bring a friend and study together tonight.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <Link to="/login" className="hiw-btn" style={{
              background: "var(--card-bg)", color: T.purple, padding: "15px 40px", borderRadius: "999px",
              fontSize: "15px", fontWeight: 700, textDecoration: "none",
              boxShadow: "0 8px 24px rgba(0,0,0,0.14)", display: "inline-block",
            }}>
              Start Prepping Free →
            </Link>
            <Link to="/feature" className="hiw-btn hiw-btn-outline" style={{
              background: "transparent", color: "#fff", padding: "15px 32px", borderRadius: "999px",
              fontSize: "15px", fontWeight: 600, textDecoration: "none",
              border: "1.5px solid rgba(255,255,255,0.45)", display: "inline-block",
            }}>
              Explore features
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
