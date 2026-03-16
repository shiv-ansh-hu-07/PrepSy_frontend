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

const injectedStyles = `
@keyframes ambientPulse {
  0% { opacity: 0.95; }
  50% { opacity: 1; }
  100% { opacity: 0.95; }
}

@keyframes pulseDot {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}
`;

if (typeof document !== "undefined") {
  const existingStyle = document.getElementById("prepsy-room-layout-animations");
  if (!existingStyle) {
    const style = document.createElement("style");
    style.id = "prepsy-room-layout-animations";
    style.innerHTML = injectedStyles;
    document.head.appendChild(style);
  }
}

export default function RoomLayout({ children, onToggleChat }) {
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

  return (
    <div style={styles.page}>
      <div style={styles.centerWrap}>
        <div style={styles.stageWrap}>
          <div style={styles.sessionBadge}>
            <span style={styles.liveDot} />
            {participantCount} {participantCount === 1 ? "person" : "people"} studying
            <span style={styles.sessionDivider}>•</span>
            Focus session
          </div>

          <div style={styles.stage}>{children}</div>
        </div>

        <div style={styles.sidePanel}>
          <div
            style={{
              ...styles.card,
              height: isMobile ? "auto" : 260,
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
            }}
          >
            <PomodoroTimer />
          </div>

          <div style={{ ...styles.card, minHeight: isMobile ? 240 : 340 }}>
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

      <div style={styles.bottomBar}>
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
          onClick={() => {
            if (!screenShareSupported) {
              window.alert(
                "Screen sharing is supported on desktop browsers only."
              );
              return;
            }
            toggleScreenShare();
          }}
        />
        <Control icon={MessageSquare} onClick={onToggleChat} />
        <Control icon={LogOut} danger onClick={handleLeave} />
      </div>
    </div>
  );
}

function Control({ icon: Icon, danger, active, onClick, disabled, title }) {
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
      }}
    >
      <Icon
        size={22}
        color={disabled ? "#94A3B8" : danger ? "#FFFFFF" : "#4a5a85"}
      />
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
    padding: "10px 12px 24px",
    boxSizing: "border-box",
    gap: 14,
  },

  centerWrap: {
    width: "100%",
    minHeight: "calc(100vh - 140px)",
    maxWidth: 1500,
    alignItems: "stretch",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 18,
    boxSizing: "border-box",
  },

  stageWrap: {
    position: "relative",
    height: "100%",
    width: "100%",
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
    background: "rgba(255,255,255,0.85)",
    padding: "10px 14px",
    borderRadius: 18,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    backdropFilter: "blur(6px)",
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#22c55e",
    animation: "pulseDot 1.6s ease-in-out infinite",
  },

  sessionDivider: {
    color: "#94A3B8",
  },

  stage: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 22,
    border: "1px solid #EEF2FF",
    background:
      "radial-gradient(circle at center, rgba(138,155,214,0.22), transparent 65%), #FFFFFF",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "ambientPulse 8s ease-in-out infinite",
    minHeight: 420,
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

  sidePanel: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  card: {
    background:
      "radial-gradient(circle at center, rgba(138,155,214,0.14), transparent 65%), #FFFFFF",
    borderRadius: 22,
    padding: 20,
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
    borderRadius: 14,
    border: "1px solid #E5E7EB",
    padding: 10,
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
    height: 40,
    borderRadius: 14,
    border: "none",
    background: "#8a9bd6",
    color: "#FFFFFF",
    fontWeight: 500,
    cursor: "pointer",
    boxShadow: "0 8px 22px rgba(99,102,241,0.28)",
  },
};
