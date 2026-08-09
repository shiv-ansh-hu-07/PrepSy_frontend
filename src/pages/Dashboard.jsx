import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { fetchStats, fetchMyAnalytics, fetchFocusSummary } from "../services/api";
import AppSideNav from "../components/AppSideNav";

const PAGE_BG = "var(--page-bg)";

function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

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
  if (tags.some((t) => t.includes("react") || t.includes("frontend"))) return "var(--accent-soft)";
  if (tags.some((t) => t.includes("ml") || t.includes("ai"))) return "#fce4ec";
  return "#f3e8ff";
}

export default function Dashboard() {
  const { user, guestSessionActive } = useAuth();
  const navigate = useNavigate();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth < 960;

  const [publicRooms, setPublicRooms] = useState([]);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
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
      } finally {
        if (!cancelled) setRoomsLoaded(true);
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
    <div style={{
      minHeight: "calc(100vh - 76px)",
      background: PAGE_BG,
      padding: isMobile ? "20px 16px 48px" : isTablet ? "24px 20px 48px" : "32px 24px 56px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Same grid layout pattern as Analytics page */}
      <div style={{
        width: "100%",
        maxWidth: 1360,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: isTablet ? "1fr" : "288px minmax(0, 1fr)",
        gap: 24,
        alignItems: "start",
      }}>
        {/* Sidebar — AppSideNav is a direct grid child, same as Analytics */}
        {!isTablet && <AppSideNav />}

      {/* Main */}
      <main style={{ display: "grid", gap: 0, minWidth: 0 }}>

        {/* Header */}
        <div style={{ marginBottom: isMobile ? 16 : 22 }}>
          <h1 style={{
            fontFamily: "Georgia, serif",
            fontSize: isMobile ? 22 : 26,
            color: "var(--text-primary)", margin: 0, fontWeight: 700,
          }}>
            Welcome back, {firstName}
          </h1>
          <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            {isGuestViewer
              ? "Guest mode — sign in to save your progress."
              : sessions > 0
              ? `${sessions} sessions done · ${studyDays} study days total.`
              : "Your study dashboard is ready. Start your first session."}
          </p>
        </div>

        {/* Stat cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, minmax(0, 1fr))",
          gap: isMobile ? 10 : 14,
          marginBottom: isMobile ? 16 : 22,
        }}>
          <StatCard icon="🔥" label="Current streak" value={`${streak} day${streak !== 1 ? "s" : ""}`} sub={streak > 0 ? "keep it going!" : bestStreak > 0 ? `Best: ${bestStreak}d` : "Start today"} />
          <StatCard icon="⏱" label="Focus time" value={focusLabel} sub={`${studyDays} study day${studyDays !== 1 ? "s" : ""}`} />
          <StatCard icon="✓" label="Sessions" value={sessions} sub={myAnalytics?.studiedDaysThisWeek ? `${myAnalytics.studiedDaysThisWeek}/7 this week` : "completed"} />
          <StatCard icon="🧠" label="Avg focus" value={avgFocus !== null ? avgFocus : "—"} sub={focusTrend === "improving" ? "↑ Improving" : focusTrend === "declining" ? "↓ Declining" : avgFocus !== null ? "steady" : "No data yet"} />
        </div>

        {/* Two-column content */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isTablet ? "1fr" : "minmax(0,1fr) 288px",
          gap: 20,
          alignItems: "start",
        }}>

          {/* Sessions panel */}
          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 16 }}>📋</span> Active &amp; upcoming sessions
              </h3>
              <button onClick={() => navigate("/join-room")} style={viewAllBtn}>View all →</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 132 }}>
              {!roomsLoaded ? (
                <div style={{ minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  Loading sessions…
                </div>
              ) : sessionRooms.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: isMobile ? "24px 16px" : "36px 20px",
                  background: "var(--accent-soft)",
                  borderRadius: 16, border: "1px dashed rgba(124,58,237,0.28)",
                }}>
                  <p style={{ fontSize: 28, margin: "0 0 8px" }}>📚</p>
                  <p style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: 14, margin: "0 0 4px" }}>No live rooms right now</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>Be the first to start a session.</p>
                  <button onClick={() => navigate("/create-room")} style={createRoomBtn}>Create a Room →</button>
                </div>
              ) : (
                sessionRooms.map((room) => (
                  <SessionRow key={room.roomId} room={room} isMobile={isMobile} onJoin={() => navigate(`/room/${room.roomId}`)} />
                ))
              )}
            </div>
          </div>

          {/* Right column — shown below sessions on tablet/mobile */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Progress card */}
            <div style={{
              background: "linear-gradient(135deg, #5b34c7 0%, #7c3aed 60%, #8b5cf6 100%)",
              borderRadius: 18, padding: isMobile ? "18px 16px" : "22px 20px",
              boxShadow: "0 12px 32px rgba(124,58,237,0.28)", color: "#fff",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🎯</span> Your progress
                </span>
                {myAnalytics?.consistencyScore != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 999 }}>
                    {myAnalytics.consistencyScore}% consistent
                  </span>
                )}
              </div>
              <h4 style={{ margin: "8px 0 4px", fontSize: isMobile ? 15 : 17, fontWeight: 800 }}>
                {streak > 0 ? `${streak}-day streak active 🔥` : sessions > 0 ? `${sessions} sessions completed` : "Start your journey"}
              </h4>
              <p style={{ margin: "0 0 14px", fontSize: 12, opacity: 0.75 }}>
                {myAnalytics?.studiedDaysThisWeek > 0
                  ? `${myAnalytics.studiedDaysThisWeek} of 7 days this week · ${focusLabel} total`
                  : focusLabel !== "0m" ? `Total focus: ${focusLabel}` : "Join a room to start tracking."}
              </p>
              <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 999, height: 5, marginBottom: 10 }}>
                <div style={{
                  height: 5, borderRadius: 999, background: "var(--card-bg)",
                  width: `${Math.min(100, ((myAnalytics?.studiedDaysThisWeek ?? 0) / 7) * 100)}%`,
                  transition: "width 0.8s ease",
                }} />
              </div>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.72 }}>
                {myAnalytics?.studiedDaysThisWeek > 0
                  ? `${7 - (myAnalytics.studiedDaysThisWeek ?? 0)} more days to 100% this week`
                  : "Study today to start your streak"}
              </p>
            </div>

            {/* AI Focus Insight */}
            <div style={panelStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 7 }}>
                <span>🧠</span> AI focus insight
              </h3>
              {avgFocus !== null ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <ScoreRing score={avgFocus} />
                  <div>
                    <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                      {avgFocus >= 80 ? "Excellent focus!" : avgFocus >= 65 ? "Good focus" : avgFocus >= 50 ? "Room to improve" : "Let's work on focus"}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {focusSummary?.totalAnalyzedSessions > 0
                        ? `Based on ${focusSummary.totalAnalyzedSessions} session${focusSummary.totalAnalyzedSessions !== 1 ? "s" : ""}.`
                        : "Turn on AI monitor in your next session."}
                      {focusTrend === "improving" ? " Trending up." : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <p style={{ fontSize: 26, margin: "0 0 6px" }}>📷</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 3px" }}>No focus data yet</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                    Enable the AI monitor in your next session.
                  </p>
                </div>
              )}
              <button onClick={() => navigate("/analytics")} style={{
                marginTop: 14, width: "100%", padding: "8px 0",
                background: "var(--accent-soft)", color: "#7c3aed",
                border: "1px solid rgba(124,58,237,0.18)",
                borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer",
                textAlign: "center",
              }}>
                View full analytics →
              </button>
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }) {
  return (
    <div style={{
      background: "var(--card-bg)", borderRadius: 14,
      border: "1px solid var(--card-border)",
      boxShadow: "0 2px 12px rgba(100,116,180,0.07)",
      padding: "13px 14px 12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 7,
          background: "var(--accent-soft)", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 12, flexShrink: 0,
        }}>{icon}</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.2 }}>{label}</span>
      </div>
      <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</p>
      <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)" }}>{sub}</p>
    </div>
  );
}

