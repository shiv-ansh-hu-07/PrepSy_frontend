import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWindowWidth } from "../hooks/useBreakpoint";

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: "radial-gradient(ellipse at 60% 20%, var(--accent-soft) 0%, var(--card-bg) 55%, var(--card-bg) 100%)",
  purple: "#7c3aed",
  purpleDark: "#6f3bd6",
  border: "var(--card-border)",
  textDark: "var(--text-primary)",
  textMid: "var(--text-secondary)",
  textLight: "#6b7a99",
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const MARQUEE_TAGS = [
  { icon: "🎥", label: "Live Study Rooms" },
  { icon: "🧠", label: "AI Focus Monitor" },
  { icon: "⏱️", label: "Pomodoro Timer" },
  { icon: "📊", label: "Analytics Dashboard" },
  { icon: "📺", label: "Screen Share + Audio" },
  { icon: "💬", label: "In-Room Chat" },
  { icon: "👩", label: "Female-Only Rooms" },
  { icon: "🎯", label: "Goal-Based Rooms" },
  { icon: "📅", label: "Daily Scheduling" },
  { icon: "🤝", label: "Collaboration Styles" },
];

const FEATURES = [
  {
    icon: "🧠",
    title: "AI Focus Monitor",
    desc: "Your camera tracks your attention every 5 seconds. It knows when you're distracted, on your phone, or drowsy — and scores every session so you can actually see yourself improve.",
    tag: "New ✦",
    tagColor: "#10b981",
    accent: "#10b981",
    hero: true,
  },
  {
    icon: "👩",
    title: "Female-Only Rooms",
    desc: "Safe, verified study rooms exclusively for women. Entry is access-controlled at the room level — not a loose setting anyone can change.",
    tag: "Live ✓",
    tagColor: "#ec4899",
    accent: "#ec4899",
    hero: true,
  },
  {
    icon: "🎥",
    title: "Live Study Rooms",
    desc: "Video rooms with peers targeting the same roles. Filter by goal, language, or collaboration style. Join with camera, audio-only, or just observe.",
    tag: "Core",
    tagColor: "#7c3aed",
    accent: "#7c3aed",
  },
  {
    icon: "📺",
    title: "Screen Share + Audio",
    desc: "Share your screen and system audio — IDE, YouTube, slides — so everyone sees and hears exactly what you're going through.",
    tag: "Built-in",
    tagColor: "#0ea5e9",
    accent: "#0ea5e9",
  },
  {
    icon: "⏱️",
    title: "Pomodoro Timer",
    desc: "Focus blocks auto-calculated from your room duration. The timer stays in sync for every participant so the whole group works in the same rhythm.",
    tag: "Synced",
    tagColor: "#f59e0b",
    accent: "#f59e0b",
  },
  {
    icon: "📊",
    title: "Analytics Dashboard",
    desc: "Streak, focus heatmap, peak-hour chart, AI score trend, and distraction breakdown — tracked per session and over your lifetime.",
    tag: "Insights",
    tagColor: "#6366f1",
    accent: "#6366f1",
  },
  {
    icon: "🤝",
    title: "Collaboration Styles",
    desc: "Pick the room's vibe before anyone joins: Quiet Focus, Discussion, Pair Study, Project-Based, or Interview Practice.",
    tag: "UX",
    tagColor: "#8b5cf6",
    accent: "#8b5cf6",
  },
  {
    icon: "💬",
    title: "Chat & Notes",
    desc: "Chat with your room while you study, share links, and download the session notes as a formatted PDF any time.",
    tag: "Collaboration",
    tagColor: "#14b8a6",
    accent: "#14b8a6",
  },
  {
    icon: "👥",
    title: "Community Feed",
    desc: "Post wins, share resources, ask questions. A focused community of people who are serious about landing their next role.",
    tag: "Community",
    tagColor: "#f43f5e",
    accent: "#f43f5e",
  },
  {
    icon: "🎯",
    title: "Goal-Based Discovery",
    desc: "Rooms tagged with DSA, System Design, HR, Aptitude, and more. Find exactly what you need for today's prep in seconds.",
    tag: "Smart",
    tagColor: "#f59e0b",
    accent: "#f59e0b",
  },
];

const STEPS = [
  {
    num: "01",
    icon: "🙋",
    title: "Create your profile",
    desc: "Set goals, skills, and preferred languages. PrepSy surfaces the most relevant rooms for your exact level.",
  },
  {
    num: "02",
    icon: "🚪",
    title: "Join or host a room",
    desc: "Browse by goal or style. Join with video, audio-only, or observe silently. Start your own room in one click.",
  },
  {
    num: "03",
    icon: "📈",
    title: "Prep. Track. Improve.",
    desc: "AI monitors focus, Pomodoro keeps time, analytics measure growth. Show up daily — the scores don't lie.",
  },
];

