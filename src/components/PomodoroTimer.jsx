import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";

const SESSION_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;
const RADIUS = 70;
const STROKE = 10;
const CIRCUMFERENCE = Math.PI * RADIUS * 2;

export default function PomodoroTimer({ onLeaveRoom }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  const [now, setNow] = useState(() => Date.now());
  const completionHandledRef = useRef(false);

  const [phaseStartedAt, setPhaseStartedAt] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [totalSessions, setTotalSessions] = useState(1);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [showNextSessionPrompt, setShowNextSessionPrompt] = useState(false);
  const [showBreakPrompt, setShowBreakPrompt] = useState(false);
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(BREAK_DURATION);
  const [showSettlePrompt, setShowSettlePrompt] = useState(true);
  const [settleSecondsLeft, setSettleSecondsLeft] = useState(60);

  let timeLeft = SESSION_DURATION;

  if (phaseStartedAt) {
    const elapsed = now - phaseStartedAt;
    timeLeft = Math.max(SESSION_DURATION - Math.floor(elapsed / 1000), 0);
  }

  const isUrgent = timeLeft <= 60 && timeLeft > 0;

  useEffect(() => {
    if (!isRunning) return;

    const id = setInterval(() => {
      setNow(Date.now());
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
      setShowBreakPrompt(Boolean(msg.showBreakPrompt));
      setBreakSecondsLeft(msg.breakSecondsLeft ?? BREAK_DURATION);
      setShowSettlePrompt(false);
      completionHandledRef.current = Boolean(msg.showNextSessionPrompt);
    };

    room.on("dataReceived", handler);
    return () => room.off("dataReceived", handler);
  }, [room, localParticipant]);

  const broadcast = useCallback((payload) => {
    if (!room || room.state !== "connected" || !localParticipant) {
      return;
    }

    localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({ type: "POMODORO_SYNC", ...payload })
      ),
      { reliable: true }
    );
  }, [localParticipant, room]);

  const start = useCallback(() => {
    const now = Date.now();

    setNow(now);
    setPhaseStartedAt(now);
    setIsRunning(true);
    setStatusMessage("");
    setShowNextSessionPrompt(false);
    setShowBreakPrompt(false);
    setBreakSecondsLeft(BREAK_DURATION);
    setShowSettlePrompt(false);
    completionHandledRef.current = false;

    broadcast({
      phaseStartedAt: now,
      isRunning: true,
      totalSessions,
      completedSessions,
      statusMessage: "",
      showNextSessionPrompt: false,
      showBreakPrompt: false,
      breakSecondsLeft: BREAK_DURATION,
    });
  }, [broadcast, completedSessions, totalSessions]);

  const showNextSessionReady = useCallback(() => {
    setShowBreakPrompt(false);
    setShowNextSessionPrompt(true);
    setStatusMessage("Break complete. Ready for the next session?");

    broadcast({
      phaseStartedAt: null,
      isRunning: false,
      totalSessions,
      completedSessions,
      statusMessage: "Break complete. Ready for the next session?",
      showNextSessionPrompt: true,
      showBreakPrompt: false,
      breakSecondsLeft: 0,
    });
  }, [broadcast, completedSessions, totalSessions]);

  const completeSession = useCallback(() => {
    const nextCompletedSessions = completedSessions + 1;
    const reachedTarget = nextCompletedSessions >= totalSessions;
    const nextStatusMessage = reachedTarget
      ? "Nice work. Session complete. Time for a break."
      : `${nextCompletedSessions}/${totalSessions} sessions completed. Break time.`;

    setIsRunning(false);
    setPhaseStartedAt(null);
    setCompletedSessions(nextCompletedSessions);
    setStatusMessage(nextStatusMessage);
    setShowBreakPrompt(true);
    setBreakSecondsLeft(BREAK_DURATION);
    setShowNextSessionPrompt(false);

    broadcast({
      phaseStartedAt: null,
      isRunning: false,
      totalSessions,
      completedSessions: nextCompletedSessions,
      statusMessage: nextStatusMessage,
      showNextSessionPrompt: false,
      showBreakPrompt: true,
      breakSecondsLeft: BREAK_DURATION,
    });
  }, [broadcast, completedSessions, totalSessions]);

  useEffect(() => {
    if (
      !showSettlePrompt ||
      isRunning ||
      phaseStartedAt ||
      showNextSessionPrompt ||
      showBreakPrompt
    ) {
      return;
    }

    if (settleSecondsLeft <= 0) {
      queueMicrotask(start);
      return;
    }

    const timerId = setTimeout(() => {
      setSettleSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearTimeout(timerId);
  }, [
    isRunning,
    phaseStartedAt,
    settleSecondsLeft,
    start,
    showBreakPrompt,
    showNextSessionPrompt,
    showSettlePrompt,
  ]);

  useEffect(() => {
    if (!showBreakPrompt || isRunning || phaseStartedAt || showNextSessionPrompt) {
      return;
    }

    if (breakSecondsLeft <= 0) {
      queueMicrotask(showNextSessionReady);
      return;
    }

    const timerId = setTimeout(() => {
      setBreakSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearTimeout(timerId);
  }, [
    breakSecondsLeft,
    isRunning,
    phaseStartedAt,
    showNextSessionReady,
    showBreakPrompt,
    showNextSessionPrompt,
  ]);

  useEffect(() => {
    if (!isRunning || timeLeft !== 0 || completionHandledRef.current) {
      return;
    }

    completionHandledRef.current = true;
    queueMicrotask(completeSession);
  }, [completeSession, isRunning, timeLeft]);

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

      {showBreakPrompt ? (
        <div style={styles.settleOverlay}>
          <div style={styles.settlePromptCard}>
            <h4 style={styles.promptTitle}>Break time</h4>
            <p style={styles.promptText}>
              Step away for a bit, stretch, and reset before the next round.
            </p>
            <div style={styles.settleTimer}>
              Break ends in {formatTime(breakSecondsLeft)}
            </div>
          </div>
        </div>
      ) : null}

      {showSettlePrompt ? (
        <div style={styles.settleOverlay}>
          <div style={styles.settlePromptCard}>
            <h4 style={styles.promptTitle}>Settle down</h4>
            <p style={styles.promptText}>
              Get comfortable, open your notes, and get ready to focus.
            </p>
            <div style={styles.settleTimer}>
              Pomodoro starts in {formatTime(settleSecondsLeft)}
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
    justifyContent: "flex-start",
    gap: 8,
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
    marginTop: 0,
  },
  sessions: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
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
  settleOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(138, 155, 214, 0.18)",
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
  settlePromptCard: {
    width: "100%",
    maxWidth: 290,
    background:
      "radial-gradient(circle at top, rgba(138,155,214,0.18), transparent 70%), #FFFFFF",
    border: "1px solid #E6EAF8",
    borderRadius: 22,
    padding: "18px 18px 16px",
    boxShadow: "0 16px 34px rgba(74, 90, 133, 0.16)",
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
  settleTimer: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 170,
    padding: "10px 14px",
    borderRadius: 999,
    background: "#EEF2FF",
    color: "#4a5a85",
    fontWeight: 700,
    fontSize: 14,
  },
};

const buttonStyle = {
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  color: "#4a5a85",
  padding: "6px 12px",
  minWidth: 96,
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

const sessionBtn = {
  background: "#FFFFFF",
  border: "1px solid #D9E0F2",
  color: "#4a5a85",
  fontSize: 14,
  cursor: "pointer",
  width: 24,
  height: 24,
  borderRadius: "50%",
  lineHeight: 1,
};
