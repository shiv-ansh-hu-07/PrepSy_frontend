import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarClock, Clock, Users, Link2, Lock, Globe, Trash2, LogOut, BookOpen, BarChart3 } from "lucide-react";
import AppSideNav from "../components/AppSideNav";
import RoomPlanPanel from "../components/RoomPlanPanel";
import { useBreakpoint } from "../hooks/useBreakpoint";
import api, { exitRoom } from "../services/api";

// Details page for a normal study room — the counterpart of the cohort page:
// what the room is, when it meets, who's in it and how much they've studied,
// and the study plan it follows (if it was created from the Study Planner).

function fmtMins(m) {
  if (!m) return "0m";
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
}
function fmtWhen(d) {
  return d ? new Date(d).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
}
function ago(iso) {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

// The next time this room meets (handles daily / weekly recurrence).
function nextSession(room) {
  if (!room?.startTime) return null;
  const start = new Date(room.startTime).getTime();
  const dur = (room.durationMinutes || 60) * 60000;
  const now = Date.now();
  if (!room.isRecurring || start + dur > now) return { at: start, live: now >= start && now < start + dur };
  const step = (String(room.frequency || "").toUpperCase() === "WEEKLY" ? 7 : 1) * 86400000;
  const k = Math.ceil((now - dur - start) / step);
  const at = start + k * step;
  if (room.recurrenceEndDate && at > new Date(room.recurrenceEndDate).getTime()) return null;
  return { at, live: now >= at && now < at + dur };
}

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "plan", label: "Plan", icon: BookOpen, needsPlan: true },
  { id: "members", label: "Members", icon: Users },
];

