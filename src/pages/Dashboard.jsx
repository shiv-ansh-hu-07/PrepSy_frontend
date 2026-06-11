import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { fetchStats, fetchMyAnalytics, fetchFocusSummary } from "../services/api";
import AppSideNav from "../components/AppSideNav";

const BG = "radial-gradient(ellipse at top, #eef1fb 0%, #f3f5fc 45%, #f8f9fe 75%)";

// Pick a room icon from its tags
function roomIcon(room) {
  const tags = (room.tags || []).map((t) => t.toLowerCase());
  if (tags.some((t) => t.includes("dsa") || t.includes("algorithm") || t.includes("leetcode"))) return "⚡";
  if (tags.some((t) => t.includes("system") || t.includes("design"))) return "📐";
  if (tags.some((t) => t.includes("react") || t.includes("frontend") || t.includes("web"))) return "⚛️";
  if (tags.some((t) => t.includes("ml") || t.includes("machine") || t.includes("ai"))) return "🤖";
  if (tags.some((t) => t.includes("math") || t.includes("quant") || t.includes("aptitude"))) return "∑";
  if (tags.some((t) => t.includes("interview") || t.includes("hr") || t.includes("mock"))) return "🎤";
  if (tags.some((t) => t.includes("java") || t.includes("python") || t.includes("backend"))) return "☕";
  if (tags.some((t) => t.includes("dp") || t.includes("dynamic"))) return "🧩";
  return "📚";
}

function roomIconBg(room) {
  const tags = (room.tags || []).map((t) => t.toLowerCase());
  if (tags.some((t) => t.includes("dsa") || t.includes("algorithm") || t.includes("leetcode"))) return "#e8f5e9";
  if (tags.some((t) => t.includes("system") || t.includes("design"))) return "#e3f2fd";
  if (tags.some((t) => t.includes("react") || t.includes("frontend"))) return "#e8eaf6";
  if (tags.some((t) => t.includes("ml") || t.includes("ai"))) return "#fce4ec";
  return "#f3e8ff";
}