const AI_BULLETS = [
  "Focus state classified every 5 seconds",
  "Detects phone usage, looking away, and drowsiness",
  "Post-session H / M / L focus breakdown",
  "Peak-hour heatmap — know when your brain peaks",
];

const ANALYTICS_BULLETS = [
  "Daily study streak with rescue email at 8pm",
  "Session-by-session AI focus scores",
  "Peak Focus Hours heatmap by hour of day",
  "Distraction breakdown — off-screen time per session",
];

const ANALYTICS_CARDS = [
  { icon: "🔥", value: "12", label: "Day Streak", trend: "↑ +3 this week" },
  { icon: "🧠", value: "84", label: "AI Focus Score", trend: "↑ Improving" },
  { icon: "⏱️", value: "42h", label: "Focus Time", trend: "↑ Best month" },
  { icon: "🚪", value: "28", label: "Sessions Joined", trend: null },
];

const COMING_SOON = [
  { icon: "🤝", title: "Smart Peer Matching", desc: "AI pairs you with the right study partner by goal, pace, and level." },
  { icon: "🎤", title: "Mock Interviews", desc: "Structured 1-on-1 sessions with feedback scoring and recording." },
  { icon: "📱", title: "Mobile App", desc: "Native iOS and Android — study from anywhere without friction." },
  { icon: "🌐", title: "Language Filtering", desc: "Find rooms where discussion happens in your preferred language." },
];

const STATS = [
  { value: "500+", label: "Study Sessions" },
  { value: "50+", label: "Active Rooms" },
  { value: "10+", label: "Prep Goals" },
  { value: "4.9★", label: "User Rating" },
];

const COMMUNITY_POSTS = [
  "🎉 Got Flipkart SDE-1 offer!",
  "💡 Sharing DP sheet resources",
  "🤝 Who's doing OS prep today?",
  "📖 System Design notes ready",
  "🚀 Amazon offer after 3 weeks here",
  "📝 Mock interview partners wanted",
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(-2deg); }
    50% { transform: translateY(-14px) rotate(2deg); }
  }
  @keyframes float2 {
    0%, 100% { transform: translateY(0px) rotate(3deg); }
    50% { transform: translateY(-10px) rotate(-3deg); }
  }
  @keyframes float3 {
    0%, 100% { transform: translateY(0px) rotate(-1deg); }
    50% { transform: translateY(-8px) rotate(2deg); }
  }
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
  @keyframes scan {
    0% { top: 24px; opacity: 0.9; }
    85% { top: 188px; opacity: 0.6; }
    100% { top: 24px; opacity: 0; }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes progress-fill {
    from { width: 0%; }
    to   { width: var(--target-w); }
  }

  .feat-card {
    transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease !important;
  }
  .feat-card:hover {
    transform: translateY(-6px) !important;
    box-shadow: 0 20px 48px rgba(100,116,180,0.14) !important;
  }
  .feat-card:hover .feat-accent-bar {
    opacity: 1 !important;
  }
  .home-step-card {
    transition: transform 0.24s ease, box-shadow 0.24s ease !important;
  }
  .home-step-card:hover {
    transform: translateY(-5px) !important;
    box-shadow: 0 14px 38px rgba(124,58,237,0.14) !important;
  }
  .home-coming-card {
    transition: transform 0.24s ease, border-color 0.24s ease !important;
  }
  .home-coming-card:hover {
    transform: translateY(-5px) scale(1.02) !important;
    border-color: rgba(124,58,237,0.34) !important;
  }
  .home-stat-card {
    transition: transform 0.22s ease !important;
  }
  .home-stat-card:hover {
    transform: translateY(-4px) !important;
  }
  .home-pill-tag {
    transition: background 0.2s, border-color 0.2s, color 0.2s !important;
  }
  .home-pill-tag:hover {
    background: rgba(124,58,237,0.13) !important;
    border-color: rgba(124,58,237,0.35) !important;
    color: #6f3bd6 !important;
  }
  .home-btn-purple {
    transition: background 0.2s, box-shadow 0.2s, transform 0.2s !important;
  }
  .home-btn-purple:hover {
    background: #6f3bd6 !important;
    box-shadow: 0 14px 34px rgba(124,58,237,0.48) !important;
    transform: translateY(-2px);
  }
  .home-btn-outline {
    transition: background 0.2s, border-color 0.2s, transform 0.2s !important;
  }
  .home-btn-outline:hover {
    background: rgba(124,58,237,0.07) !important;
    border-color: rgba(124,58,237,0.42) !important;
    transform: translateY(-2px);
  }
  .home-cta-btn {
    transition: box-shadow 0.2s, transform 0.2s !important;
  }
  .home-cta-btn:hover {
    box-shadow: 0 12px 30px rgba(0,0,0,0.2) !important;
    transform: translateY(-2px);
  }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────
function RoleBadge({ emoji, text, color }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "8px 14px", borderRadius: "999px",
      background: "var(--card-bg)", border: `1.5px solid ${color}28`,
      boxShadow: `0 4px 18px ${color}1a`,
      fontSize: "13px", fontWeight: 600, color,
    }}>
      {emoji} {text}
    </div>
  );
}

