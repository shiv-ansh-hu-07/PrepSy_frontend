import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  MessageSquare,
  LogOut,
  Copy,
} from "lucide-react";
import useMediaControls from "../hooks/useMediaControl";
import useFocusMonitor from "../hooks/useFocusMonitor";
import { useNavigate } from "react-router-dom";
import PomodoroTimer from "./PomodoroTimer";
import { useParticipants } from "@livekit/components-react";
import { useEffect, useState } from "react";
import api, { fetchMyProfile, saveFocusSession } from "../services/api";

export default function RoomLayout({
  children,
  roomId,
  roomName,
  onToggleChat,
  hasUnreadMessages = false,
  roomDurationMinutes = 90,
}) {
  const {
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    leaveRoom: leaveMediaRoom,
    micEnabled,
    camEnabled,
    screenEnabled,
    screenShareError,
  } = useMediaControls();

  const [aiMonitorEnabled, setAiMonitorEnabled] = useState(false);

  const focusMonitor = useFocusMonitor({ enabled: camEnabled && aiMonitorEnabled, intervalMs: 5000 });

  const navigate = useNavigate();
  const participants = useParticipants();
  const participantCount = participants.length;

  const [notes, setNotes] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState(null);
  const [focusSummary, setFocusSummary] = useState(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 980 : false
  );

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

  useEffect(() => {
    fetchMyProfile().then((res) => {
      if (res?.profile?.aiMonitorConsent) setAiMonitorEnabled(true);
    }).catch(() => {});
  }, []);

  const handleLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    setShowSummary(true);

    // Grab focus summary before camera stops
    const fs = focusMonitor.getSessionSummary();
    setFocusSummary(fs);

    try {
      const res = await api.post(`/rooms/${roomId}/leave`);
      setSummary(res.data);

      if (fs && fs.totalSamples >= 6) {
        saveFocusSession({
          roomId,
          roomName: roomName || res.data?.roomName,
          ...fs,
        }).catch((err) =>
          console.warn("[FocusMonitor] Could not save session:", err?.message)
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLeaving(false);
    }
  };

  const handleCloseSummary = async () => {
    await leaveMediaRoom();
    navigate("/dashboard");
  };

  const handleScreenShare = () => {
    toggleScreenShare();
  };

  const downloadNotesAsPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFont("Times", "Normal");
    doc.setFontSize(16);
    doc.text("PrepSy Study Notes", 20, 20);
    doc.setFontSize(12);
    doc.text(notes || "No notes written.", 20, 40, { maxWidth: 170 });
    doc.save("prepsy-notes.pdf");
  };

  const copyRoomId = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setShareStatus("Room ID copied");
    } catch {
      setShareStatus("Copy failed");
    }
  };

  const controls = (
    <>
      <Control icon={micEnabled ? Mic : MicOff} active={micEnabled} onClick={toggleMic} />
      <Control icon={camEnabled ? Video : VideoOff} active={camEnabled} onClick={toggleCamera} />
      <Control
        icon={ScreenShare}
        active={screenEnabled}
        title="Share screen"
        onClick={handleScreenShare}
      />
      <Control
        icon={MessageSquare}
        onClick={onToggleChat}
        alert={hasUnreadMessages}
        title={hasUnreadMessages ? "New messages" : "Open chat"}
      />
      <Control icon={LogOut} danger onClick={handleLeave} />
    </>
  );

  return (
    <div style={styles.page}>
      {screenShareError && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "#f8fafc", fontSize: 13, fontWeight: 500,
          padding: "10px 18px", borderRadius: 12, zIndex: 9999,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)", whiteSpace: "nowrap",
          maxWidth: "90vw", textAlign: "center",
        }}>
          {screenShareError}
        </div>
      )}
      <div style={styles.centerWrap(isMobile)}>
        <div style={styles.stageWrap}>
          <div style={styles.roomHeaderBar}>
            <div style={styles.roomHeaderTextWrap}>
              <p style={styles.roomHeaderName}>{roomName || "Study Room"}</p>
            </div>
            <button type="button" style={styles.roomHeaderButton} onClick={copyRoomId}>
              <Copy size={15} />
              {shareStatus || "Share"}
            </button>
          </div>

          {isMobile && (
            <div style={styles.sessionBadge}>
              <span style={styles.liveDot} />
              {participantCount} {participantCount === 1 ? "person" : "people"} studying
              <span style={styles.sessionDivider}>•</span>
              Focus session
            </div>
          )}

          <div style={styles.stage} data-room-stage>
            {!isMobile && (
              <div style={styles.sessionBadgeDesktop}>
                <span style={styles.liveDot} />
                {participantCount} {participantCount === 1 ? "person" : "people"} studying
                <span style={styles.sessionDivider}>•</span>
                Focus session
              </div>
            )}
            {children}
            {!isMobile && <div style={styles.bottomBarDesktop}>{controls}</div>}
          </div>

          {isMobile && <div style={styles.mobileControls}>{controls}</div>}
        </div>

        <div style={styles.sidePanel(isMobile)}>
          <div style={{ ...styles.card, minHeight: isMobile ? 210 : 224, overflow: "visible", display: "grid", gridTemplateRows: "auto 1fr auto" }}>
            <PomodoroTimer onLeaveRoom={handleLeave} roomDurationMinutes={roomDurationMinutes} />
          </div>

          <div style={{ ...styles.card, minHeight: isMobile ? 210 : 248 }}>
            <h3 style={styles.cardTitle}>Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Save your notes here..."
              style={styles.notesBox}
            />
            <button style={styles.saveBtn} onClick={downloadNotesAsPDF}>
              Download Notes (PDF)
            </button>
          </div>

          <FocusMonitorCard
            monitor={focusMonitor}
            camEnabled={camEnabled}
            aiMonitorEnabled={aiMonitorEnabled}
            onToggleAiMonitor={() => setAiMonitorEnabled((v) => !v)}
          />
        </div>
      </div>

      {showSummary && (
        <LeaveSummaryModal
          summary={summary}
          focusSummary={focusSummary}
          loading={!summary}
          onClose={handleCloseSummary}
        />
      )}
    </div>
  );
}