export default function RoomDetails() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useBreakpoint();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [roomPlan, setRoomPlan] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get(`/rooms/${roomId}/details`)
      .then(({ data }) => {
        if (cancelled) return;
        // Cohort rooms already have a full page.
        if (data.isCohortRoom && data.cohortId) { navigate(`/cohort/${data.cohortId}`, { replace: true }); return; }
        setRoom(data);
        if (data.studyPlanId) {
          api.get(`/planner/by-room/${roomId}`).then(({ data: p }) => { if (!cancelled && p?.plan) setRoomPlan(p); }).catch(() => {});
        }
      })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message || "Room not found."); });
    return () => { cancelled = true; };
  }, [roomId, navigate]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };
  const leave = async () => {
    if (!window.confirm("Leave this room? You'll stop getting its reminders.")) return;
    setBusy(true);
    try { await exitRoom(roomId); navigate("/myRooms"); } catch { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm("Delete this room for everyone? This can't be undone.")) return;
    setBusy(true);
    try { await api.delete(`/rooms/${roomId}`); navigate("/myRooms"); } catch (err) { alert(err?.response?.data?.message || "Couldn't delete the room."); setBusy(false); }
  };

  const shell = (children) => (
    <div style={{ minHeight: "calc(100vh - 76px)", background: "var(--page-bg)", fontFamily: "'Inter', system-ui, sans-serif", padding: isMobile ? "20px 16px 48px" : "32px 24px 56px" }}>
      <div style={{ width: "100%", maxWidth: 1360, margin: "0 auto", display: "grid", gridTemplateColumns: isTablet ? "minmax(0, 1fr)" : "288px minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
        {!isTablet && <AppSideNav />}
        <main style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>{children}</main>
      </div>
    </div>
  );

  if (error) return shell(<div style={card}><p style={{ margin: 0, color: "#ef4444" }}>{error}</p><button type="button" onClick={() => navigate("/join-room")} style={{ ...primaryBtn, marginTop: 12 }}>Browse rooms</button></div>);
  if (!room) return shell(<div style={card}><p style={muted}>Loading room…</p></div>);

  const next = nextSession(room);
  const freq = room.isRecurring ? (String(room.frequency || "").toUpperCase() === "WEEKLY" ? "Weekly" : "Daily") : "One-time";
  const tabs = TABS.filter((t) => !t.needsPlan || room.studyPlanId);
  const leader = room.members[0];

  return shell(
    <>
      {/* Header */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontFamily: "Georgia, serif", color: "var(--text-primary)" }}>{room.name}</h1>
            <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
              Hosted by {room.isOwner ? "you" : room.owner?.name || "—"} · {room.members.length} member{room.members.length === 1 ? "" : "s"}
              {room.activeUsers > 0 ? <span style={{ color: "#16a34a", fontWeight: 700 }}> · ● {room.activeUsers} studying now</span> : null}
            </p>
            {room.description && <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55, maxWidth: 760 }}>{room.description}</p>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              <Badge icon={room.visibility === "PUBLIC" ? Globe : Lock} text={room.visibility === "PUBLIC" ? "Public" : "Private"} />
              {room.femaleOnly && <Badge text="🌸 Women only" tone="pink" />}
              <Badge icon={CalendarClock} text={freq} />
              {room.durationMinutes ? <Badge icon={Clock} text={`${room.durationMinutes} min sessions`} /> : null}
              {room.studyPlanId && <Badge icon={BookOpen} text="Follows a study plan" tone="accent" />}
              {(room.tags || []).slice(0, 6).map((t) => <Badge key={t} text={`#${t}`} />)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={copyLink} style={ghostBtn}><Link2 size={14} /> {copied ? "Copied!" : "Invite"}</button>
            <button type="button" onClick={() => navigate(`/room/${roomId}`)} style={primaryBtn}>{next?.live || room.activeUsers > 0 ? "Join now →" : "Enter room →"}</button>
            {room.isOwner ? (
              <button type="button" onClick={remove} disabled={busy} style={{ ...ghostBtn, color: "#ef4444" }} title="Delete room"><Trash2 size={14} /></button>
            ) : room.isMember ? (
              <button type="button" onClick={leave} disabled={busy} style={{ ...ghostBtn, color: "#ef4444" }}><LogOut size={14} /> Leave</button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, border: active ? "1px solid var(--accent)" : "1px solid var(--card-border)", background: active ? "var(--accent-soft)" : "var(--card-bg)", color: active ? "var(--accent)" : "var(--text-secondary)", fontWeight: active ? 700 : 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))", gap: 12 }}>
            <Stat label="Next session" value={next ? (next.live ? "Live now" : fmtWhen(next.at)) : room.startTime ? "Ended" : "Anytime"} small />
            <Stat label="Studied this week" value={fmtMins(room.totals.minutesThisWeek)} sub="whole room" />
            <Stat label="All-time study" value={fmtMins(room.totals.minutesTotal)} sub={`${room.totals.sessions} sessions`} />
            <Stat label="Members" value={room.members.length} sub={room.activeUsers ? `${room.activeUsers} online` : "none online"} />
          </div>

          <div style={card}>
            <p style={sectionTitle}>🏆 This week in the room</p>
            {room.members.every((m) => !m.minutesThisWeek) ? (
              <p style={muted}>No study time logged this week yet. {next ? `Next session: ${fmtWhen(next.at)}.` : "Be the first in."}</p>
            ) : (
              room.members.filter((m) => m.minutesThisWeek > 0).slice(0, 6).map((m, i) => (
                <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? "1px solid var(--card-border)" : "none" }}>
                  <span style={{ width: 22, textAlign: "center", fontSize: i < 3 ? 16 : 12, fontWeight: 800, color: "var(--text-muted)" }}>{["🥇", "🥈", "🥉"][i] || i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: m.isMe ? 800 : 600, color: "var(--text-primary)" }}>{m.isMe ? "You" : m.name}{m.isOwner ? " · host" : ""}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{fmtMins(m.minutesThisWeek)}</span>
                </div>
              ))
            )}
            {leader && leader.minutesThisWeek > 0 && !leader.isMe && (
              <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--text-secondary)" }}>{leader.name.split(" ")[0]} leads this week. Join a session to catch up.</p>
            )}
          </div>

          {room.studyPlanId && roomPlan && (
            <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ ...sectionTitle, marginBottom: 2 }}>📅 This room follows a study plan</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{roomPlan.title}</p>
              </div>
              <button type="button" onClick={() => setTab("plan")} style={ghostBtn}>View plan & crew progress →</button>
            </div>
          )}
        </>
      )}

      {tab === "plan" && room.studyPlanId && (
        <div style={{ ...card, maxWidth: 760 }}>
          {roomPlan ? <RoomPlanPanel roomId={roomId} roomPlan={roomPlan} /> : <p style={muted}>Loading plan…</p>}
        </div>
      )}

      {tab === "members" && (
        <div style={card}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-secondary)", fontSize: 12 }}>
                  <th style={th}>Member</th>
                  <th style={{ ...th, textAlign: "right" }}>This week</th>
                  <th style={{ ...th, textAlign: "right" }}>All time</th>
                  <th style={{ ...th, textAlign: "right" }}>Sessions</th>
                  <th style={{ ...th, textAlign: "right" }}>Last active</th>
                </tr>
              </thead>
              <tbody>
                {room.members.map((m) => (
                  <tr key={m.userId} style={{ borderTop: "1px solid var(--card-border)" }}>
                    <td style={{ padding: "9px 8px 9px 0", color: "var(--text-primary)", fontWeight: m.isMe ? 800 : 600 }}>
                      {m.isMe ? "You" : m.name}
                      {m.isOwner && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 999, padding: "1px 7px" }}>Host</span>}
                    </td>
                    <td style={td}>{fmtMins(m.minutesThisWeek)}</td>
                    <td style={td}>{fmtMins(m.minutesTotal)}</td>
                    <td style={td}>{m.sessions}</td>
                    <td style={{ ...td, color: "var(--text-muted)" }}>{ago(m.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>,
  );
}

function Badge({ icon, text, tone }) {
  const IconComponent = icon;
  const tones = {
    pink: { bg: "rgba(236,72,153,0.12)", fg: "#be185d" },
    accent: { bg: "var(--accent-soft)", fg: "var(--accent)" },
  };
  const t = tones[tone] || { bg: "var(--accent-soft)", fg: "var(--text-secondary)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: t.bg, color: t.fg }}>
      {IconComponent ? <IconComponent size={12} /> : null}{text}
    </span>
  );
}

function Stat({ label, value, sub, small }) {
  return (
    <div style={{ ...card, padding: 14 }}>
      <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: small ? 15 : 20, fontWeight: 900, color: "var(--text-primary)" }}>{value}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

const card = { background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 20, padding: 18, boxShadow: "var(--card-shadow, 0 8px 24px rgba(15,23,42,0.06))" };
const muted = { margin: 0, fontSize: 13, color: "var(--text-muted)" };
const sectionTitle = { margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: "var(--text-primary)" };
const th = { padding: "6px 8px 6px 0", fontWeight: 600 };
const td = { padding: "9px 0 9px 8px", textAlign: "right", color: "var(--text-primary)" };
const primaryBtn = { height: 40, padding: "0 18px", borderRadius: 12, border: "none", background: "var(--accent-gradient, var(--accent))", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" };
const ghostBtn = { height: 40, padding: "0 14px", borderRadius: 12, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-secondary)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" };