function SectionLabel({ text, color = "#7c3aed", bg = "rgba(124,58,237,0.07)", border = "rgba(124,58,237,0.18)" }) {
  return (
    <span style={{
      display: "inline-block", padding: "4px 14px", borderRadius: "999px",
      background: bg, border: `1px solid ${border}`,
      fontSize: "12px", fontWeight: 700, color, letterSpacing: "0.1em", textTransform: "uppercase",
    }}>
      {text}
    </span>
  );
}

// Mini AI focus meter visual for the hero AI card
function FocusMeterMini() {
  const bars = [
    { h: 40, color: "#22c55e" },
    { h: 65, color: "#22c55e" },
    { h: 50, color: "#fbbf24" },
    { h: 80, color: "#22c55e" },
    { h: 72, color: "#22c55e" },
    { h: 30, color: "#f87171" },
    { h: 85, color: "#22c55e" },
    { h: 60, color: "#22c55e" },
  ];
  return (
    <div style={{
      background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)",
      borderRadius: 14, padding: "14px 16px", minWidth: 180,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981", marginBottom: 10, letterSpacing: 0.4, textTransform: "uppercase" }}>
        Live Focus Stream
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 56 }}>
        {bars.map((b, i) => (
          <div key={i} style={{
            flex: 1, height: `${b.h}%`, borderRadius: 4,
            background: b.color, opacity: 0.75 + (i % 3) * 0.08,
          }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 10, color: "#6b7a99" }}>last 40s</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>Score: 86 / 100</span>
      </div>
    </div>
  );
}

// Mini verified badge for the female-only hero card
function VerifiedRoomBadge() {
  return (
    <div style={{
      background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.2)",
      borderRadius: 14, padding: "14px 16px", minWidth: 180,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#ec4899", marginBottom: 10, letterSpacing: 0.4, textTransform: "uppercase" }}>
        Room Access Control
      </div>
      {[
        { label: "Entry verified", ok: true },
        { label: "Role-based gate", ok: true },
        { label: "Room moderator", ok: true },
        { label: "Safe space policy", ok: true },
      ].map((row) => (
        <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <span style={{ fontSize: 12, color: row.ok ? "#22c55e" : "#f87171", flexShrink: 0 }}>
            {row.ok ? "✓" : "✗"}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{row.label}</span>
        </div>
      ))}
    </div>
  );
}

// Hero feature card (spans 2 columns in the bento grid)
function HeroFeatureCard({ feature, fadeStyle }) {
  const Visual = feature.accent === "#10b981" ? FocusMeterMini : VerifiedRoomBadge;
  return (
    <div className="feat-card" style={{
      background: "var(--card-bg)", borderRadius: 24, padding: "30px 28px",
      border: `1px solid ${T.border}`,
      boxShadow: "0 6px 28px rgba(100,116,180,0.09)",
      position: "relative", overflow: "hidden",
      width: "100%",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      ...fadeStyle,
    }}>
      {/* Colour accent top bar */}
      <div className="feat-accent-bar" style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: feature.accent, borderRadius: "24px 24px 0 0", opacity: 0.7,
        transition: "opacity 0.2s",
      }} />
      {/* Subtle bg glow */}
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 180, height: 180, borderRadius: "50%",
        background: `radial-gradient(circle, ${feature.accent}14 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, position: "relative" }}>
        {/* Left */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${feature.accent}14`, border: `1px solid ${feature.accent}28`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
            }}>
              {feature.icon}
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: T.textDark, margin: 0, lineHeight: 1.2 }}>
                {feature.title}
              </h3>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                background: `${feature.tagColor}16`, color: feature.tagColor,
                letterSpacing: "0.04em",
              }}>{feature.tag}</span>
            </div>
          </div>
          <p style={{ fontSize: 13.5, color: T.textMid, lineHeight: 1.7, margin: 0, maxWidth: 340 }}>
            {feature.desc}
          </p>
        </div>

        {/* Right: mini visual */}
        <div style={{ flexShrink: 0 }}>
          <Visual />
        </div>
      </div>
    </div>
  );
}