export default function Dashboard() {
  const { user, guestSessionActive } = useAuth();
  const navigate = useNavigate();
  const [publicRooms, setPublicRooms] = useState([]);
  const [myAnalytics, setMyAnalytics] = useState(null);
  const [focusSummary, setFocusSummary] = useState(null);

  const isGuestViewer = !user && guestSessionActive;
  const firstName = (user?.name || "there").split(" ")[0];

  useEffect(() => {
    let cancelled = false;

    async function loadMyAnalytics() {
      if (!user?.id) return;
      try {
        const resp = await fetchMyAnalytics();
        if (!cancelled) setMyAnalytics(resp.analytics?.summary ?? null);
      } catch { /* non-critical */ }
    }

    async function loadFocusSummary() {
      if (!user?.id) return;
      try {
        const resp = await fetchFocusSummary();
        if (!cancelled) setFocusSummary(resp);
      } catch { /* non-critical */ }
    }

    async function loadRooms() {
      try {
        const [roomsResp, myRoomsResp] = await Promise.all([
          api.get("/rooms/public"),
          user?.id
            ? api.get("/rooms/my")
            : Promise.resolve({ data: { createdRooms: [], joinedRooms: [] } }),
        ]);
        const merged = Array.from(
          new Map(
            [
              ...(roomsResp.data.rooms || []),
              ...(myRoomsResp.data.createdRooms || []),
              ...(myRoomsResp.data.joinedRooms || []),
            ].map((r) => [r.roomId, r])
          ).values()
        );
        if (!cancelled) setPublicRooms(merged);
      } catch (err) {
        console.error("Dashboard rooms load error:", err);
      }
    }

    loadMyAnalytics();
    loadFocusSummary();
    loadRooms();
    return () => { cancelled = true; };
  }, [user?.id]);

  const sessionRooms = useMemo(
    () => [...publicRooms].sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0)),
    [publicRooms]
  );

  if (!user && !guestSessionActive) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;
  }

  const streak = myAnalytics?.currentStreakDays ?? 0;
  const bestStreak = myAnalytics?.bestStreakDays ?? 0;
  const focusLabel = myAnalytics?.totalFocusLabel || "0m";
  const studyDays = myAnalytics?.completedStudyDays ?? 0;
  const sessions = myAnalytics?.sessionsCompleted ?? 0;
  const avgFocus = focusSummary?.avgFocusScore ?? null;
  const focusTrend = focusSummary?.trend;

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 224, flexShrink: 0, padding: "24px 16px", display: "flex", flexDirection: "column" }}>
        <AppSideNav />
      </div>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: "32px 32px 48px 16px", minWidth: 0 }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, color: "#2f3b63", margin: 0, fontWeight: 700 }}>
            Welcome back, {firstName}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6b78a0" }}>
            {isGuestViewer
              ? "Guest mode — sign in to save your progress."
              : sessions > 0
              ? `${sessions} sessions done · ${studyDays} study days total. Keep the momentum going.`
              : "Your study dashboard is ready. Start your first session to track progress."}
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard
            icon="🔥"
            label="Current streak"
            value={`${streak} day${streak !== 1 ? "s" : ""}`}
            sub={streak === 0 && bestStreak > 0 ? `Best: ${bestStreak} days` : streak > 0 ? "keep it going!" : "Start today"}
          />
          <StatCard
            icon="⏱"
            label="Focus time"
            value={focusLabel}
            sub={`${studyDays} study day${studyDays !== 1 ? "s" : ""}`}
          />
          <StatCard
            icon="✓"
            label="Sessions"
            value={sessions}
            sub={myAnalytics?.studiedDaysThisWeek ? `${myAnalytics.studiedDaysThisWeek}/7 days this week` : "sessions completed"}
          />
          <StatCard
            icon="🧠"
            label="Avg focus score"
            value={avgFocus !== null ? avgFocus : "—"}
            sub={focusTrend === "improving" ? "↑ Improving" : focusTrend === "declining" ? "↓ Declining" : avgFocus !== null ? "steady" : "No data yet"}
          />
        </div>

        {/* Two-column content area */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

          {/* Sessions panel */}
          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#2f3b63", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>📋</span> Active &amp; upcoming sessions
              </h3>
              <button onClick={() => navigate("/join-room")} style={viewAllBtn}>
                View all →
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {sessionRooms.map((room) => (
                <SessionRow key={room.roomId} room={room} onJoin={() => navigate(`/room/${room.roomId}`)} />
              ))}

              {sessionRooms.length === 0 && (
                <div style={{
                  textAlign: "center", padding: "36px 20px",
                  background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                  borderRadius: 16, border: "1px dashed rgba(124,58,237,0.2)",
                }}>
                  <p style={{ fontSize: 30, margin: "0 0 10px" }}>📚</p>
                  <p style={{ fontWeight: 600, color: "#4a5a85", fontSize: 15, margin: "0 0 6px" }}>No live rooms right now</p>
                  <p style={{ fontSize: 13, color: "#7b88b8", margin: "0 0 18px", lineHeight: 1.5 }}>
                    Be the first to start a session — your peers will follow.
                  </p>
                  <button onClick={() => navigate("/create-room")} style={createRoomBtn}>
                    Create a Room →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Progress card */}
            <div style={{
              background: "linear-gradient(135deg, #5b34c7 0%, #7c3aed 60%, #8b5cf6 100%)",
              borderRadius: 20, padding: "22px 20px",
              boxShadow: "0 12px 32px rgba(124,58,237,0.28)",
              color: "#fff",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🎯</span> Your progress
                </span>
                {myAnalytics?.consistencyScore != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 999 }}>
                    {myAnalytics.consistencyScore}% consistent
                  </span>
                )}
              </div>
              <h4 style={{ margin: "8px 0 4px", fontSize: 18, fontWeight: 800 }}>
                {streak > 0 ? `${streak}-day streak active 🔥` : sessions > 0 ? `${sessions} sessions completed` : "Start your journey"}
              </h4>
              <p style={{ margin: "0 0 16px", fontSize: 12, opacity: 0.75 }}>
                {myAnalytics?.studiedDaysThisWeek > 0
                  ? `${myAnalytics.studiedDaysThisWeek} of 7 days studied this week · ${focusLabel} total`
                  : focusLabel !== "0m" ? `Total focus time: ${focusLabel}` : "Join a room to start tracking."}
              </p>
              {/* Progress bar */}
              <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 999, height: 6, marginBottom: 12 }}>
                <div style={{
                  height: 6, borderRadius: 999,
                  background: "#fff",
                  width: `${Math.min(100, ((myAnalytics?.studiedDaysThisWeek ?? 0) / 7) * 100)}%`,
                  transition: "width 0.8s ease",
                }} />
              </div>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.72 }}>
                → {myAnalytics?.studiedDaysThisWeek > 0
                    ? `${7 - (myAnalytics.studiedDaysThisWeek ?? 0)} more days this week to hit 100%`
                    : "Study today to start your streak"}
              </p>
            </div>

            {/* AI Focus Insight */}
            <div style={panelStyle}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#2f3b63", display: "flex", alignItems: "center", gap: 7 }}>
                <span>🧠</span> AI focus insight
              </h3>

              {avgFocus !== null ? (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <ScoreRing score={avgFocus} />
                  <div>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#2f3b63" }}>
                      {avgFocus >= 80 ? "Excellent focus!" : avgFocus >= 65 ? "Good focus level" : avgFocus >= 50 ? "Room to improve" : "Let's work on focus"}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#6b78a0", lineHeight: 1.5 }}>
                      {focusSummary?.totalAnalyzedSessions > 0
                        ? `Based on ${focusSummary.totalAnalyzedSessions} AI-monitored session${focusSummary.totalAnalyzedSessions !== 1 ? "s" : ""}.`
                        : "Turn on AI monitor in your next session."}
                      {focusTrend === "improving" ? " Trending up — keep going." : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <p style={{ fontSize: 28, margin: "0 0 8px" }}>📷</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#4a5a85", margin: "0 0 4px" }}>No focus data yet</p>
                  <p style={{ fontSize: 12, color: "#9aa4c7", margin: 0, lineHeight: 1.5 }}>
                    Enable the AI monitor in your next session to see your score here.
                  </p>
                </div>
              )}

              <button
                onClick={() => navigate("/analytics")}
                style={{
                  marginTop: 16, width: "100%", padding: "9px 0",
                  background: "#f4f0ff", color: "#7c3aed",
                  border: "1px solid rgba(124,58,237,0.18)",
                  borderRadius: 12, fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}
              >
                View full analytics →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 18,
      border: "1px solid rgba(190,200,235,0.5)",
      boxShadow: "0 4px 20px rgba(100,116,180,0.07)",
      padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 10,
          background: "#f4f0ff", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 16, flexShrink: 0,
        }}>{icon}</span>
        <span style={{ fontSize: 12, color: "#7b88b8", fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#2f3b63", lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: 11, color: "#9aa4c7" }}>{sub}</p>
    </div>
  );
}

