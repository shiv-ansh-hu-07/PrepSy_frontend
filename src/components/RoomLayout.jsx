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
import { useNavigate } from "react-router-dom";
import PomodoroTimer from "./PomodoroTimer";
import { useParticipants } from "@livekit/components-react";
import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function RoomLayout({
  children,
  roomId,
  roomName,
  onToggleChat,
  onLeave,
  hasUnreadMessages = false,
}) {
  const { user, refreshUser } = useAuth();
  const {
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    leaveRoom: leaveMediaRoom,
    micEnabled,
    camEnabled,
    screenEnabled,
    screenShareSupported,
  } = useMediaControls();

  const navigate = useNavigate();
  const participants = useParticipants();
  const participantCount = participants.length;

  const [notes, setNotes] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [leaveSummary, setLeaveSummary] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [enteredAt] = useState(() => Date.now());
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 980 : false
  );


  useEffect(() => {
    if (!shareStatus) return undefined;

    const timeoutId = window.setTimeout(() => setShareStatus(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [shareStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => setIsMobile(window.innerWidth < 980);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const finishLeave = async () => {
    await leaveRoom();

    if (typeof onLeave === "function") {
      onLeave();
      return;
    }

    navigate("/dashboard");
  };

  const handleLeave = async () => {
  if (leaving) return;

  setLeaving(true);

  setShowSummary(true);

  try {
    const res = await api.post(`/rooms/${roomId}/leave`);

    setSummary(res.data);

    setTimeout(async () => {
      await leaveMediaRoom(); 
      navigate("/dashboard"); 
    }, 1500);

  } catch (err) {
    console.error(err);
  } finally {
    setLeaving(false);
  }
};

  const handleScreenShare = () => {
    if (!screenShareSupported) {
      window.alert("Screen sharing is supported on desktop browsers only.");
      return;
    }

    toggleScreenShare();
  };

  const downloadNotesAsPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFont("Times", "Normal");
    doc.setFontSize(16);
    doc.text("PrepSy Study Notes", 20, 20);
    doc.setFontSize(12);
    doc.text(notes || "No notes written.", 20, 40, {
      maxWidth: 170,
    });
    doc.save("prepsy-notes.pdf");
  };

  const copyRoomId = async () => {
    if (!roomId) return;

    try {
      await navigator.clipboard.writeText(roomId);
      setShareStatus("Room ID copied");
    } catch (error) {
      console.warn("Unable to copy room ID:", error);
      setShareStatus("Copy failed");
    }
  };

  const controls = (
    <>
      <Control
        icon={micEnabled ? Mic : MicOff}
        active={micEnabled}
        onClick={toggleMic}
      />
      <Control
        icon={camEnabled ? Video : VideoOff}
        active={camEnabled}
        onClick={toggleCamera}
      />
      <Control
        icon={ScreenShare}
        active={screenEnabled}
        disabled={!screenShareSupported}
        title={
          screenShareSupported
            ? "Share screen"
            : "Screen sharing is available on desktop browsers only"
        }
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

          {isMobile ? (
            <div style={styles.sessionBadge}>
              <span style={styles.liveDot} />
              {participantCount} {participantCount === 1 ? "person" : "people"} studying
              <span style={styles.sessionDivider}>•</span>
              Focus session
            </div>
          ) : null}

          <div style={styles.stage} data-room-stage>
            {!isMobile ? (
              <div style={styles.sessionBadgeDesktop}>
                <span style={styles.liveDot} />
                {participantCount} {participantCount === 1 ? "person" : "people"} studying
                <span style={styles.sessionDivider}>•</span>
                Focus session
              </div>
            ) : null}

            {children}

            {!isMobile ? <div style={styles.bottomBarDesktop}>{controls}</div> : null}
          </div>

          {isMobile ? <div style={styles.mobileControls}>{controls}</div> : null}
        </div>

        <div style={styles.sidePanel(isMobile)}>
          <div
            style={{
              ...styles.card,
              minHeight: isMobile ? 210 : 224,
              overflow: "visible",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
            }}
          >
            <PomodoroTimer onLeaveRoom={handleLeave} />
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
        </div>
      </div>

      {showSummary && (
        <LeaveSummaryModal
          summary={summary}
          loading={!summary}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
}

function formatMinutes(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0
    ? `${hours}h`
    : `${hours}h ${remainingMinutes}m`;
}

function LeaveSummaryModal({ summary, loading }) {
  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.card}>
        {loading ? (
          <>
            <p style={modalStyles.tag}>SESSION COMPLETE</p>
            <h2 style={modalStyles.title}>Wrapping up your session...</h2>
            <p style={modalStyles.text}>Calculating your study insights...</p>
          </>
        ) : (
          <>
            <p style={modalStyles.tag}>SESSION COMPLETE</p>

            <h2 style={modalStyles.title}>
              Nice work in {summary.roomName}
            </h2>

            <p style={modalStyles.text}>
              {summary.message}
            </p>

            <div style={modalStyles.stats}>
              <div style={modalStyles.stat}>
                <p style={modalStyles.label}>Time spent</p>
                <p style={modalStyles.value}>{summary.totalTimeLabel}</p>
              </div>

              <div style={modalStyles.stat}>
                <p style={modalStyles.label}>Studied with</p>
                <p style={modalStyles.value}>
                  {summary.studiedWithCount} people
                </p>
              </div>

              <div style={modalStyles.stat}>
                <p style={modalStyles.label}>Streak</p>
                <p style={modalStyles.value}>
                  🔥 {summary.streak} day{summary.streak === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  card: {
    width: 420,
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    textAlign: "center",
  },
  tag: {
    fontSize: 12,
    color: "#8a9bd6",
    marginBottom: 8,
    fontWeight: 600,
  },
  title: {
    fontSize: 22,
    fontWeight: 600,
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  stats: {
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  stat: {
    flex: 1,
    background: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
  },
  label: {
    fontSize: 12,
    color: "#6b7280",
  },
  value: {
    fontSize: 16,
    fontWeight: 600,
  },
};

function SummaryStat({ label, value }) {
  return (
    <div style={styles.summaryStat}>
      <p style={styles.summaryLabel}>{label}</p>
      <p style={styles.summaryValue}>{value}</p>
    </div>
  );
}

function Control({
  icon,
  danger,
  active,
  onClick,
  disabled,
  title,
  alert,
}) {
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
        background: disabled
          ? "#F3F4F6"
          : danger
            ? "#F87171"
            : active
              ? "#8a9bd6"
              : "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: active
          ? "0 6px 18px rgba(138,155,214,0.45)"
          : "0 4px 12px rgba(0,0,0,0.08)",
        transform: active ? "translateY(-1px)" : "none",
        transition: "all 0.2s ease",
        opacity: disabled ? 0.6 : 1,
        position: "relative",
      }}
    >
      <IconComponent
        size={20}
        color={disabled ? "#94A3B8" : danger ? "#FFFFFF" : "#4a5a85"}
      />
      {alert && !disabled ? <span style={styles.alertDot} /> : null}
    </button>
  );
}

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

  centerWrap: (isMobile) => ({
    width: "100%",
    minHeight: "calc(100vh - 118px)",
    maxWidth: 1420,
    alignItems: "stretch",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : "minmax(0, 1.92fr) minmax(300px, 0.68fr)",
    gap: 16,
    boxSizing: "border-box",
  }),

  stageWrap: {
    position: "relative",
    minHeight: 360,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  roomHeaderBar: {
    minHeight: 42,
    padding: "8px 14px",
    borderRadius: 16,
    border: "1px solid #E6EAF8",
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 8px 20px rgba(74,90,133,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  roomHeaderTextWrap: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
  },

  roomHeaderName: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },

  roomHeaderButton: {
    height: 30,
    padding: "0 11px",
    borderRadius: 999,
    border: "1px solid #D7DDF2",
    background: "#F8FAFF",
    color: "#1F2937",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    flexShrink: 0,
    fontSize: 14,
  },

  sessionBadge: {
    fontSize: 12,
    color: "#6B7280",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    background: "rgba(255,255,255,0.88)",
    padding: "8px 12px",
    borderRadius: 16,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    backdropFilter: "blur(6px)",
  },

  sessionBadgeDesktop: {
    position: "absolute",
    top: 14,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 20,
    fontSize: 12,
    color: "#6B7280",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    background: "rgba(255,255,255,0.9)",
    padding: "8px 14px",
    borderRadius: 999,
    boxShadow: "0 8px 18px rgba(0,0,0,0.14)",
    backdropFilter: "blur(8px)",
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#22c55e",
  },

  sessionDivider: {
    color: "#94A3B8",
  },

  stage: {
    width: "100%",
    minHeight: 360,
    height: "100%",
    borderRadius: 24,
    border: "1px solid rgba(238,242,255,0.8)",
    background: "#05070b",
    overflow: "hidden",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "stretch",
    position: "relative",
    boxShadow: "0 16px 32px rgba(15,23,42,0.14)",
  },

  bottomBarDesktop: {
    position: "absolute",
    left: "50%",
    bottom: 14,
    transform: "translateX(-50%)",
    width: "fit-content",
    maxWidth: "100%",
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    padding: "8px 14px",
    background: "#FFFFFF",
    borderRadius: 20,
    boxShadow: "0 8px 20px rgba(0,0,0,0.16)",
    zIndex: 30,
  },

  mobileControls: {
    width: "100%",
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    padding: "8px 12px",
    background: "#FFFFFF",
    borderRadius: 16,
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  },

  sidePanel: (isMobile) => ({
    display: "flex",
    flexDirection: "column",
    gap: 14,
    maxWidth: isMobile ? "100%" : 380,
    width: "100%",
    justifySelf: "end",
  }),

  card: {
    background:
      "radial-gradient(circle at center, rgba(138,155,214,0.14), transparent 65%), #FFFFFF",
    borderRadius: 22,
    padding: 18,
    border: "1px solid #EEF2FF",
    boxShadow: "0 10px 22px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
  },

  cardTitle: {
    marginBottom: 10,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "Georgia, serif",
    color: "#4a5a85",
  },

  notesBox: {
    flex: 1,
    minHeight: 140,
    borderRadius: 16,
    border: "1px solid #E5E7EB",
    padding: 12,
    marginTop: 6,
    marginBottom: 10,
    fontSize: 13,
    fontFamily: "'Inter', system-ui, -apple-system",
    color: "#6B7280",
    resize: "vertical",
    background: "#FFFFFF",
  },

  saveBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    height: 44,
    borderRadius: 14,
    border: "none",
    background: "#8a9bd6",
    color: "#FFFFFF",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 8px 22px rgba(99,102,241,0.28)",
  },

  alertDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#ef4444",
    boxShadow: "0 0 0 3px rgba(239,68,68,0.18)",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background: "rgba(15,23,42,0.48)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  modalPanel: {
    width: "min(100%, 520px)",
    borderRadius: 22,
    border: "1px solid #E6EAF8",
    background: "#FFFFFF",
    boxShadow: "0 24px 70px rgba(15,23,42,0.28)",
    padding: 24,
    color: "#334155",
  },

  modalEyebrow: {
    margin: 0,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0,
    color: "#8a9bd6",
    textTransform: "uppercase",
  },

  modalTitle: {
    margin: "8px 0 10px",
    fontSize: 26,
    lineHeight: 1.2,
    color: "#2f3b63",
    fontFamily: "Georgia, serif",
  },

  modalMessage: {
    margin: 0,
    color: "#5E6C92",
    lineHeight: 1.6,
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    marginTop: 18,
  },

  summaryStat: {
    borderRadius: 14,
    border: "1px solid #EEF2FF",
    background: "#F8FAFF",
    padding: "12px 10px",
    minWidth: 0,
  },

  summaryLabel: {
    margin: 0,
    fontSize: 12,
    color: "#6B7280",
  },

  summaryValue: {
    margin: "6px 0 0",
    fontSize: 18,
    fontWeight: 700,
    color: "#1F2937",
    overflowWrap: "anywhere",
  },

  modalButton: {
    marginTop: 20,
    width: "100%",
    height: 44,
    borderRadius: 12,
    border: "none",
    background: "#8a9bd6",
    color: "#FFFFFF",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(138,155,214,0.34)",
  },
};