// Regular feature card
function FeatureCard({ feature, fadeStyle }) {
  return (
    <div className="feat-card" style={{
      background: "var(--card-bg)", borderRadius: 22, padding: "24px 22px",
      border: `1px solid ${T.border}`,
      boxShadow: "0 4px 20px rgba(100,116,180,0.07)",
      position: "relative", overflow: "hidden",
      width: "100%",
      display: "flex", flexDirection: "column",
      ...fadeStyle,
    }}>
      <div className="feat-accent-bar" style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: feature.accent, borderRadius: "22px 22px 0 0", opacity: 0.55,
        transition: "opacity 0.2s",
      }} />

      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: `${feature.accent}12`, border: `1px solid ${feature.accent}24`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 19, marginBottom: 12, flexShrink: 0,
      }}>
        {feature.icon}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 800, color: T.textDark, margin: 0, lineHeight: 1.25 }}>
          {feature.title}
        </h3>
        <span style={{
          fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
          background: `${feature.tagColor}16`, color: feature.tagColor,
          letterSpacing: "0.05em", whiteSpace: "nowrap",
        }}>{feature.tag}</span>
      </div>

      <p style={{ fontSize: 13, color: T.textMid, lineHeight: 1.65, margin: 0, flexGrow: 1 }}>
        {feature.desc}
      </p>
    </div>
  );
}