function ScoreRing({ score }) {
  const r = 26, stroke = 4;
  const circ = 2 * Math.PI * r;
  const fill = circ - (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 65 ? "#7c3aed" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
      <svg width="68" height="68" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="#eef1fb" strokeWidth={stroke} />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round" />
      </svg>
      <span style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 800, color: "#2f3b63",
      }}>{score}</span>
    </div>
  );
}

function SessionRow({ room, onJoin }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const meta = getRoomSessionMeta(room, now);
  if (meta.status === "ended") return null;

  const active = meta.status === "live";
  const userCount = room?.activeUsers ?? 0;
  const icon = roomIcon(room);
  const iconBg = roomIconBg(room);
  const tags = (room.tags || []).slice(0, 3);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 16px", borderRadius: 16,
      border: active ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(190,200,235,0.4)",
      background: active ? "rgba(34,197,94,0.03)" : "rgba(255,255,255,0.5)",
      marginBottom: 8,
      transition: "border-color 0.2s",
    }}>
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: iconBg, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>{icon}</div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#2f3b63", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {room.name}
          </p>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: active ? "#16a34a" : "#7c3aed",
            background: active ? "rgba(34,197,94,0.12)" : "rgba(124,58,237,0.1)",
            padding: "2px 8px", borderRadius: 999, flexShrink: 0,
          }}>
            {active ? "• Live now" : meta.labelShort || "Soon"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#9aa4c7" }}>
            {active ? `${userCount} studying` : `${userCount} joined`}
          </span>
          {tags.map((t) => (
            <span key={t} style={{ fontSize: 11, color: "#7c3aed", background: "rgba(124,58,237,0.07)", padding: "1px 7px", borderRadius: 999 }}>
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* Action */}
      <button
        onClick={active ? onJoin : undefined}
        disabled={!active}
        style={{
          padding: "8px 18px", borderRadius: 12, border: "none",
          background: active ? "#7c3aed" : "#e8eaf6",
          color: active ? "#fff" : "#9aa4c7",
          fontWeight: 600, fontSize: 13, cursor: active ? "pointer" : "default",
          flexShrink: 0, whiteSpace: "nowrap",
          boxShadow: active ? "0 4px 14px rgba(124,58,237,0.3)" : "none",
          transition: "all 0.2s",
        }}
      >
        {active ? "Join" : "Starts soon"}
      </button>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const panelStyle = {
  background: "#fff", borderRadius: 20,
  border: "1px solid rgba(190,200,235,0.5)",
  boxShadow: "0 4px 24px rgba(100,116,180,0.07)",
  padding: "22px 20px",
};

const viewAllBtn = {
  fontSize: 13, fontWeight: 600, color: "#7c3aed",
  background: "transparent", border: "none", cursor: "pointer", padding: 0,
};

const createRoomBtn = {
  padding: "10px 22px", background: "#7c3aed",
  color: "#fff", border: "none", borderRadius: 10,
  fontWeight: 600, fontSize: 13, cursor: "pointer",
  boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
};

// ── Room time helpers ─────────────────────────────────────────────────────────
function getRoomSessionMeta(room, nowTs) {
  const now = new Date(nowTs);
  const startTime = room?.startTime ? new Date(room.startTime) : null;
  const durationMinutes = Number(room?.durationMinutes || 0);
  if (!startTime || !durationMinutes) return { status: "ended", label: "", labelShort: "" };

  if (room.isRecurring) {
    const win = getRecurringWindow(room, now);
    if (!win) return { status: "ended", label: "", labelShort: "" };
    if (now >= win.start && now <= win.end) {
      return { status: "live", label: `Live · ends in ${fmt(win.end - nowTs)}`, labelShort: `ends in ${fmt(win.end - nowTs)}` };
    }
    return { status: "scheduled", label: `Starts in ${fmt(win.start - nowTs)}`, labelShort: `Starts in ${fmt(win.start - nowTs)}` };
  }

  const end = new Date(startTime.getTime() + durationMinutes * 60000);
  if (now >= startTime && now <= end) {
    return { status: "live", label: `Live · ends in ${fmt(end - nowTs)}`, labelShort: `ends in ${fmt(end - nowTs)}` };
  }
  if (now < startTime) {
    return { status: "scheduled", label: `Starts in ${fmt(startTime - nowTs)}`, labelShort: `Starts in ${fmt(startTime - nowTs)}` };
  }
  return { status: "ended", label: "", labelShort: "" };
}

function getRecurringWindow(room, now) {
  const [, tz = "Asia/Kolkata"] = (room?.recurrenceType || "").split("|");
  const s = getZParts(new Date(room.startTime), tz);
  const t = getZParts(now, tz);
  const startToday = zToUtc(t.year, t.month, t.day, s.hour, s.minute, tz);
  const endToday = new Date(startToday.getTime() + Number(room.durationMinutes) * 60000);
  if (now <= endToday) return { start: startToday, end: endToday };
  const startTomorrow = zToUtc(t.year, t.month, t.day + 1, s.hour, s.minute, tz);
  return { start: startTomorrow, end: new Date(startTomorrow.getTime() + Number(room.durationMinutes) * 60000) };
}

function getZParts(date, tz) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const p = f.formatToParts(date);
  const r = (type) => Number(p.find((x) => x.type === type)?.value || 0);
  return { year: r("year"), month: r("month"), day: r("day"), hour: r("hour"), minute: r("minute"), second: r("second") };
}

function zToUtc(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const parts = getZParts(new Date(guess), tz);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(guess - (asUtc - guess));
}

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(sc).padStart(2, "0")}s`;
}
