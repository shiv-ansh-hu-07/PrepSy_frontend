import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWindowWidth } from "../hooks/useBreakpoint";

// ─── Theme tokens (matches Home.jsx marketing surface) ──────────────────────────
const T = {
  bg: "radial-gradient(ellipse at 60% 0%, var(--accent-soft) 0%, var(--card-bg) 55%, var(--card-bg) 100%)",
  purple: "#7c3aed",
  border: "var(--card-border)",
  textDark: "var(--text-primary)",
  textMid: "var(--text-secondary)",
  textLight: "#6b7a99",
};

// ─── Feature catalogue — current, shipped features grouped by area ───────────────
const CATEGORIES = [
  {
    key: "rooms",
    label: "Study Rooms",
    title: "Rooms that feel like being there.",
    blurb: "Live video rooms with the quiet accountability of a real study hall — join with peers chasing the same goal.",
    features: [
      {
        icon: "🎥", title: "Live Study Rooms", tag: "Core", accent: "#7c3aed",
        desc: "Real-time video rooms with peers targeting the same role or exam. Join with camera, audio-only, or just observe.",
        points: ["LiveKit video + audio", "Filter by goal, language, or vibe"],
      },
      {
        icon: "🤝", title: "Collaboration Styles", tag: "UX", accent: "#8b5cf6",
        desc: "Set the room's mode before anyone joins so expectations are clear from the first second.",
        points: ["Quiet Focus · Discussion · Pair Study", "Project-Based · Interview Practice"],
      },
      {
        icon: "📺", title: "Screen Share + Audio", tag: "Built-in", accent: "#0ea5e9",
        desc: "Share your screen and system audio — IDE, slides, a video — so the room sees and hears exactly what you do.",
      },
      {
        icon: "👩", title: "Female-Only Rooms", tag: "Live ✓", accent: "#ec4899",
        desc: "Safe, verified rooms exclusively for women. Entry is access-controlled at the room level — not a loose toggle.",
      },
      {
        icon: "🌌", title: "Ambient Study Stage", tag: "New ✦", accent: "#6366f1",
        desc: "Calm animated scenes and procedural nature sound turn an empty room into a place you want to sit in.",
        points: ["Rainy night · starry · lo-fi dusk", "Gentle sound, off by default"],
      },
      {
        icon: "💬", title: "In-Room Chat & Notes", tag: "Collaboration", accent: "#14b8a6",
        desc: "Chat while you study, drop links, and keep notes you can download as a formatted PDF — or upload your own.",
      },
      {
        icon: "🎯", title: "Goal-Based Discovery", tag: "Smart", accent: "#f59e0b",
        desc: "Rooms tagged with DSA, System Design, HR, Aptitude and more, plus recommendations from your study signals.",
      },
    ],
  },
  {
    key: "focus",
    label: "Focus & AI",
    title: "Focus you can actually see.",
    blurb: "On-device AI reads your attention and turns raw sessions into coaching — never a video leaves your browser.",
    features: [
      {
        icon: "🧠", title: "AI Focus Monitor", tag: "New ✦", accent: "#10b981",
        desc: "Your camera samples attention every 5 seconds using Google MediaPipe gaze & face landmarks — telling note-taking apart from real distraction.",
        points: ["Detects phone, look-away, drowsiness", "On-device — frames never leave you"],
      },
      {
        icon: "✨", title: "AI Focus Coach", tag: "Game changer", accent: "#7c3aed",
        desc: "After a session, AI turns your numbers into fair, specific coaching — a headline, what happened, and one concrete tip for next time.",
      },
      {
        icon: "📊", title: "Session Focus Breakdown", tag: "Insights", accent: "#6366f1",
        desc: "Every session scored 0–100 with a typed breakdown — note-taking, phone, look-away, off-screen — plus your longest deep-focus streak.",
      },
      {
        icon: "⏱️", title: "Synced Pomodoro", tag: "Synced", accent: "#f59e0b",
        desc: "Focus blocks auto-calculated from the room's duration and kept in sync for everyone, so the whole group works in one rhythm.",
      },
    ],
  },
  {
    key: "cohorts",
    label: "YouTube Co-Learning",
    title: "Learn a playlist, together, on schedule.",
    blurb: "Turn any YouTube playlist into a daily cohort that watches in sync and checks understanding at every stop.",
    features: [
      {
        icon: "▶️", title: "Synced Watch Parties", tag: "Wedge", accent: "#f43f5e",
        desc: "Small cohorts (up to 6) watch the playlist together in perfect sync — join mid-session and you land exactly where everyone is.",
      },
      {
        icon: "📅", title: "Daily Cohort Schedule", tag: "Routine", accent: "#0ea5e9",
        desc: "A shared recurring room and a day-by-day plan built from the playlist. Show up because everyone else does.",
      },
      {
        icon: "🎯", title: "Checkpoint Quizzes", tag: "AI", accent: "#10b981",
        desc: "Each day ends with an AI quiz scoped to that day's topic — the pause-and-check moment that makes watching actually stick.",
      },
      {
        icon: "🗣️", title: "Checkpoint Discussions", tag: "Social", accent: "#8b5cf6",
        desc: "Per-day discussion threads sit right next to the quiz, separate from the general board, so questions stay in context.",
      },
      {
        icon: "🏅", title: "Cohort Progress & Leaderboard", tag: "Accountability", accent: "#f59e0b",
        desc: "Per-member percent complete, current streak, on-track vs behind, average checkpoint score — and a cohort leaderboard.",
      },
      {
        icon: "🔁", title: "Resume Where You Left Off", tag: "Continuity", accent: "#6366f1",
        desc: "Rooms remember the current video and position, and personal progress tracks the videos you've actually finished.",
      },
    ],
  },
  {
    key: "progress",
    label: "Progress & Accountability",
    title: "Show up daily. Watch it compound.",
    blurb: "The numbers that prove you're improving — and the nudges that keep the streak alive.",
    features: [
      {
        icon: "📈", title: "Analytics Dashboard", tag: "Insights", accent: "#7c3aed",
        desc: "Streak, focus heatmap, peak-hour chart, AI score trend, and distraction breakdown — per session and over your lifetime.",
      },
      {
        icon: "🔥", title: "Streaks + Rescue Email", tag: "Habit", accent: "#f43f5e",
        desc: "A daily study streak with a gentle rescue reminder before you lose it — pressure-free, never guilt-trippy.",
      },
      {
        icon: "🏆", title: "Leaderboards", tag: "Motivation", accent: "#f59e0b",
        desc: "Rank by real study time across friends and globally — every room type counts, including YouTube cohorts.",
      },
      {
        icon: "🧩", title: "Concept Mastery", tag: "Smart", accent: "#14b8a6",
        desc: "Quiz attempts roll up into a picture of which concepts you've mastered and which still need another pass.",
      },
    ],
  },
  {
    key: "community",
    label: "Community",
    title: "You're not prepping alone.",
    blurb: "Real peers, real momentum — the people who keep you coming back.",
    features: [
      {
        icon: "👥", title: "Community Feed", tag: "Community", accent: "#f43f5e",
        desc: "Post wins, share resources, ask questions — with image attachments — among people serious about their next role.",
      },
      {
        icon: "✉️", title: "Friends & Messaging", tag: "Social", accent: "#0ea5e9",
        desc: "Add friends, DM them in real time, and see who's studying so you can jump into a room together.",
      },
      {
        icon: "🧭", title: "Find Your People", tag: "Discovery", accent: "#8b5cf6",
        desc: "Get matched to peers and rooms by your goals and study signals, so the right room is never more than a tap away.",
      },
    ],
  },
];