function ScoreRing({ score }) {
  const r = 24, stroke = 4;
  const circ = 2 * Math.PI * r;
  const fill = circ - (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 65 ? "#7c3aed" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
      <svg width="60" height="60" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--accent-soft)" strokeWidth={stroke} />
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round" />
      </svg>
      <span style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 800, color: "var(--text-primary)",
      }}>{score}</span>
    </div>
  );
}

function SessionRow({ room, isMobile, onJoin }) {
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
  const tags = (room.tags || []).slice(0, isMobile ? 2 : 3);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: isMobile ? 10 : 14,
      padding: isMobile ? "11px 12px" : "13px 14px", borderRadius: 14,
      border: active ? "1px solid rgba(34,197,94,0.2)" : "1px solid var(--card-border)",
      background: active ? "rgba(34,197,94,0.03)" : "var(--card-bg)",
      marginBottom: 8,
    }}>
      <div style={{
        width: isMobile ? 34 : 38, height: isMobile ? 34 : 38, borderRadius: 11,
        background: iconBg, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: isMobile ? 15 : 17, flexShrink: 0,
      }}>{icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {room.name}
          </p>
          {room.isCohortRoom && (
            <span style={{
              fontSize: 10, fontWeight: 700, flexShrink: 0,
              color: "#dc2626", background: "rgba(239,68,68,0.1)",
              padding: "2px 7px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 3,
            }}>
              ▶ Cohort
            </span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, flexShrink: 0,
            color: active ? "#16a34a" : "#7c3aed",
            background: active ? "rgba(34,197,94,0.12)" : "rgba(124,58,237,0.1)",
            padding: "2px 7px", borderRadius: 999,
          }}>
            {active ? "● Live" : meta.labelShort || "Soon"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{active ? `${userCount} studying` : `${userCount} joined`}</span>
          {tags.map((t) => (
            <span key={t} style={{ fontSize: 10, color: "#7c3aed", background: "rgba(124,58,237,0.07)", padding: "1px 6px", borderRadius: 999 }}>#{t}</span>
          ))}
        </div>
      </div>

      <button onClick={active ? onJoin : undefined} disabled={!active} style={{
        padding: isMobile ? "6px 12px" : "7px 16px", borderRadius: 10, border: "none",
        background: active ? "#7c3aed" : "var(--accent-soft)",
        color: active ? "#fff" : "var(--text-muted)",
        fontWeight: 600, fontSize: 12, cursor: active ? "pointer" : "default",
        flexShrink: 0, whiteSpace: "nowrap",
        boxShadow: active ? "0 4px 12px rgba(124,58,237,0.25)" : "none",
      }}>
        {active ? "Join" : "Soon"}
      </button>
    </div>
  );
}

