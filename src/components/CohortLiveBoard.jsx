/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";
import { Play, Pause, Trophy, Radio, ChevronDown } from "lucide-react";
import { fetchCohortLive } from "../services/api";

// Live cohort scoreboard — who has studied the most, who is in the room right
// now, and which video each person is on. One polling hook feeds both the big
// card on the cohort home page and the compact race list inside the room.

export function useCohortLive(cohortId, { enabled = true, intervalMs = 10000 } = {}) {
  const [board, setBoard] = useState(null);
  useEffect(() => {
    if (!cohortId || !enabled) return undefined;
    let cancelled = false;
    const load = () => {
      // Skip polls while the tab is hidden; refresh as soon as it's visible.
      if (document.visibilityState === "hidden") return;
      fetchCohortLive(cohortId)
        .then((data) => { if (!cancelled) setBoard(data); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, intervalMs);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", load);
    };
  }, [cohortId, enabled, intervalMs]);
  return board;
}

export function initialsOf(name) {
  const words = (name || "Member").trim().split(/\s+/);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "M";
}

export function fmtStudy(seconds) {
  const mins = Math.floor((seconds || 0) / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function fmtClock(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

function lastSeenLabel(iso) {
  if (!iso) return "not in the room yet";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `seen ${Math.max(1, mins)}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `seen ${h}h ago`;
  return `seen ${Math.round(h / 24)}d ago`;
}

const MEDALS = ["🥇", "🥈", "🥉"];

// Group live members by the video they're on: { videoId: [member, ...] }.
export function membersByVideo(board, { liveOnly = true } = {}) {
  const map = {};
  for (const m of board?.members || []) {
    if (!m.watching?.videoId || (liveOnly && !m.live)) continue;
    (map[m.watching.videoId] ||= []).push(m);
  }
  return map;
}

export function Avatar({ member, size = 26, ring = false }) {
  return (
    <span
      title={member.name}
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.4, fontWeight: 800, color: "#fff",
        background: member.isMe ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "linear-gradient(135deg,#6f7fc0,#8a9bd6)",
        boxShadow: ring ? "0 0 0 2px var(--card-bg), 0 0 0 4px #22c55e" : "0 0 0 2px var(--card-bg)",
        position: "relative",
      }}
    >
      {initialsOf(member.name)}
    </span>
  );
}

function ProgressBar({ percent, color = "var(--accent)" }) {
  return (
    <div style={{ height: 6, borderRadius: 999, background: "var(--accent-soft)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, percent || 0))}%`, height: "100%", background: color, borderRadius: 999, transition: "width .6s ease" }} />
    </div>
  );
}

// ── Big card for the cohort home page ──────────────────────────────────────
export function CohortScoreboard({ board, isMobile = false, onEnterRoom = null }) {
  if (!board) {
    return (
      <div style={card}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Loading live scoreboard…</p>
      </div>
    );
  }
  const solo = board.syncMode === "SOLO";
  const members = board.members || [];
  const top = Math.max(1, ...members.map((m) => m.studySeconds || 0));
  return (
    <div style={{ ...card, border: "1px solid var(--accent)", background: "linear-gradient(135deg, var(--accent-soft), var(--card-bg) 60%)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ width: 36, height: 36, borderRadius: 12, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Trophy size={18} color="#fff" />
          </span>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
              {solo ? "Live race" : "Crew scoreboard"}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
              {solo ? "Everyone moves at their own pace. Who's furthest?" : "Study time in the cohort room, and what everyone is watching."}
            </p>
          </div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: board.liveCount ? "rgba(34,197,94,0.14)" : "var(--accent-soft)", color: board.liveCount ? "#16a34a" : "var(--text-muted)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: board.liveCount ? "#22c55e" : "var(--text-muted)", animation: board.liveCount ? "cohortLivePulse 1.4s ease-in-out infinite" : "none" }} />
          {board.liveCount ? `${board.liveCount} studying now` : "Nobody in the room"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {members.map((m) => (
          <div
            key={m.userId}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "28px 34px minmax(0,1fr)" : "28px 38px minmax(0,1.3fr) minmax(0,1fr) 90px",
              alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14,
              background: m.isMe ? "var(--accent-soft)" : "var(--card-bg)",
              border: `1px solid ${m.live ? "rgba(34,197,94,0.45)" : "var(--card-border)"}`,
            }}
          >
            <span style={{ fontSize: m.rank <= 3 ? 18 : 13, fontWeight: 800, color: "var(--text-muted)", textAlign: "center" }}>
              {MEDALS[m.rank - 1] || `#${m.rank}`}
            </span>
            <Avatar member={m} size={isMobile ? 34 : 38} ring={m.live} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.name}{m.isMe ? " (you)" : ""}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: m.live ? "#16a34a" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                {m.live && m.watching ? (
                  <>
                    {m.playing ? <Play size={11} fill="currentColor" /> : <Pause size={11} />}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      #{m.watching.index} {m.watching.title} · {fmtClock(m.watching.positionSec)}
                    </span>
                  </>
                ) : m.live ? (
                  <><Radio size={11} /> In the room</>
                ) : (
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.watching ? `Last on #${m.watching.index} · ` : ""}{lastSeenLabel(m.lastSeenAt)}
                  </span>
                )}
              </p>
              {isMobile && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  ⏱ <strong>{fmtStudy(m.studySeconds)}</strong> · {m.videosWatched}/{board.totalVideos} videos
                </p>
              )}
            </div>
            {!isMobile && (
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-secondary)", marginBottom: 4 }}>
                  <span>{m.videosWatched}/{board.totalVideos} videos</span>
                  <span>{m.percent}%</span>
                </div>
                <ProgressBar percent={m.percent} color={m.isMe ? "#7c3aed" : "var(--accent)"} />
              </div>
            )}
            {!isMobile && (
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "var(--text-primary)" }}>{fmtStudy(m.studySeconds)}</p>
                <div style={{ marginTop: 4 }}>
                  <ProgressBar percent={((m.studySeconds || 0) / top) * 100} color="#f59e0b" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {onEnterRoom && (
        <button
          type="button"
          onClick={onEnterRoom}
          style={{ marginTop: 14, height: 40, padding: "0 18px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          {board.liveCount ? "Join them in the room →" : "Start studying →"}
        </button>
      )}
      <style>{"@keyframes cohortLivePulse{0%,100%{opacity:1}50%{opacity:.35}}"}</style>
    </div>
  );
}

// ── Compact race list for the room's Playlist panel ─────────────────────────
// Collapsed (default): ONE line — overlapping avatars (green ring = live) and a
// summary. Expanded: a tight ranked list. Remembered per browser.
const RACE_OPEN_KEY = "prepsy_race_open";

export function LiveRaceList({ board }) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(RACE_OPEN_KEY) === "1"; } catch { return false; }
  });
  const toggle = () => {
    setOpen((v) => {
      try { localStorage.setItem(RACE_OPEN_KEY, v ? "0" : "1"); } catch { /* ignore */ }
      return !v;
    });
  };
  const members = board?.members || [];
  if (!members.length) return null;
  const me = members.find((m) => m.isMe);
  const leader = members[0];
  const summary = me
    ? me.rank === 1 ? `You lead · ${fmtStudy(me.studySeconds)}` : `You #${me.rank} · ${fmtStudy(me.studySeconds)}`
    : `${leader.name.split(" ")[0]} leads`;

  return (
    <div style={race.wrap}>
      <button type="button" onClick={toggle} style={race.header} aria-expanded={open} title="Live tracker — study time and who's on which video">
        <Trophy size={12} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
        <span style={race.stack}>
          {members.slice(0, 5).map((m, i) => (
            <span key={m.userId} style={{ marginLeft: i ? -3 : 0, zIndex: 10 - i, display: "inline-flex" }}>
              <Avatar member={m} size={20} ring={m.live} />
            </span>
          ))}
        </span>
        <span style={race.summary}>
          {board.liveCount ? <strong style={{ color: "#16a34a" }}>{board.liveCount} live</strong> : "No one live"} · {summary}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div style={race.list}>
          {members.map((m) => (
            <div key={m.userId} style={race.row}>
              <span style={race.rank}>{MEDALS[m.rank - 1] || m.rank}</span>
              <span style={race.name(m.isMe)}>{m.isMe ? "You" : m.name}</span>
              <span style={race.status(m.live)}>
                {m.live && m.watching ? `${m.playing ? "▶" : "❚❚"} #${m.watching.index} ${fmtClock(m.watching.positionSec)}` : m.live ? "here" : "away"}
              </span>
              <span style={race.time}>{fmtStudy(m.studySeconds)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const race = {
  wrap: { border: "1px solid var(--card-border)", borderRadius: 12, background: "var(--card-bg)", overflow: "hidden", flexShrink: 0 },
  header: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", minWidth: 0 },
  stack: { display: "inline-flex", alignItems: "center", flexShrink: 0, paddingLeft: 2 },
  summary: { flex: 1, minWidth: 0, fontSize: 11.5, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  list: { borderTop: "1px solid var(--card-border)", padding: "4px 10px 6px" },
  row: { display: "flex", alignItems: "center", gap: 8, padding: "3px 0", minWidth: 0, fontSize: 11.5 },
  rank: { width: 16, flexShrink: 0, textAlign: "center", fontWeight: 800, color: "var(--text-muted)", fontSize: 11 },
  name: (me) => ({ flex: 1, minWidth: 0, fontWeight: me ? 800 : 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
  status: (live) => ({ flexShrink: 0, color: live ? "#16a34a" : "var(--text-muted)", fontSize: 11 }),
  time: { width: 42, flexShrink: 0, textAlign: "right", fontWeight: 800, color: "var(--text-secondary)" },
};

const card = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  borderRadius: 20,
  padding: 20,
  boxShadow: "var(--card-shadow, 0 8px 24px rgba(15,23,42,0.06))",
};