// ── AI Focus Monitor sidebar card ────────────────────────────────────────────

function FocusMonitorCard({ monitor, camEnabled, aiMonitorEnabled, onToggleAiMonitor }) {
  const { status, currentLevel, sampleCount } = monitor;

  const statusLine = () => {
    if (!aiMonitorEnabled) return { text: "Face analysis disabled for this session. Toggle to enable.", muted: true };
    if (!camEnabled) return { text: "Camera off — turn on camera to monitor focus", muted: true };
    if (status === "loading") return { text: "Loading AI models…", muted: true };
    if (status === "error") return { text: "Focus monitoring unavailable", muted: true };
    if (status === "no-camera") return { text: "Waiting for camera stream…", muted: true };
    if (status === "active") return { text: `Live · ${sampleCount} sample${sampleCount === 1 ? "" : "s"}`, muted: false };
    return { text: "Turn on camera to start", muted: true };
  };

  const info = statusLine();
  const isLive = aiMonitorEnabled && status === "active";

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={styles.cardTitle}>AI Focus Monitor</h3>
        <span style={{ fontSize: 11, color: isLive ? "#22c55e" : "#b0b8d8", fontWeight: 600 }}>
          {isLive ? "● Live" : "○ Off"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "#9aa4c7" }}>Face analysis</span>
        <button
          type="button"
          onClick={onToggleAiMonitor}
          style={{
            width: 38, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
            background: aiMonitorEnabled ? "#7c3aed" : "#d1d5db",
            position: "relative", transition: "background 0.2s", flexShrink: 0,
            padding: 0,
          }}
          title={aiMonitorEnabled ? "Disable face analysis for this session" : "Enable face analysis for this session"}
        >
          <div style={{
            position: "absolute", top: 2, left: aiMonitorEnabled ? 20 : 2,
            width: 16, height: 16, borderRadius: "50%", background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)", transition: "left 0.2s",
          }} />
        </button>
      </div>

      <p style={{ margin: "0 0 12px", fontSize: 11, color: "#9aa4c7", lineHeight: 1.5 }}>
        {info.text}
      </p>

      {currentLevel ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: currentLevel.color + "18",
            border: `2.5px solid ${currentLevel.color}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: currentLevel.color, lineHeight: 1 }}>
              {currentLevel.score}
            </span>
            <span style={{ fontSize: 9, color: currentLevel.color, fontWeight: 600, opacity: 0.8, marginTop: 1 }}>
              /100
            </span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#2f3b63" }}>
              {currentLevel.label}
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#9aa4c7" }}>
              Updated every 5s
            </p>
          </div>
        </div>
      ) : status === "loading" ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={styles.loadingDot(0)} />
          <div style={styles.loadingDot(120)} />
          <div style={styles.loadingDot(240)} />
          <span style={{ fontSize: 12, color: "#9aa4c7", marginLeft: 4 }}>Loading models…</span>
        </div>
      ) : null}

      {status === "active" && sampleCount >= 3 && (
        <FocusMiniBar sampleCount={sampleCount} />
      )}
    </div>
  );
}

function FocusMiniBar({ sampleCount }) {
  return (
    <div style={{ marginTop: 12, padding: "8px 10px", background: "#f8f9ff", borderRadius: 10 }}>
      <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: "#9aa4c7", textTransform: "uppercase", letterSpacing: 0.5 }}>
        This session
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "#4a5a85" }}>
        {sampleCount} readings captured · scores saved on exit
      </p>
    </div>
  );
}

// ── Leave Summary Modal ──────────────────────────────────────────────────────

function LeaveSummaryModal({ summary, focusSummary, loading, onClose }) {
  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={{ ...modalStyles.card, position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>

        {loading ? (
          <>
            <p style={modalStyles.tag}>SESSION COMPLETE</p>
            <h2 style={modalStyles.title}>Wrapping up…</h2>
            <p style={modalStyles.text}>Saving your session data…</p>
          </>
        ) : (
          <>
            <p style={modalStyles.tag}>SESSION COMPLETE</p>
            <h2 style={modalStyles.title}>Nice work in {summary?.roomName}</h2>
            <p style={modalStyles.text}>{summary?.message}</p>

            <div style={modalStyles.stats}>
              <StatBox label="Time spent" value={summary?.totalTimeLabel} />
              <StatBox label="Studied with" value={`${summary?.studiedWithCount ?? 0} people`} />
              <StatBox label="Streak" value={`🔥 ${summary?.streak ?? 0} day${summary?.streak === 1 ? "" : "s"}`} />
            </div>

            {focusSummary && <FocusSummarySection data={focusSummary} />}

            {!focusSummary && (
              <p style={{ marginTop: 16, fontSize: 12, color: "#b0b8d8", textAlign: "center" }}>
                Turn on camera during sessions to get AI focus analysis
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FocusSummarySection({ data }) {
  const scoreColor = data.focusScore >= 75 ? "#22c55e" : data.focusScore >= 50 ? "#f59e0b" : "#ef4444";
  const verdict =
    data.focusScore >= 80 ? "Excellent focus session!" :
    data.focusScore >= 65 ? "Good focus — keep it up" :
    data.focusScore >= 50 ? "Moderate focus today" :
    "Room to improve focus";

  return (
    <div style={focusStyles.section}>
      <p style={focusStyles.heading}>AI Focus Analysis</p>

      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
        {/* Score ring */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: scoreColor + "18",
          border: `3px solid ${scoreColor}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
            {data.focusScore}
          </span>
          <span style={{ fontSize: 8, color: scoreColor, opacity: 0.8, fontWeight: 600 }}>/100</span>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#2f3b63" }}>{verdict}</p>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "#6b78a0" }}>
            Engagement {data.engagementScore}% · {data.distractionCount} distraction{data.distractionCount === 1 ? "" : "s"}
            {data.offScreenSeconds > 0 ? ` · ${data.offScreenSeconds}s off-screen` : ""}
          </p>
        </div>
      </div>

      {/* High/Med/Low bar */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", height: 8 }}>
          {data.highFocusPercent > 0 && (
            <div style={{ width: `${data.highFocusPercent}%`, background: "#22c55e" }} />
          )}
          {data.medFocusPercent > 0 && (
            <div style={{ width: `${data.medFocusPercent}%`, background: "#f59e0b" }} />
          )}
          {data.lowFocusPercent > 0 && (
            <div style={{ width: `${data.lowFocusPercent}%`, background: "#ef4444" }} />
          )}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 5 }}>
          {[
            { label: "High", pct: data.highFocusPercent, color: "#22c55e" },
            { label: "Medium", pct: data.medFocusPercent, color: "#f59e0b" },
            { label: "Low", pct: data.lowFocusPercent, color: "#ef4444" },
          ].map(({ label, pct, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
              <span style={{ fontSize: 10, color: "#6b78a0" }}>{label} {pct}%</span>
            </div>
          ))}
        </div>
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

// ── Control button ───────────────────────────────────────────────────────────

function Control({ icon, danger, active, onClick, disabled, title, alert }) {
  const IconComponent = icon;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        border: "1px solid #E5E7EB",
        background: disabled ? "#F3F4F6" : danger ? "#F87171" : active ? "#8a9bd6" : "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: active ? "0 6px 18px rgba(138,155,214,0.45)" : "0 4px 12px rgba(0,0,0,0.08)",
        transform: active ? "translateY(-1px)" : "none",
        transition: "all 0.2s ease",
        opacity: disabled ? 0.6 : 1,
        position: "relative",
      }}
    >
      <IconComponent size={20} color={disabled ? "#94A3B8" : danger ? "#FFFFFF" : "#4a5a85"} />
      {alert && !disabled && <span style={styles.alertDot} />}
    </button>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const focusStyles = {
  section: {
    marginTop: 18,
    padding: "14px 16px",
    background: "#f8f9ff",
    borderRadius: 14,
    border: "1px solid #e6e9f8",
  },
  heading: {
    margin: "0 0 12px",
    fontSize: 12,
    fontWeight: 700,
    color: "#6f3bd6",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
};

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.52)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 20,
  },
  card: {
    width: "min(100%, 460px)",
    background: "#fff",
    borderRadius: 20,
    padding: "28px 24px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
    textAlign: "center",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 14,
    border: "none",
    background: "transparent",
    fontSize: 18,
    cursor: "pointer",
    color: "#6b7280",
    lineHeight: 1,
  },
  tag: { fontSize: 11, color: "#8a9bd6", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: 700, color: "#2f3b63", margin: "0 0 8px", fontFamily: "Georgia, serif" },
  text: { fontSize: 14, color: "#6b7280", marginBottom: 18 },
  stats: { display: "flex", gap: 10, justifyContent: "space-between" },
  stat: { flex: 1, background: "#f8f9ff", borderRadius: 12, padding: 12, border: "1px solid #e6e9f8" },
  label: { fontSize: 11, color: "#6b7280", margin: "0 0 4px" },
  value: { fontSize: 15, fontWeight: 700, color: "#1F2937", margin: 0 },
};