const panelStyle = {
  background: "var(--card-bg)", borderRadius: 18,
  border: "1px solid var(--card-border)",
  boxShadow: "0 4px 24px rgba(100,116,180,0.07)",
  padding: "18px 16px",
};
const viewAllBtn = { fontSize: 12, fontWeight: 600, color: "#7c3aed", background: "transparent", border: "none", cursor: "pointer", padding: 0 };
const createRoomBtn = { padding: "9px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.3)" };

function getRoomSessionMeta(room, nowTs) {
  const now = new Date(nowTs);
  const startTime = room?.startTime ? new Date(room.startTime) : null;
  const durationMinutes = Number(room?.durationMinutes || 0);
  if (!startTime || !durationMinutes) return { status: "ended", label: "", labelShort: "" };
  if (room.isRecurring) {
    const win = getRecurringWindow(room, now);
    if (!win) return { status: "ended", label: "", labelShort: "" };
    if (now >= win.start && now <= win.end) return { status: "live", label: `Live`, labelShort: `Live` };
    return { status: "scheduled", label: `Starts in ${fmt(win.start - nowTs)}`, labelShort: `${fmt(win.start - nowTs)}` };
  }
  const end = new Date(startTime.getTime() + durationMinutes * 60000);
  if (now >= startTime && now <= end) return { status: "live", label: "Live", labelShort: "Live" };
  if (now < startTime) return { status: "scheduled", label: `Starts in ${fmt(startTime - nowTs)}`, labelShort: `${fmt(startTime - nowTs)}` };
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
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}