function AIVisual() {
  return (
    <div style={{ position: "relative", width: "270px", height: "240px", margin: "0 auto" }}>
      <div style={{
        width: "220px", height: "210px",
        border: "2px solid rgba(255,255,255,0.18)",
        borderRadius: "18px", position: "relative", overflow: "hidden",
        background: "rgba(0,0,0,0.28)", backdropFilter: "blur(4px)", margin: "0 auto",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -58%)",
          width: "96px", height: "116px",
          border: "2px solid rgba(34,197,94,0.75)",
          borderRadius: "50% 50% 44% 44%",
          boxShadow: "0 0 18px rgba(34,197,94,0.25), inset 0 0 18px rgba(34,197,94,0.05)",
        }} />
        <div style={{ position: "absolute", top: "84px", left: "70px", width: "12px", height: "7px", borderRadius: "50%", background: "rgba(34,197,94,0.85)" }} />
        <div style={{ position: "absolute", top: "84px", right: "70px", width: "12px", height: "7px", borderRadius: "50%", background: "rgba(34,197,94,0.85)" }} />
        <div style={{
          position: "absolute", left: "10px", right: "10px", height: "1.5px",
          background: "linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.85) 40%, rgba(34,197,94,0.85) 60%, transparent 100%)",
          animation: "scan 2.6s ease-in-out infinite",
        }} />
        {[
          { top: "8px", left: "8px", bt: true, bl: true },
          { top: "8px", right: "8px", bt: true, br: true },
          { bottom: "8px", left: "8px", bb: true, bl: true },
          { bottom: "8px", right: "8px", bb: true, br: true },
        ].map((pos, i) => (
          <div key={i} style={{
            position: "absolute",
            top: pos.top, left: pos.left, right: pos.right, bottom: pos.bottom,
            width: "16px", height: "16px",
            borderTop: pos.bt ? "2px solid rgba(255,255,255,0.55)" : "none",
            borderLeft: pos.bl ? "2px solid rgba(255,255,255,0.55)" : "none",
            borderBottom: pos.bb ? "2px solid rgba(255,255,255,0.55)" : "none",
            borderRight: pos.br ? "2px solid rgba(255,255,255,0.55)" : "none",
          }} />
        ))}
        <div style={{
          position: "absolute", bottom: "12px", left: "50%", transform: "translateX(-50%)",
          background: "rgba(34,197,94,0.88)", borderRadius: "999px",
          padding: "4px 14px", fontSize: "12px", fontWeight: 700, color: "#fff",
          whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(34,197,94,0.4)",
        }}>
          Focus Score: 86
        </div>
      </div>
      <div style={{ position: "absolute", right: "-4px", top: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {[
          { label: "Focus", value: "86%", color: "#22c55e" },
          { label: "Alert", value: "High", color: "#22c55e" },
          { label: "Distract", value: "2×", color: "#fbbf24" },
        ].map((m) => (
          <div key={m.label} style={{
            background: "rgba(255,255,255,0.1)", backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.18)", borderRadius: "10px",
            padding: "5px 10px", minWidth: "72px",
          }}>
            <div style={{ fontSize: "10px", color: "var(--card-bg)", marginBottom: "2px" }}>{m.label}</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const width = useWindowWidth();
  const [visible, setVisible] = useState(new Set());

  // Landing page is always light — ignore the saved/system theme while mounted,
  // then restore the user's theme on unmount.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", "light");
    return () => {
      root.setAttribute("data-theme", localStorage.getItem("theme") === "dark" ? "dark" : "light");
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
      { threshold: 0.08 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const fi = (key, delay = 0) => ({
    opacity: visible.has(key) ? 1 : 0,
    transform: visible.has(key) ? "translateY(0)" : "translateY(26px)",
    transition: `opacity 0.62s ease ${delay}ms, transform 0.62s ease ${delay}ms`,
  });

  const sm = width < 900; // landing hero/grids stack below this (marketing-specific)
  const px = sm ? "20px" : "32px";

  const heroFeatures = FEATURES.filter((f) => f.hero);
  const regularFeatures = FEATURES.filter((f) => !f.hero);

  return (
    <main style={{ background: T.bg, fontFamily: "'Inter', system-ui, sans-serif", color: T.textDark, overflowX: "hidden" }}>
      <style>{CSS}</style>

      {/* ══════════════ HERO ══════════════ */}
      <section style={{
        maxWidth: "1160px", margin: "0 auto",
        padding: sm ? "80px 20px 60px" : "112px 32px 80px",
        textAlign: "center", position: "relative",
      }}>
        {!sm && (
          <>
            <div style={{ position: "absolute", top: "128px", left: "3%", animation: "float 5.2s ease-in-out infinite", zIndex: 0 }}>
              <RoleBadge emoji="💻" text="SDE Prep" color="#7c3aed" />
            </div>
            <div style={{ position: "absolute", top: "210px", right: "4%", animation: "float2 6.4s ease-in-out infinite", zIndex: 0 }}>
              <RoleBadge emoji="📐" text="System Design" color="#0ea5e9" />
            </div>
            <div style={{ position: "absolute", top: "340px", left: "1.5%", animation: "float3 7s ease-in-out infinite 0.8s", zIndex: 0 }}>
              <RoleBadge emoji="🧮" text="DSA Grind" color="#10b981" />
            </div>
            <div style={{ position: "absolute", top: "390px", right: "2.5%", animation: "float 5.8s ease-in-out infinite 1.2s", zIndex: 0 }}>
              <RoleBadge emoji="🎯" text="Placement Prep" color="#f59e0b" />
            </div>
          </>
        )}

        <div style={{ position: "relative", zIndex: 1, animation: "slide-up 0.7s ease both" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            padding: "5px 16px 5px 10px", borderRadius: "999px",
            background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)",
            fontSize: "13px", fontWeight: 500, color: T.purple, marginBottom: "26px",
          }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#22c55e", display: "inline-block",
              animation: "blink 2s ease-in-out infinite",
            }} />
            AI Focus Monitor · Female-Only Rooms — now live
          </div>

          <h1 style={{
            fontSize: sm ? "34px" : "58px",
            fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.03em",
            color: T.textDark, marginBottom: "20px",
            fontFamily: "Georgia, serif",
          }}>
            The smarter way to<br />
            <span style={{
              background: "linear-gradient(130deg, #7c3aed 0%, #6366f1 48%, #0ea5e9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              prep for your dream role.
            </span>
          </h1>

          <p style={{
            fontSize: sm ? "16px" : "19px", color: T.textMid,
            lineHeight: 1.68, maxWidth: "600px", margin: "0 auto 38px",
          }}>
            Live study rooms, AI-powered focus tracking, Pomodoro timers, community, and deep analytics — built for placements, job switches, and competitive prep.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
            <Link to="/login" className="home-btn-purple" style={{
              background: T.purple, color: "#fff",
              padding: "14px 34px", borderRadius: "999px",
              fontSize: "15px", fontWeight: 600, textDecoration: "none",
              boxShadow: "0 8px 26px rgba(124,58,237,0.36)", display: "inline-block",
            }}>
              Start Prepping Free →
            </Link>
            <Link to="/HowItWorks" className="home-btn-outline" style={{
              background: "transparent", color: T.purple,
              padding: "14px 28px", borderRadius: "999px",
              fontSize: "15px", fontWeight: 600, textDecoration: "none",
              border: "1.5px solid rgba(124,58,237,0.28)", display: "inline-block",
            }}>
              How it works
            </Link>
          </div>

          <div style={{ marginTop: "34px", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex" }}>
              {["👩‍💻", "👨‍💻", "🧑‍💻", "👩‍💻"].map((e, i) => (
                <div key={i} style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: `hsl(${228 + i * 18}, 65%, 88%)`,
                  border: "2px solid #fff", marginLeft: i > 0 ? "-8px" : 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "15px", zIndex: 4 - i, position: "relative",
                }}>{e}</div>
              ))}
            </div>
            <span style={{ fontSize: "13px", color: T.textLight }}>
              Join <strong style={{ color: T.textDark }}>500+</strong> students already prepping
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════ MARQUEE ══════════════ */}
      <div style={{
        overflow: "hidden",
        borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
        background: "var(--card-bg)", backdropFilter: "blur(10px)",
        padding: "15px 0", marginBottom: "88px",
      }}>
        <div style={{ display: "flex", animation: "marquee 28s linear infinite", width: "max-content" }}>
          {[...MARQUEE_TAGS, ...MARQUEE_TAGS].map((tag, i) => (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              padding: "0 30px", fontSize: "14px", fontWeight: 500, color: T.textMid,
              borderRight: `1px solid ${T.border}`, whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: "16px" }}>{tag.icon}</span>
              {tag.label}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════ FEATURES — BENTO GRID ══════════════ */}
      <section data-s="features" style={{ maxWidth: "1140px", margin: "0 auto", padding: `0 ${px} 100px` }}>
        <div style={{ textAlign: "center", marginBottom: "52px", ...fi("features") }}>
          <SectionLabel text="What's inside" />
          <h2 style={{
            fontSize: sm ? "26px" : "38px", fontWeight: 800,
            letterSpacing: "-0.025em", color: T.textDark,
            margin: "14px 0 14px", fontFamily: "Georgia, serif", lineHeight: 1.2,
          }}>
            Built for prep. Wired for focus.
          </h2>
          <p style={{ fontSize: "16px", color: T.textMid, maxWidth: "520px", margin: "0 auto" }}>
            Every feature is purpose-built for interview and competitive exam prep — not a repurposed productivity tool.
          </p>
        </div>

        {/* Hero row — two equal-height wide cards */}
        {!sm && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 18, marginBottom: 18, alignItems: "stretch" }}>
            {heroFeatures.map((f, i) => (
              <div key={f.title} data-s={`hero-${i}`} style={{ ...fi(`hero-${i}`, i * 80), display: "flex" }}>
                <HeroFeatureCard feature={f} fadeStyle={{ flex: 1 }} />
              </div>
            ))}
          </div>
        )}

        {/* Mobile: hero cards as normal cards */}
        {sm && heroFeatures.map((f, i) => (
          <div key={f.title} style={{ marginBottom: 16 }}>
            <FeatureCard feature={f} fadeStyle={fi(`hero-${i}`, i * 80)} />
          </div>
        ))}

        {/* Regular grid — equal height via align-items: stretch */}
        <div style={{
          display: "grid",
          gridTemplateColumns: sm ? "minmax(0, 1fr)" : "repeat(4, minmax(0, 1fr))",
          gap: 18,
          alignItems: "stretch",
        }}>
          {regularFeatures.map((f, i) => (
            <div key={f.title} data-s={`feat-${i}`} style={{ display: "flex" }}>
              <FeatureCard feature={f} fadeStyle={{ ...fi(`feat-${i}`, i * 45), flex: 1 }} />
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ AI SPOTLIGHT ══════════════ */}
      <section data-s="ai" style={{ padding: `0 ${px} 96px` }}>
        <div style={{
          maxWidth: "1140px", margin: "0 auto",
          background: "linear-gradient(140deg, var(--text-primary) 0%, #4a3882 52%, #7c3aed 100%)",
          borderRadius: "28px", padding: sm ? "44px 24px" : "60px 68px",
          position: "relative", overflow: "hidden",
          ...fi("ai"),
        }}>
          <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "-70px", left: "28%", width: "320px", height: "320px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

          <div style={{
            display: "grid",
            gridTemplateColumns: sm ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)",
            gap: sm ? "40px" : "56px",
            alignItems: "center", position: "relative", zIndex: 1,
          }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "4px 14px", borderRadius: "999px",
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)",
                fontSize: "11px", fontWeight: 700, color: "#a5f3fc",
                textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "22px",
              }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "blink 1.6s ease-in-out infinite" }} />
                Now Live
              </div>

              <h2 style={{
                fontSize: sm ? "26px" : "36px", fontWeight: 800,
                color: "#fff", marginBottom: "18px", lineHeight: 1.2,
                fontFamily: "Georgia, serif",
              }}>
                AI that watches your focus,<br />so you don't have to.
              </h2>

              <p style={{ fontSize: "16px", color: "var(--card-bg)", lineHeight: 1.72, marginBottom: "28px" }}>
                Camera-based AI powered by Google MediaPipe gaze &amp; face-landmark tracking. It tells note-taking apart from real distraction, classifies your attention state, and scores every session — so you can actually see improvement over time.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {AI_BULLETS.map((b) => (
                  <div key={b} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "var(--card-bg)" }}>
                    <span style={{ color: "#86efac", fontSize: "15px", flexShrink: 0 }}>✓</span>
                    {b}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <AIVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section data-s="how" style={{ maxWidth: "1100px", margin: "0 auto", padding: `0 ${px} 96px` }}>
        <div style={{ textAlign: "center", marginBottom: "52px", ...fi("how") }}>
          <SectionLabel text="How it works" />
          <h2 style={{ fontSize: sm ? "26px" : "38px", fontWeight: 800, letterSpacing: "-0.025em", color: T.textDark, margin: "14px 0 0", fontFamily: "Georgia, serif" }}>
            Three steps to better prep.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: sm ? "minmax(0, 1fr)" : "repeat(3, minmax(0, 1fr))", gap: "22px" }}>
          {STEPS.map((s, i) => (
            <div key={s.num} data-s={`step-${i}`} className="home-step-card" style={{
              background: "var(--card-bg)", borderRadius: "24px", padding: "32px 28px",
              border: `1px solid ${T.border}`,
              boxShadow: "0 4px 20px rgba(100,116,180,0.08)",
              position: "relative",
              ...fi(`step-${i}`, i * 130),
            }}>
              <div style={{
                position: "absolute", top: "20px", right: "22px",
                fontSize: "48px", fontWeight: 900, color: "rgba(124,58,237,0.06)",
                lineHeight: 1, fontFamily: "Georgia, serif", userSelect: "none",
              }}>
                {s.num}
              </div>
              <div style={{ fontSize: "30px", marginBottom: "16px" }}>{s.icon}</div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: T.purple, letterSpacing: "0.1em", marginBottom: "8px", textTransform: "uppercase" }}>
                Step {s.num}
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: T.textDark, marginBottom: "10px", lineHeight: 1.3 }}>
                {s.title}
              </h3>
              <p style={{ fontSize: "14px", color: T.textMid, lineHeight: 1.68, margin: 0 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ ANALYTICS PREVIEW ══════════════ */}
      <section data-s="analytics" style={{ maxWidth: "1140px", margin: "0 auto", padding: `0 ${px} 96px` }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: sm ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "52px", alignItems: "center",
        }}>
          <div style={{ ...fi("analytics") }}>
            <SectionLabel text="Analytics" />
            <h2 style={{
              fontSize: sm ? "26px" : "36px", fontWeight: 800,
              letterSpacing: "-0.025em", color: T.textDark,
              margin: "14px 0 16px", fontFamily: "Georgia, serif", lineHeight: 1.2,
            }}>
              Your progress,<br />finally measurable.
            </h2>
            <p style={{ fontSize: "15px", color: T.textMid, lineHeight: 1.72, marginBottom: "24px" }}>
              Track everything that matters — streak, focus heatmap, AI score trend, peak focus hours, and distraction patterns — all in one place.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {ANALYTICS_BULLETS.map((b) => (
                <div key={b} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: T.textMid }}>
                  <span style={{ color: T.purple, fontSize: "14px", flexShrink: 0 }}>◆</span>
                  {b}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "14px", ...fi("analytics", 200) }}>
            {ANALYTICS_CARDS.map((c) => (
              <div key={c.label} className="home-stat-card" style={{
                background: "var(--card-bg)", borderRadius: "20px", padding: "22px 20px",
                border: `1px solid ${T.border}`,
                boxShadow: "0 4px 18px rgba(100,116,180,0.08)",
              }}>
                <div style={{ fontSize: "22px", marginBottom: "10px" }}>{c.icon}</div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: T.textDark, lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: "12px", color: T.textLight, marginTop: "4px" }}>{c.label}</div>
                {c.trend && (
                  <div style={{ fontSize: "11px", color: "#22c55e", marginTop: "7px", fontWeight: 600 }}>
                    {c.trend}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ STATS BAR ══════════════ */}
      <div data-s="stats" style={{
        background: "var(--card-bg)", backdropFilter: "blur(12px)",
        borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
        padding: "52px 32px", marginBottom: "80px",
      }}>
        <div style={{
          maxWidth: "900px", margin: "0 auto",
          display: "grid", gridTemplateColumns: sm ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
          gap: "28px",
        }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ textAlign: "center", ...fi("stats", i * 100) }}>
              <div style={{ fontSize: sm ? "34px" : "44px", fontWeight: 800, color: T.purple, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: "13px", color: T.textLight, marginTop: "8px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════ COMMUNITY ══════════════ */}
      <section data-s="community" style={{ maxWidth: "1140px", margin: "0 auto", padding: `0 ${px} 80px` }}>
        <div style={{
          background: "var(--card-bg)", borderRadius: "28px",
          padding: sm ? "36px 24px" : "56px 60px",
          border: `1px solid ${T.border}`,
          boxShadow: "0 8px 32px rgba(100,116,180,0.08)",
          textAlign: "center",
          ...fi("community"),
        }}>
          <div style={{ fontSize: "42px", marginBottom: "18px" }}>🌐</div>
          <h2 style={{
            fontSize: sm ? "22px" : "32px", fontWeight: 800,
            color: T.textDark, marginBottom: "14px", fontFamily: "Georgia, serif",
          }}>
            You're not prepping alone.
          </h2>
          <p style={{ fontSize: "16px", color: T.textMid, lineHeight: 1.72, maxWidth: "540px", margin: "0 auto 30px" }}>
            A community that posts wins, shares resources, clears doubts, and holds each other accountable. Real peers, real momentum.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
            {COMMUNITY_POSTS.map((t) => (
              <div key={t} className="home-pill-tag" style={{
                padding: "8px 16px", borderRadius: "999px",
                background: "rgba(124,58,237,0.07)",
                border: "1px solid rgba(124,58,237,0.14)",
                fontSize: "13px", fontWeight: 500, color: T.purple, cursor: "default",
              }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ ROADMAP ══════════════ */}
      <section data-s="coming" style={{ maxWidth: "1140px", margin: "0 auto", padding: `0 ${px} 96px` }}>
        <div style={{ textAlign: "center", marginBottom: "44px", ...fi("coming") }}>
          <SectionLabel text="Roadmap" color="#f59e0b" bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.22)" />
          <h2 style={{
            fontSize: sm ? "24px" : "34px", fontWeight: 800,
            letterSpacing: "-0.025em", color: T.textDark,
            margin: "14px 0 10px", fontFamily: "Georgia, serif",
          }}>
            What's coming next.
          </h2>
          <p style={{ fontSize: "15px", color: T.textMid }}>Features actively in development — launching soon.</p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: sm ? "minmax(0, 1fr) minmax(0, 1fr)" : "repeat(4, minmax(0, 1fr))",
          gap: "16px",
        }}>
          {COMING_SOON.map((c, i) => (
            <div key={c.title} data-s={`coming-${i}`} className="home-coming-card" style={{
              background: "var(--card-bg)", borderRadius: "20px", padding: "26px 20px",
              border: `1px solid ${T.border}`,
              boxShadow: "0 4px 16px rgba(100,116,180,0.07)",
              textAlign: "center",
              ...fi(`coming-${i}`, i * 80),
            }}>
              <div style={{ fontSize: "30px", marginBottom: "12px" }}>{c.icon}</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: T.textDark, marginBottom: "6px" }}>{c.title}</div>
              <div style={{ fontSize: "12px", color: T.textLight, lineHeight: 1.55, marginBottom: "14px" }}>{c.desc}</div>
              <div style={{
                fontSize: "10px", fontWeight: 700, color: "#f59e0b",
                background: "rgba(245,158,11,0.09)", border: "1px solid rgba(245,158,11,0.22)",
                padding: "3px 10px", borderRadius: "999px", display: "inline-block",
              }}>
                Coming Soon
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ CTA ══════════════ */}
      <section data-s="cta" style={{ maxWidth: "860px", margin: "0 auto", padding: `0 ${px} 100px` }}>
        <div style={{
          background: "linear-gradient(140deg, var(--text-primary) 0%, #7c3aed 100%)",
          borderRadius: "28px", padding: sm ? "52px 28px" : "68px 60px",
          textAlign: "center",
          boxShadow: "0 28px 72px rgba(124,58,237,0.24)",
          ...fi("cta"),
        }}>
          <h2 style={{
            fontSize: sm ? "28px" : "40px", fontWeight: 800,
            color: "#fff", marginBottom: "16px", lineHeight: 1.18,
            fontFamily: "Georgia, serif",
          }}>
            Ready to prep smarter?
          </h2>
          <p style={{
            fontSize: "16px", color: "var(--card-bg)",
            lineHeight: 1.72, maxWidth: "430px", margin: "0 auto 34px",
          }}>
            Better prep isn't more hours. It's better structure, better peers, and better momentum. Start today.
          </p>
          <Link to="/login" className="home-cta-btn" style={{
            background: "var(--card-bg)", color: T.purple,
            padding: "15px 44px", borderRadius: "999px",
            fontSize: "15px", fontWeight: 700, textDecoration: "none",
            boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
            display: "inline-block",
          }}>
            Start Prepping Free →
          </Link>
        </div>
      </section>
    </main>
  );
}
