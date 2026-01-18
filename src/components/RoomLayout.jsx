import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  MessageSquare,
  LogOut,
} from "lucide-react";
import useMediaControls from "../hooks/useMediaControls";
import { useNavigate } from "react-router-dom";
import PomodoroTimer from "./PomodoroTimer";
import { useParticipants } from "@livekit/components-react";
import jsPDF from "jspdf";
import {useState } from "react";

/* ================== INJECT ANIMATIONS ================== */
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
  const style = document.createElement("style");
  style.innerHTML = injectedStyles;
  document.head.appendChild(style);
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
  } = useMediaControls();

  const navigate = useNavigate();

  const handleLeave = () => {
    leaveRoom();
    navigate("/dashboard");
  };

  const participants = useParticipants();
  const participantCount = participants.length;

  const [notes, setNotes] = useState("");


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
        {/* LEFT – VIDEO STAGE */}
        <div style={styles.stageWrap}>
          <div style={styles.stage}>{children}</div>

          {/* LIVE STATUS */}
          {/* LIVE STATUS – TOP */}
          <div
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 13,
              color: "#6B7280",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.85)",
              padding: "6px 14px",
              borderRadius: 999,
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              zIndex: 20,
              backdropFilter: "blur(6px)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22c55e",
                animation: "pulseDot 1.6s ease-in-out infinite",
              }}
            />
            {participantCount}{" "}
            {participantCount === 1 ? "person" : "people"} studying • Focus session
          </div>


          {/* BOTTOM CONTROLS */}
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
              onClick={toggleScreenShare}
            />
            <Control icon={MessageSquare} onClick={onToggleChat} />
            <Control icon={LogOut} danger onClick={handleLeave} />
          </div>
        </div>

        {/* RIGHT – SIDE PANEL */}
        <div style={styles.sidePanel}>
          <div
            style={{
              ...styles.card,
              height: 260,
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
            }}
          >
            <PomodoroTimer />
          </div>


          <div style={{ ...styles.card, minHeight: 340 }}>
            <h3 style={styles.cardTitle}>Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Save you notes here..."
              style={styles.notesBox}
            />
            <button
              style={styles.saveBtn}
              onClick={downloadNotesAsPDF}
            >
              Download Notes (PDF)
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= CONTROL BUTTON ================= */

function Control({ icon: Icon, danger, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 52,
        height: 52,
        borderRadius: 16,
        border: "1px solid #E5E7EB",
        background: danger
          ? "#F87171"
          : active
            ? "#8a9bd6"
            : "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: active
          ? "0 6px 18px rgba(138,155,214,0.45)"
          : "0 4px 12px rgba(0,0,0,0.08)",
        transform: active ? "translateY(-1px)" : "none",
        transition: "all 0.2s ease",
      }}
    >
      <Icon size={22} color={danger ? "#FFFFFF" : "#4a5a85"} />
    </button>
  );
}

/* ================= STYLES ================= */

const styles = {
  page: {
    width: "100%",
    minHeight: "100%",
    background:
      "linear-gradient(180deg, #F8FAFF 0%, #EEF2FF 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    fontFamily:
      "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
    paddingBottom: 40,
  },

  centerWrap: {
    width: "100%",
    minHeight: "calc(100vh - 64px)",
    maxWidth: 1500,
    alignItems: "stretch",
    padding: "10px 20px 40px",
    display: "grid",
    gridTemplateColumns: "3.5fr 1.4fr",
    gap: 20,
    boxSizing: "border-box",
  },

  stageWrap: {
    position: "relative",
    height: "100%",
    width: "100%",
    minHeight: 520,
    overflow: "hidden",
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
    minHeight: 520,
  },

  bottomBar: {
  position: "absolute",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  width: "fit-content",
  display: "flex",
  gap: 14,
  padding: "10px 16px",
  background: "#FFFFFF",
  borderRadius: 18,
  boxShadow: "0 10px 26px rgba(0,0,0,0.08)",
  zIndex: 50,
},

  sidePanel: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
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
    borderRadius: 14,
    border: "1px solid #E5E7EB",
    padding: 10,
    marginTop: 10,
    marginBottom: 12,
    fontSize: 14,
    fontFamily:
      "'Inter', system-ui, -apple-system",
    color: "#6B7280",
    resize: "none",
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
    boxShadow:
      "0 8px 22px rgba(99,102,241,0.28)",
  },
};