// ─── Animations + interactions ──────────────────────────────────────────────────
const CSS = `
  @keyframes feat-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
  @keyframes feat-slide-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes feat-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(2deg); } }

  .fp-card {
    transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease !important;
  }
  .fp-card:hover {
    transform: translateY(-6px) !important;
    box-shadow: 0 20px 48px rgba(100,116,180,0.16) !important;
  }
  .fp-card:hover .fp-accent-bar { opacity: 1 !important; }
  .fp-card:hover .fp-icon { transform: scale(1.08) rotate(-4deg); }
  .fp-icon { transition: transform 0.24s ease; }

  .fp-btn { transition: background 0.2s, box-shadow 0.2s, transform 0.2s !important; }
  .fp-btn-purple:hover { background: #6f3bd6 !important; box-shadow: 0 14px 34px rgba(124,58,237,0.48) !important; transform: translateY(-2px); }
  .fp-btn-outline:hover { background: rgba(124,58,237,0.07) !important; border-color: rgba(124,58,237,0.42) !important; transform: translateY(-2px); }
`;

// ─── Small pieces ────────────────────────────────────────────────────────────────
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

function FeatureCard({ feature, style }) {
  return (
    <div className="fp-card" style={{
      background: "var(--card-bg)", borderRadius: 22, padding: "24px 22px",
      border: `1px solid ${T.border}`,
      boxShadow: "0 4px 20px rgba(100,116,180,0.07)",
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", height: "100%",
      ...style,
    }}>
      <div className="fp-accent-bar" style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: feature.accent, borderRadius: "22px 22px 0 0", opacity: 0.5,
        transition: "opacity 0.2s",
      }} />
      {/* soft corner glow */}
      <div style={{
        position: "absolute", top: -36, right: -36, width: 150, height: 150, borderRadius: "50%",
        background: `radial-gradient(circle, ${feature.accent}12 0%, transparent 70%)`, pointerEvents: "none",
      }} />

      <div className="fp-icon" style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${feature.accent}14`, border: `1px solid ${feature.accent}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 21, marginBottom: 14, flexShrink: 0,
      }}>
        {feature.icon}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 800, color: T.textDark, margin: 0, lineHeight: 1.25 }}>
          {feature.title}
        </h3>
        <span style={{
          fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
          background: `${feature.accent}16`, color: feature.accent,
          letterSpacing: "0.05em", whiteSpace: "nowrap",
        }}>{feature.tag}</span>
      </div>

      <p style={{ fontSize: 13, color: T.textMid, lineHeight: 1.65, margin: 0 }}>
        {feature.desc}
      </p>

      {feature.points && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
          {feature.points.map((p) => (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textLight }}>
              <span style={{ color: feature.accent, fontSize: 12, flexShrink: 0 }}>✓</span>
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FeaturesPage() {
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

  // Scroll-triggered fade-in.
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

  const totalFeatures = CATEGORIES.reduce((n, c) => n + c.features.length, 0);

  return (
    <main style={{ background: T.bg, fontFamily: "'Inter', system-ui, sans-serif", color: T.textDark, overflowX: "hidden" }}>
      <style>{CSS}</style>

      {/* ══════════════ HERO ══════════════ */}
      <section style={{
        maxWidth: "980px", margin: "0 auto",
        padding: sm ? "72px 20px 40px" : "104px 32px 56px",
        textAlign: "center", position: "relative",
      }}>
        {!sm && (
          <div style={{ position: "absolute", top: "88px", right: "6%", animation: "feat-float 6s ease-in-out infinite", zIndex: 0 }}>
            <div style={{ fontSize: 30, opacity: 0.5 }}>✨</div>
          </div>
        )}
        <div style={{ position: "relative", zIndex: 1, animation: "feat-slide-up 0.7s ease both" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            padding: "5px 16px 5px 10px", borderRadius: "999px",
            background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)",
            fontSize: "13px", fontWeight: 500, color: T.purple, marginBottom: "24px",
          }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "feat-blink 2s ease-in-out infinite" }} />
            {totalFeatures}+ features live today
          </div>

          <h1 style={{
            fontSize: sm ? "34px" : "52px", fontWeight: 800, lineHeight: 1.14,
            letterSpacing: "-0.03em", color: T.textDark, margin: "0 0 18px",
            fontFamily: "Georgia, serif",
          }}>
            Everything inside{" "}
            <span style={{
              background: "linear-gradient(130deg, #7c3aed 0%, #6366f1 48%, #0ea5e9 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              PrepSy.
            </span>
          </h1>

          <p style={{ fontSize: sm ? "16px" : "18px", color: T.textMid, lineHeight: 1.68, maxWidth: "560px", margin: "0 auto 34px" }}>
            Live rooms, on-device focus AI, YouTube co-learning cohorts, deep analytics, and a real community — every piece purpose-built for prep, not a repurposed productivity app.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
            <Link to="/login" className="fp-btn fp-btn-purple" style={{
              background: T.purple, color: "#fff", padding: "13px 32px", borderRadius: "999px",
              fontSize: "15px", fontWeight: 600, textDecoration: "none",
              boxShadow: "0 8px 26px rgba(124,58,237,0.36)", display: "inline-block",
            }}>
              Start Prepping Free →
            </Link>
            <Link to="/HowItWorks" className="fp-btn fp-btn-outline" style={{
              background: "transparent", color: T.purple, padding: "13px 26px", borderRadius: "999px",
              fontSize: "15px", fontWeight: 600, textDecoration: "none",
              border: "1.5px solid rgba(124,58,237,0.28)", display: "inline-block",
            }}>
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════ CATEGORY SECTIONS ══════════════ */}
      {CATEGORIES.map((cat) => (
        <section key={cat.key} data-s={cat.key} style={{ maxWidth: "1140px", margin: "0 auto", padding: `0 ${px} ${sm ? "56px" : "76px"}` }}>
          <div style={{ marginBottom: "30px", ...fi(cat.key) }}>
            <SectionLabel text={cat.label} />
            <h2 style={{
              fontSize: sm ? "24px" : "32px", fontWeight: 800, letterSpacing: "-0.025em",
              color: T.textDark, margin: "14px 0 10px", fontFamily: "Georgia, serif", lineHeight: 1.2,
            }}>
              {cat.title}
            </h2>
            <p style={{ fontSize: "15px", color: T.textMid, lineHeight: 1.7, maxWidth: "620px", margin: 0 }}>
              {cat.blurb}
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: sm ? "minmax(0, 1fr)" : "repeat(3, minmax(0, 1fr))",
            gap: 18, alignItems: "stretch",
          }}>
            {cat.features.map((f, i) => (
              <div key={f.title} data-s={`${cat.key}-${i}`} style={{ display: "flex", ...fi(`${cat.key}-${i}`, (i % 3) * 70) }}>
                <FeatureCard feature={f} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ══════════════ CTA ══════════════ */}
      <section data-s="cta" style={{ maxWidth: "860px", margin: "0 auto", padding: `0 ${px} ${sm ? "72px" : "100px"}` }}>
        <div style={{
          background: "linear-gradient(140deg, var(--text-primary) 0%, #7c3aed 100%)",
          borderRadius: "28px", padding: sm ? "48px 26px" : "64px 60px",
          textAlign: "center", boxShadow: "0 28px 72px rgba(124,58,237,0.24)",
          ...fi("cta"),
        }}>
          <h2 style={{ fontSize: sm ? "26px" : "38px", fontWeight: 800, color: "#fff", margin: "0 0 14px", lineHeight: 1.18, fontFamily: "Georgia, serif" }}>
            All of it, free to try.
          </h2>
          <p style={{ fontSize: "16px", color: "var(--card-bg)", lineHeight: 1.72, maxWidth: "440px", margin: "0 auto 32px" }}>
            Jump into a live room in under a minute — no setup, no credit card. Bring a friend and study together tonight.
          </p>
          <Link to="/login" className="fp-btn" style={{
            background: "var(--card-bg)", color: T.purple, padding: "15px 44px", borderRadius: "999px",
            fontSize: "15px", fontWeight: 700, textDecoration: "none",
            boxShadow: "0 8px 24px rgba(0,0,0,0.14)", display: "inline-block",
          }}>
            Start Prepping Free →
          </Link>
        </div>
      </section>
    </main>
  );
}
