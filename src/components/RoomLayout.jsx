import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  MessageSquare,
  LogOut,
} from "lucide-react";
import useMediaControls from "../hooks/useMediaControl";
import { useNavigate } from "react-router-dom";
import PomodoroTimer from "./PomodoroTimer";
import { useParticipants } from "@livekit/components-react";
import jsPDF from "jspdf";
import { useEffect, useState } from "react";

export default function RoomLayout({
  children,
  onToggleChat,
  hasUnreadMessages = false,
}) {
  const {
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    leaveRoom,
    micEnabled,
    camEnabled,
    screenEnabled,
    screenShareSupported,
  } = useMediaControls();

  const navigate = useNavigate();
  const participants = useParticipants();
  const participantCount = participants.length;

  const [notes, setNotes] = useState("");
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 980 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => setIsMobile(window.innerWidth < 980);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLeave = () => {
    leaveRoom();
    navigate("/dashboard");
  };

  const handleScreenShare = () => {
    if (!screenShareSupported) {
      window.alert("Screen sharing is supported on desktop browsers only.");
      return;
    }

    toggleScreenShare();
  };

  const downloadNotesAsPDF = () => {
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
          {isMobile ? (
            <div style={styles.sessionBadge}>
              <span style={styles.liveDot} />
              {participantCount} {participantCount === 1 ? "person" : "people"} studying
              <span style={styles.sessionDivider}>•</span>
              Focus session
            </div>
          ) : null}

          <div style={styles.stage}>
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
        </div>

        <div style={styles.sidePanel(isMobile)}>
          <div
            style={{
              ...styles.card,
              height: isMobile ? "auto" : 220,
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
            }}
          >
            <PomodoroTimer />
          </div>

          <div style={{ ...styles.card, minHeight: isMobile ? 240 : 300 }}>
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

      {isMobile ? <div style={styles.bottomBar}>{controls}</div> : null}
    </div>
  );
}

function Control({
  icon: Icon,
  danger,
  active,
  onClick,
  disabled,
  title,
  alert,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 52,
        height: 52,
        borderRadius: 16,
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
      <Icon
        size={22}
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
    padding: "12px 14px 24px",
    boxSizing: "border-box",
    gap: 14,
  },

  centerWrap: (isMobile) => ({
    width: "100%",
    minHeight: "calc(100vh - 140px)",
    maxWidth: 1480,
    alignItems: "stretch",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : "minmax(0, 1.85fr) minmax(320px, 0.72fr)",
    gap: 22,
    boxSizing: "border-box",
  }),

  stageWrap: {
    position: "relative",
    minHeight: 420,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  sessionBadge: {
    fontSize: 13,
    color: "#6B7280",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    background: "rgba(255,255,255,0.88)",
    padding: "10px 14px",
    borderRadius: 18,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    backdropFilter: "blur(6px)",
  },

  sessionBadgeDesktop: {
    position: "absolute",
    top: 18,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 20,
    fontSize: 13,
    color: "#6B7280",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    background: "rgba(255,255,255,0.9)",
    padding: "10px 16px",
    borderRadius: 999,
    boxShadow: "0 8px 18px rgba(0,0,0,0.14)",
    backdropFilter: "blur(8px)",
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#22c55e",
  },

  sessionDivider: {
    color: "#94A3B8",
  },

  stage: {
    width: "100%",
    minHeight: 420,
    height: "100%",
    borderRadius: 28,
    border: "1px solid rgba(238,242,255,0.8)",
    background: "#05070b",
    overflow: "hidden",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "stretch",
    position: "relative",
    boxShadow: "0 20px 40px rgba(15,23,42,0.16)",
  },

  bottomBarDesktop: {
    position: "absolute",
    left: "50%",
    bottom: 18,
    transform: "translateX(-50%)",
    width: "fit-content",
    maxWidth: "100%",
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    padding: "10px 16px",
    background: "#FFFFFF",
    borderRadius: 24,
    boxShadow: "0 10px 26px rgba(0,0,0,0.18)",
    zIndex: 30,
  },

  bottomBar: {
    position: "sticky",
    bottom: 8,
    width: "fit-content",
    maxWidth: "100%",
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    padding: "10px 16px",
    background: "#FFFFFF",
    borderRadius: 18,
    boxShadow: "0 10px 26px rgba(0,0,0,0.08)",
    zIndex: 40,
  },

  sidePanel: (isMobile) => ({
    display: "flex",
    flexDirection: "column",
    gap: 18,
    maxWidth: isMobile ? "100%" : 420,
    width: "100%",
    justifySelf: "end",
  }),

  card: {
    background:
      "radial-gradient(circle at center, rgba(138,155,214,0.14), transparent 65%), #FFFFFF",
    borderRadius: 28,
    padding: 24,
    border: "1px solid #EEF2FF",
    boxShadow: "0 12px 28px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
  },

  cardTitle: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "Georgia, serif",
    color: "#4a5a85",
  },

  notesBox: {
    flex: 1,
    minHeight: 170,
    borderRadius: 20,
    border: "1px solid #E5E7EB",
    padding: 14,
    marginTop: 10,
    marginBottom: 12,
    fontSize: 14,
    fontFamily: "'Inter', system-ui, -apple-system",
    color: "#6B7280",
    resize: "vertical",
    background: "#FFFFFF",
  },

  saveBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    height: 50,
    borderRadius: 18,
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
};
