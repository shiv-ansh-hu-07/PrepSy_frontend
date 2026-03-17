import React, { useEffect, useRef, useState } from "react";
import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";

const SESSION_DURATION = 25 * 60;
const RADIUS = 70;
const STROKE = 10;
const CIRCUMFERENCE = Math.PI * RADIUS * 2;

export default function PomodoroTimer({ onLeaveRoom }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  const [, forceTick] = useState(0);
  const completionHandledRef = useRef(false);

  const [phaseStartedAt, setPhaseStartedAt] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [totalSessions, setTotalSessions] = useState(1);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [showNextSessionPrompt, setShowNextSessionPrompt] = useState(false);

  let timeLeft = SESSION_DURATION;

  if (phaseStartedAt) {
    const elapsed = Date.now() - phaseStartedAt;
    timeLeft = Math.max(SESSION_DURATION - Math.floor(elapsed / 1000), 0);
  }

  const isUrgent = timeLeft <= 60 && timeLeft > 0;

  useEffect(() => {
    if (!isRunning) return;

    const id = setInterval(() => {
      forceTick((tick) => tick + 1);
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning]);

  useEffect(() => {
    if (!room || !localParticipant) return;

    const handler = (data, participant) => {
      if (participant?.identity === localParticipant.identity) return;

      let msg;
      try {
        msg = JSON.parse(new TextDecoder().decode(data));
      } catch {
        return;
      }

      if (msg.type !== "POMODORO_SYNC") return;

      setPhaseStartedAt(msg.phaseStartedAt);
      setIsRunning(msg.isRunning);
      setTotalSessions(msg.totalSessions);
      setCompletedSessions(msg.completedSessions);
      setStatusMessage(msg.statusMessage || "");
      setShowNextSessionPrompt(Boolean(msg.showNextSessionPrompt));
      completionHandledRef.current = Boolean(msg.showNextSessionPrompt);
    };

    room.on("dataReceived", handler);
    return () => room.off("dataReceived", handler);
  }, [room, localParticipant]);

  const broadcast = (payload) => {
    if (!room || room.state !== "connected" || !localParticipant) {
      return;
    }

    localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({ type: "POMODORO_SYNC", ...payload })
      ),
      { reliable: true }
    );
  };

  const start = () => {
    const now = Date.now();

    setPhaseStartedAt(now);
    setIsRunning(true);
    setStatusMessage("");
    setShowNextSessionPrompt(false);
    completionHandledRef.current = false;

    broadcast({
      phaseStartedAt: now,
      isRunning: true,
      totalSessions,
      completedSessions,
      statusMessage: "",
      showNextSessionPrompt: false,
    });
  };

  useEffect(() => {
    if (!isRunning || timeLeft !== 0 || completionHandledRef.current) {
      return;
    }

    completionHandledRef.current = true;
    const nextCompletedSessions = completedSessions + 1;
    const reachedTarget = nextCompletedSessions >= totalSessions;
    const nextStatusMessage = reachedTarget
      ? "Nice work. Session complete."
      : `${nextCompletedSessions}/${totalSessions} sessions completed.`;

    setIsRunning(false);
    setPhaseStartedAt(null);
    setCompletedSessions(nextCompletedSessions);
    setStatusMessage(nextStatusMessage);
    setShowNextSessionPrompt(true);

    broadcast({
      phaseStartedAt: null,
      isRunning: false,
      totalSessions,
      completedSessions: nextCompletedSessions,
      statusMessage: nextStatusMessage,
      showNextSessionPrompt: true,
    });
  }, [completedSessions, isRunning, timeLeft, totalSessions]);

  const handleStudyMore = () => {
    start();
  };

  const handleLeaveAfterSession = () => {
    setShowNextSessionPrompt(false);
    onLeaveRoom?.();
  };

  const formatTime = (seconds) =>
    `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60)
      .toString()
      .padStart(2, "0")}`;

  return (
    <div style={styles.wrapper}>
      <p style={styles.title}>Pomodoro Timer</p>

      <div style={{ width: 180, margin: "0 auto" }}>
        <svg width="180" height="90" viewBox="0 0 180 90">
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={STROKE}
          />
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke={isUrgent ? "#fb7185" : "#8a9bd6"}
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={
              CIRCUMFERENCE -
              ((SESSION_DURATION - timeLeft) / SESSION_DURATION) *
                CIRCUMFERENCE
            }
          />
        </svg>

        <div style={styles.time}>{formatTime(timeLeft)}</div>
      </div>

      {statusMessage ? <div style={styles.status}>{statusMessage}</div> : null}

      <div style={styles.controls}>
        <button
          onClick={start}
          style={{
            ...buttonStyle,
            ...(isRunning ? styles.runningButton : null),
          }}
          disabled={isRunning}
        >
          {isRunning ? "Session Running" : "Start Session"}
        </button>
      </div>

      <div style={styles.sessions}>
        <div style={styles.sessionCountRow}>
          <span>Sessions:</span>
          <div style={styles.sessionStepper}>
            <button
              onClick={() => setTotalSessions((count) => Math.max(1, count - 1))}
              style={sessionBtn}
              disabled={isRunning}
            >
              -
            </button>
            <span style={styles.sessionCount}>{totalSessions}</span>
            <button
              onClick={() => setTotalSessions((count) => count + 1)}
              style={sessionBtn}
              disabled={isRunning}
            >
              +
            </button>
          </div>
        </div>

        <div>Completed: {completedSessions}</div>
      </div>

      {showNextSessionPrompt ? (
        <div style={styles.overlay}>
          <div style={styles.promptCard}>
            <h4 style={styles.promptTitle}>One more session?</h4>
            <p style={styles.promptText}>
              You finished this session. Would you like to study for one more?
            </p>
            <div style={styles.promptActions}>
              <button
                onClick={handleStudyMore}
                style={{ ...buttonStyle, ...styles.primaryPromptButton }}
              >
                Yes
              </button>
              <button onClick={handleLeaveAfterSession} style={buttonStyle}>
                No
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    fontFamily: "Inter, system-ui",
    color: "#4a5a85",
    position: "relative",
  },
  title: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  time: {
    textAlign: "center",
    marginTop: -6,
    fontSize: 22,
    fontWeight: 600,
  },
  status: {
    textAlign: "center",
    fontSize: 13,
    color: "#22c55e",
    minHeight: 18,
  },
  controls: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
    marginTop: 6,
  },
  sessions: {
    marginTop: 8,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  sessionCountRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  sessionStepper: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(138,155,214,0.1)",
  },
  sessionCount: {
    minWidth: 18,
    fontWeight: 600,
    color: "#4a5a85",
  },
  runningButton: {
    background: "#E5EAFB",
    color: "#6B7280",
    cursor: "default",
    boxShadow: "none",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(15, 23, 42, 0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    padding: 16,
  },
  promptCard: {
    width: "100%",
    maxWidth: 290,
    background: "#FFFFFF",
    borderRadius: 22,
    padding: "18px 18px 16px",
    boxShadow: "0 20px 40px rgba(15,23,42,0.18)",
    textAlign: "center",
  },
  promptTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#33406b",
  },
  promptText: {
    margin: "10px 0 16px",
    fontSize: 13,
    lineHeight: 1.5,
    color: "#6B7280",
  },
  promptActions: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
  },
  primaryPromptButton: {
    background: "#8a9bd6",
    borderColor: "#8a9bd6",
    color: "#FFFFFF",
  },
};

const buttonStyle = {
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  color: "#4a5a85",
  padding: "10px 18px",
  minWidth: 140,
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 600,
};

const sessionBtn = {
  background: "#FFFFFF",
  border: "1px solid #D9E0F2",
  color: "#4a5a85",
  fontSize: 16,
  cursor: "pointer",
  width: 28,
  height: 28,
  borderRadius: "50%",
  lineHeight: 1,
};
