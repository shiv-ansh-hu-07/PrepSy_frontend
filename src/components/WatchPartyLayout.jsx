import { Mic, MicOff, Video, VideoOff, MessageSquare, Users, LogOut, Copy, X, Play, Flame, Target, Sparkles, Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParticipants, useTracks, VideoTrack } from "@livekit/components-react";
import useMediaControls from "../hooks/useMediaControl";
import YouTubeRoom from "./YouTubeRoom";
import ChatDrawer from "./ChatDrawer";
import api, { fetchMyAnalytics, fetchFocusSummary, fetchVideoSummary } from "../services/api";

const PREP_MS = 60_000;

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function WatchPartyLayout({
  roomId,
  roomName,
  youtubeVideoId = null,
  youtubePlaylistId = null,
  startTime = null,
  tags = [],
  currentUser = null,
  restrictVideoIds = null,
  segment = null,
  segmentPart = null,
}) {
  const { toggleMic, micEnabled, toggleCamera, camEnabled } = useMediaControls();
  const navigate = useNavigate();
  const participants = useParticipants();
  const participantCount = participants.length;
  const cameraTracks = useTracks([{ source: "camera", withPlaceholder: false }], {
    onlySubscribed: true,
  });

  const [tab, setTab] = useState("chat");
  const [shareStatus, setShareStatus] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 980 : false
  );
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [stats, setStats] = useState(null);
  const [videoSummary, setVideoSummary] = useState(null);
  const [videoSummaryLoading, setVideoSummaryLoading] = useState(true);

  const mountedAtRef = useRef(Date.now());

  const startTimeMs = startTime ? new Date(startTime).getTime() : null;
  const prepEndsAt = mountedAtRef.current + PREP_MS;
  const effectiveEndsAt =
    startTimeMs && startTimeMs > mountedAtRef.current
      ? Math.max(startTimeMs, prepEndsAt)
      : prepEndsAt;
  const isPreparing = now < effectiveEndsAt;
  const showWaiting = !dismissed && isPreparing;
  const [manuallyStarted, setManuallyStarted] = useState(false);
  const playbackLocked = isPreparing && !manuallyStarted;

  useEffect(() => {
    if (!isPreparing) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isPreparing]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMyAnalytics().catch(() => null), fetchFocusSummary().catch(() => null)])
      .then(([analyticsRes, focusRes]) => {
        if (cancelled) return;
        const recentDistractions = (focusRes?.recentSessions || [])
          .slice(0, 5)
          .reduce((sum, s) => sum + (s.distractionCount || 0), 0);
        setStats({
          streak: analyticsRes?.analytics?.summary?.currentStreakDays ?? 0,
          avgFocus: focusRes?.avgFocusScore ?? null,
          distractions: recentDistractions,
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!roomId || !youtubeVideoId) {
      setVideoSummaryLoading(false);
      return undefined;
    }
    let cancelled = false;
    fetchVideoSummary(roomId)
      .then((res) => {
        if (!cancelled) setVideoSummary(res?.summary || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setVideoSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, youtubeVideoId]);

  useEffect(() => {
    if (!shareStatus) return undefined;
    const id = window.setTimeout(() => setShareStatus(""), 2200);
    return () => window.clearTimeout(id);
  }, [shareStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => setIsMobile(window.innerWidth < 980);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const copyRoomId = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setShareStatus("Room ID copied");
    } catch {
      setShareStatus("Copy failed");
    }
  };

  const handleStartWatching = () => {
    // Don't call playVideo() here directly — the child's playback lock is
    // still true until it re-renders with the new prop. Flipping this state
    // releases the lock, and YouTubeRoom's own effect starts playback the
    // instant it sees `locked` go from true to false.
    setManuallyStarted(true);
    setDismissed(true);
  };

  const handleLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    setShowSummary(true);
    try {
      const res = await api.post(`/rooms/${roomId}/leave`);
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLeaving(false);
    }
  };

  const handleCloseSummary = () => {
    navigate("/dashboard");
  };

  return (
    <div style={styles.page}>
      <div style={styles.centerWrap(isMobile)}>
        <div style={styles.stageWrap}>
          <div style={styles.roomHeaderBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <p style={styles.roomHeaderName}>{roomName || "Watch Party"}</p>
              {tags.slice(0, 2).map((t) => (
                <span key={t} style={styles.topicPill}>{t}</span>
              ))}
            </div>
            <button type="button" style={styles.roomHeaderButton} onClick={copyRoomId}>
              <Copy size={15} />
              {shareStatus || "Share"}
            </button>
          </div>

          <div style={styles.stage} data-room-stage>
            <div style={styles.sessionBadgeDesktop}>
              <span style={styles.liveDot} />
              {participantCount} {participantCount === 1 ? "person" : "people"} watching
              <span style={styles.sessionDivider}>•</span>
              Watch party
            </div>

            <YouTubeRoom
              videoId={youtubeVideoId}
              playlistId={youtubePlaylistId}
              locked={playbackLocked}
              restrictVideoIds={restrictVideoIds}
              segment={segment}
              segmentPart={segmentPart}
            />

            {participants.some((p) => p.isCameraEnabled) && (
              <div style={styles.cameraPip}>
                {participants.map((p) => {
                  const track = cameraTracks.find(
                    (t) => t.participant.identity === p.identity
                  );
                  const hasCamera = Boolean(p.isCameraEnabled && track?.publication?.track);
                  if (!hasCamera) return null;
                  return (
                    <div key={p.identity} style={styles.cameraPipTile}>
                      <VideoTrack trackRef={track} style={styles.cameraPipVideo} />
                      <span style={styles.cameraPipName}>{p.name || "Guest"}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {showWaiting && (
              <div style={styles.waitingOverlay}>
                <div style={styles.waitingCard}>
                  <button
                    type="button"
                    style={styles.waitingCloseBtn}
                    onClick={() => setDismissed(true)}
                    title="Dismiss"
                  >
                    <X size={16} />
                  </button>

                  <div style={styles.waitingHeader}>
                    <span style={styles.waitingKicker}>
                      <Sparkles size={13} /> Getting ready
                    </span>
                    <p style={styles.waitingCountdown}>{formatCountdown(effectiveEndsAt - now)}</p>
                    <p style={styles.waitingSub}>
                      Take a moment to settle in — the video starts automatically when the timer ends.
                    </p>
                  </div>

                  {(videoSummaryLoading || videoSummary) && (
                    <div style={styles.summaryBox}>
                      <p style={styles.summaryLabel}>What you're about to watch</p>
                      <p style={styles.summaryText}>
                        {videoSummaryLoading ? "Summarizing video…" : videoSummary}
                      </p>
                    </div>
                  )}

                  <div style={styles.waitingActions}>
                    <button type="button" style={styles.startBtn} onClick={handleStartWatching}>
                      <Play size={15} fill="currentColor" />
                      Start watching now
                    </button>
                    <button type="button" style={styles.waitingShareBtn} onClick={copyRoomId}>
                      <Copy size={15} />
                      {shareStatus || "Share room"}
                    </button>
                  </div>

                  {stats && (
                    <div style={styles.waitingStats}>
                      <p style={styles.waitingStatsHeading}>Your stats</p>
                      <div style={styles.statRow}>
                        <StatPill icon={Target} label="Avg focus" value={stats.avgFocus !== null ? stats.avgFocus : "—"} />
                        <StatPill icon={Flame} label="Streak" value={stats.streak} />
                        <StatPill icon={Eye} label="Distractions" value={stats.distractions} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={styles.bottomBar}>
              <Control icon={micEnabled ? Mic : MicOff} active={micEnabled} onClick={toggleMic} title="Toggle mic" />
              <Control icon={camEnabled ? Video : VideoOff} active={camEnabled} onClick={toggleCamera} title="Toggle camera" />
              <Control icon={MessageSquare} onClick={() => setTab("chat")} active={tab === "chat"} title="Chat" />
              <Control icon={Users} onClick={() => setTab("people")} active={tab === "people"} title="People" />
              <Control icon={LogOut} danger onClick={handleLeave} title="Leave" />
            </div>
          </div>
        </div>

        <div style={styles.sidePanel(isMobile)}>
          <div style={styles.tabBar}>
            <button
              type="button"
              style={styles.tabBtn(tab === "chat")}
              onClick={() => setTab("chat")}
            >
              Chat
            </button>
            <button
              type="button"
              style={styles.tabBtn(tab === "people")}
              onClick={() => setTab("people")}
            >
              People <span style={styles.tabCount}>{participantCount}</span>
            </button>
          </div>

          <div style={styles.tabBody}>
            {tab === "chat" ? (
              <ChatDrawer embedded currentUser={currentUser} />
            ) : (
              <PeopleList participants={participants} />
            )}
          </div>
        </div>
      </div>

      {showSummary && (
        <LeaveSummaryModal summary={summary} loading={!summary} onClose={handleCloseSummary} />
      )}
    </div>
  );
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div style={styles.statPill}>
      {Icon && <Icon size={14} color="#a5b4fc" style={{ marginBottom: 4 }} />}
      <p style={styles.statPillValue}>{value}</p>
      <p style={styles.statPillLabel}>{label}</p>
    </div>
  );
}

function PeopleList({ participants }) {
  return (
    <div style={styles.peopleList}>
      {participants.map((p) => {
        const words = (p.name || "Guest").trim().split(/\s+/);
        const initials = words.slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
        return (
          <div key={p.identity} style={styles.personRow}>
            <div style={styles.personAvatar}>{initials || "G"}</div>
            <span style={styles.personName}>{p.name || "Guest"}</span>
            {!p.isMicrophoneEnabled && <MicOff size={14} color="#94A3B8" />}
          </div>
        );
      })}
    </div>
  );
}

function LeaveSummaryModal({ summary, loading, onClose }) {
  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.card} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        {loading ? (
          <>
            <p style={modalStyles.tag}>SESSION COMPLETE</p>
            <h2 style={modalStyles.title}>Wrapping up…</h2>
          </>
        ) : (
          <>
            <p style={modalStyles.tag}>SESSION COMPLETE</p>
            <h2 style={modalStyles.title}>Thanks for watching{summary?.roomName ? ` in ${summary.roomName}` : ""}</h2>
            <p style={modalStyles.text}>{summary?.message}</p>
            <div style={modalStyles.stats}>
              <StatBox label="Time spent" value={summary?.totalTimeLabel} />
              <StatBox label="Watched with" value={`${summary?.studiedWithCount ?? 0} people`} />
              <StatBox label="Streak" value={`🔥 ${summary?.streak ?? 0} day${summary?.streak === 1 ? "" : "s"}`} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div style={modalStyles.stat}>
      <p style={modalStyles.label}>{label}</p>
      <p style={modalStyles.value}>{value}</p>
    </div>
  );
}

function Control({ icon, danger, active, onClick, title }) {
  const IconComponent = icon;
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        border: "1px solid var(--card-border)",
        background: danger ? "#F87171" : active ? "var(--accent)" : "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: active ? "0 6px 18px rgba(138,155,214,0.45)" : "0 4px 12px rgba(0,0,0,0.08)",
        transition: "all 0.2s ease",
      }}
    >
      <IconComponent size={20} color={danger ? "#FFFFFF" : "var(--text-secondary)"} />
    </button>
  );
}

const styles = {
  page: {
    width: "100%",
    minHeight: "100%",
    background: "linear-gradient(180deg, var(--card-bg) 0%, var(--accent-soft) 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
    padding: "10px 12px 18px",
    boxSizing: "border-box",
    gap: 10,
  },
  centerWrap: (m) => ({
    width: "100%",
    minHeight: "calc(100vh - 118px)",
    maxWidth: 1420,
    alignItems: "stretch",
    display: "grid",
    gridTemplateColumns: m ? "1fr" : "minmax(0, 1.92fr) minmax(300px, 0.68fr)",
    gap: 16,
    boxSizing: "border-box",
  }),
  stageWrap: { position: "relative", minHeight: 360, display: "flex", flexDirection: "column", gap: 10 },
  roomHeaderBar: {
    minHeight: 42, padding: "8px 14px", borderRadius: 16,
    border: "1px solid var(--card-border)", background: "var(--card-bg)",
    boxShadow: "0 8px 20px rgba(74,90,133,0.08)",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  roomHeaderName: { margin: 0, fontSize: 15, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  topicPill: {
    fontSize: 11, fontWeight: 600, color: "#6f3bd6", background: "#f3e8ff",
    padding: "3px 10px", borderRadius: 999, flexShrink: 0,
  },
  roomHeaderButton: {
    height: 30, padding: "0 11px", borderRadius: 999,
    border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)",
    fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    cursor: "pointer", flexShrink: 0, fontSize: 14,
  },
  sessionBadgeDesktop: {
    position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 20,
    fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7,
    background: "var(--card-bg)", padding: "8px 14px", borderRadius: 999,
    boxShadow: "0 8px 18px rgba(0,0,0,0.14)", backdropFilter: "blur(8px)",
  },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#22c55e" },
  sessionDivider: { color: "#94A3B8" },
  cameraPip: {
    position: "absolute", top: 14, right: 14, zIndex: 25,
    display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end",
    maxWidth: "min(100%, 480px)",
  },
  cameraPipTile: {
    width: 132, height: 90, borderRadius: 14, overflow: "hidden",
    position: "relative", background: "#0f172a", boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
  },
  cameraPipVideo: { width: "100%", height: "100%", objectFit: "cover" },
  cameraPipName: {
    position: "absolute", bottom: 6, left: 6, padding: "2px 7px",
    borderRadius: 6, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11,
  },
  stage: {
    width: "100%", minHeight: 360, height: "100%", borderRadius: 24,
    border: "1px solid rgba(238,242,255,0.8)", background: "#05070b",
    overflow: "hidden", display: "flex", alignItems: "stretch", justifyContent: "stretch",
    position: "relative", boxShadow: "0 16px 32px rgba(15,23,42,0.14)",
  },
  waitingOverlay: {
    position: "absolute", inset: 0, zIndex: 40,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(8,10,20,0.6)", backdropFilter: "blur(10px)",
    padding: 16,
  },
  waitingCard: {
    position: "relative", width: "min(100%, 420px)", textAlign: "center", padding: "30px 28px",
    background: "linear-gradient(160deg, rgba(30,27,75,0.92) 0%, rgba(15,23,42,0.94) 100%)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
    maxHeight: "90%", overflowY: "auto",
  },
  waitingCloseBtn: {
    position: "absolute", top: 14, right: 14, width: 30, height: 30,
    borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.08)",
    color: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  waitingHeader: { marginBottom: 18 },
  waitingKicker: {
    display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700,
    color: "#c4b5fd", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  waitingCountdown: {
    margin: "4px 0 10px", fontSize: 36, fontWeight: 800, color: "#e0e7ff",
    fontVariantNumeric: "tabular-nums", letterSpacing: 0.5,
    textShadow: "0 0 24px rgba(165,180,252,0.4)",
  },
  waitingSub: { margin: 0, fontSize: 12.5, color: "#94A3B8", lineHeight: 1.5, padding: "0 8px" },
  summaryBox: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(148,163,184,0.15)",
    borderRadius: 14, padding: "12px 14px", margin: "0 0 18px", textAlign: "left",
  },
  summaryLabel: {
    margin: "0 0 5px", fontSize: 10, fontWeight: 700, color: "#a5b4fc",
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  summaryText: { margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 },
  waitingActions: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 4 },
  startBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    height: 44, padding: "0 18px", borderRadius: 999, border: "none",
    background: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)", color: "#fff",
    fontWeight: 700, fontSize: 14, cursor: "pointer",
    boxShadow: "0 10px 26px rgba(124,58,237,0.4)",
  },
  waitingShareBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    height: 38, padding: "0 18px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(255,255,255,0.04)", color: "#cbd5e1", fontWeight: 600, fontSize: 13, cursor: "pointer",
  },
  waitingStats: {
    marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(148,163,184,0.15)",
  },
  waitingStatsHeading: {
    margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "#94A3B8",
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  statRow: { display: "flex", gap: 10 },
  statPill: {
    flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "10px 8px",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  statPillValue: { margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: "#e2e8f0" },
  statPillLabel: { margin: 0, fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 },
  bottomBar: {
    position: "absolute", left: "50%", bottom: 14, transform: "translateX(-50%)",
    width: "fit-content", maxWidth: "100%", display: "flex", gap: 8, flexWrap: "wrap",
    justifyContent: "center", padding: "8px 14px", background: "var(--card-bg)",
    borderRadius: 20, boxShadow: "0 8px 20px rgba(0,0,0,0.16)", zIndex: 30,
  },
  sidePanel: (m) => ({
    display: "flex", flexDirection: "column",
    maxWidth: m ? "100%" : 380, width: "100%", justifySelf: "end",
    background: "var(--card-bg)", borderRadius: 22, border: "1px solid var(--accent-soft)",
    boxShadow: "0 10px 22px rgba(0,0,0,0.06)", overflow: "hidden",
    minHeight: m ? 420 : "auto",
  }),
  tabBar: {
    display: "flex", borderBottom: "1px solid var(--accent-soft)", flexShrink: 0,
  },
  tabBtn: (active) => ({
    flex: 1, padding: "14px 10px", border: "none", background: "transparent",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    color: active ? "#6f3bd6" : "var(--text-secondary)",
    borderBottom: active ? "2px solid #6f3bd6" : "2px solid transparent",
  }),
  tabCount: {
    display: "inline-block", marginLeft: 4, fontSize: 11, color: "var(--text-muted)",
  },
  tabBody: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" },
  peopleList: { padding: 12, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" },
  personRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
    borderRadius: 12, background: "var(--card-bg)",
  },
  personAvatar: {
    width: 32, height: 32, borderRadius: "50%", background: "var(--accent-gradient)",
    color: "#fff", fontSize: 12, fontWeight: 700, display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  personName: { flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 },
};

const modalStyles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: 20,
  },
  card: {
    width: "min(100%, 460px)", background: "var(--card-bg)", borderRadius: 20,
    padding: "28px 24px", boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
    textAlign: "center", maxHeight: "90vh", overflowY: "auto", position: "relative",
  },
  closeBtn: {
    position: "absolute", top: 12, right: 14, border: "none", background: "transparent",
    fontSize: 18, cursor: "pointer", color: "var(--text-secondary)", lineHeight: 1,
  },
  tag: { fontSize: 11, color: "var(--accent)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px", fontFamily: "Georgia, serif" },
  text: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 18 },
  stats: { display: "flex", gap: 10, justifyContent: "space-between" },
  stat: { flex: 1, background: "var(--card-bg)", borderRadius: 12, padding: 12, border: "1px solid var(--card-border)" },
  label: { fontSize: 11, color: "var(--text-secondary)", margin: "0 0 4px" },
  value: { fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 },
};