const styles = {
  page: {
    width: "100%",
    minHeight: "100%",
    background: "linear-gradient(180deg, #F8FAFF 0%, #EEF2FF 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
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
    border: "1px solid #E6EAF8", background: "rgba(255,255,255,0.92)",
    boxShadow: "0 8px 20px rgba(74,90,133,0.08)",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  roomHeaderTextWrap: { minWidth: 0, display: "flex", alignItems: "center" },
  roomHeaderName: { margin: 0, fontSize: 15, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  roomHeaderButton: {
    height: 30, padding: "0 11px", borderRadius: 999,
    border: "1px solid #D7DDF2", background: "#F8FAFF", color: "#1F2937",
    fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    cursor: "pointer", flexShrink: 0, fontSize: 14,
  },
  sessionBadge: {
    fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7,
    background: "rgba(255,255,255,0.88)", padding: "8px 12px", borderRadius: 16,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)", backdropFilter: "blur(6px)",
  },
  sessionBadgeDesktop: {
    position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 20,
    fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7,
    background: "rgba(255,255,255,0.9)", padding: "8px 14px", borderRadius: 999,
    boxShadow: "0 8px 18px rgba(0,0,0,0.14)", backdropFilter: "blur(8px)",
  },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#22c55e" },
  sessionDivider: { color: "#94A3B8" },
  stage: {
    width: "100%", minHeight: 360, height: "100%", borderRadius: 24,
    border: "1px solid rgba(238,242,255,0.8)", background: "#05070b",
    overflow: "hidden", display: "flex", alignItems: "stretch", justifyContent: "stretch",
    position: "relative", boxShadow: "0 16px 32px rgba(15,23,42,0.14)",
  },
  bottomBarDesktop: {
    position: "absolute", left: "50%", bottom: 14, transform: "translateX(-50%)",
    width: "fit-content", maxWidth: "100%", display: "flex", gap: 8, flexWrap: "wrap",
    justifyContent: "center", padding: "8px 14px", background: "#FFFFFF",
    borderRadius: 20, boxShadow: "0 8px 20px rgba(0,0,0,0.16)", zIndex: 30,
  },
  mobileControls: {
    width: "100%", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
    padding: "8px 12px", background: "#FFFFFF", borderRadius: 16,
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  },
  sidePanel: (m) => ({
    display: "flex", flexDirection: "column", gap: 14,
    maxWidth: m ? "100%" : 380, width: "100%", justifySelf: "end",
  }),
  card: {
    background: "radial-gradient(circle at center, rgba(138,155,214,0.14), transparent 65%), #FFFFFF",
    borderRadius: 22, padding: 18, border: "1px solid #EEF2FF",
    boxShadow: "0 10px 22px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column",
  },
  cardTitle: { marginBottom: 10, fontSize: 15, fontWeight: 600, fontFamily: "Georgia, serif", color: "#4a5a85" },
  notesBox: {
    flex: 1, minHeight: 140, borderRadius: 16, border: "1px solid #E5E7EB",
    padding: 12, marginTop: 6, marginBottom: 10, fontSize: 13,
    fontFamily: "'Inter', system-ui, -apple-system", color: "#6B7280",
    resize: "vertical", background: "#FFFFFF",
  },
  saveBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", marginTop: 10,
    height: 44, borderRadius: 14, border: "none", background: "#8a9bd6",
    color: "#FFFFFF", fontWeight: 600, cursor: "pointer",
    boxShadow: "0 8px 22px rgba(99,102,241,0.28)",
  },
  alertDot: {
    position: "absolute", top: 9, right: 9, width: 10, height: 10,
    borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 0 3px rgba(239,68,68,0.18)",
  },
  loadingDot: (delay) => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#9aa4c7",
    animation: `pulse ${1.2}s ${delay}ms infinite`,
  }),
};
