import React, { useEffect, useRef, useState } from "react";
import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";

/* ================= CONSTANTS ================= */

const SESSION_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

const RADIUS = 70;
const STROKE = 10;
const CIRCUMFERENCE = Math.PI * RADIUS * 2;

/* ================= COMPONENT ================= */

export default function PomodoroTimer() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  const [, forceTick] = useState(0);
  const mountedRef = useRef(true);

  /* ---------- HOST (TEMP: FORCED) ---------- */
  const isHost = true;

  /* ---------- SHARED STATE ---------- */
  const [phase, setPhase] = useState("focus");
  const [phaseStartedAt, setPhaseStartedAt] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const [pausedAt, setPausedAt] = useState(null);
  const [pausedDuration, setPausedDuration] = useState(0);

  const [totalSessions, setTotalSessions] = useState(1);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  /* ---------- SAFE UNMOUNT ---------- */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---------- DERIVED TIME ---------- */
  const phaseDuration =
    phase === "focus" ? SESSION_DURATION : BREAK_DURATION;

  let timeLeft = phaseDuration;

  if (phaseStartedAt) {
    const now = Date.now();
    const effectivePaused =
      pausedDuration +
      (pausedAt ? now - pausedAt : 0);

    const elapsed = now - phaseStartedAt - effectivePaused;
    timeLeft = Math.max(phaseDuration - Math.floor(elapsed / 1000), 0);
  }

  const isUrgent =
    phase === "focus" && timeLeft <= 60 && timeLeft > 0;

  /* ---------- FORCE UI TICK ---------- */
  useEffect(() => {
    if (!isRunning) return;

    const id = setInterval(() => {
      forceTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning]);

  /* ---------- DATA RECEIVE ---------- */
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

      setPhase(msg.phase);
      setPhaseStartedAt(msg.phaseStartedAt);
      setPausedAt(msg.pausedAt);
      setPausedDuration(msg.pausedDuration);
      setIsRunning(msg.isRunning);
      setTotalSessions(msg.totalSessions);
      setCompletedSessions(msg.completedSessions);
      setStatusMessage(msg.statusMessage || "");
    };

    room.on("dataReceived", handler);
    return () => room.off("dataReceived", handler);
  }, [room, localParticipant]);

  /* ---------- BROADCAST ---------- */
  const broadcast = (payload) => {
    if (
      !room ||
      room.state !== "connected" ||
      !localParticipant
    )
      return;

    localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({ type: "POMODORO_SYNC", ...payload })
      ),
      { reliable: true }
    );
  };

  /* ---------- CONTROLS ---------- */
  const start = () => {
    const now = Date.now();

    setPhase("focus");
    setPhaseStartedAt(now);
    setPausedAt(null);
    setPausedDuration(0);
    setIsRunning(true);
    setStatusMessage("");

    broadcast({
      phase: "focus",
      phaseStartedAt: now,
      pausedAt: null,
      pausedDuration: 0,
      isRunning: true,
      totalSessions,
      completedSessions,
      statusMessage: "",
    });

  };

  const pause = () => {
    const now = Date.now();

    setPausedAt(now);
    setIsRunning(false);

    broadcast({
      phase,
      phaseStartedAt,
      pausedAt: now,
      pausedDuration,
      isRunning: false,
      totalSessions,
      completedSessions,
      statusMessage,
    });

  };

  const resume = () => {
    const now = Date.now();
    const addedPause = now - pausedAt;

    setPausedDuration((d) => d + addedPause);
    setPausedAt(null);
    setIsRunning(true);

    broadcast({
      phase,
      phaseStartedAt,
      pausedAt: null,
      pausedDuration: pausedDuration + addedPause,
      isRunning: true,
      totalSessions,
      completedSessions,
      statusMessage,
    });

  };

  const reset = () => {
    setIsRunning(false);
    setPhaseStartedAt(null);
    setPausedAt(null);
    setPausedDuration(0);
    setCompletedSessions(0);
    setStatusMessage("");

    broadcast({
      phase: "focus",
      phaseStartedAt: null,
      pausedAt: null,
      pausedDuration: 0,
      isRunning: false,
      totalSessions,
      completedSessions: 0,
      statusMessage: "",
    });

  };

  /* ================= UI ================= */

  const formatTime = (s) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60)
        .toString()
        .padStart(2, "0")}`;

  return (
    <div style={styles.wrapper}>
      <p style={styles.title}>
        {phase === "break" ? "Break Timer" : "Pomodoro Timer"}
      </p>

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
              ((phaseDuration - timeLeft) / phaseDuration) *
              CIRCUMFERENCE
            }
          />
        </svg>

        <div style={styles.time}>{formatTime(timeLeft)}</div>
      </div>

      {statusMessage && (
        <div style={styles.status}>{statusMessage}</div>
      )}

      <div style={styles.controls}>
        <button
          onClick={() => {
            if (!phaseStartedAt) start();
            else if (isRunning) pause();
            else resume();
          }}
          style={buttonStyle}
        >
          {!phaseStartedAt
            ? "Start"
            : isRunning
              ? "Pause"
              : "Resume"}
        </button>

        <button onClick={reset} style={buttonStyle}>
          Reset
        </button>
      </div>

      <div style={styles.sessions}>
        Sessions:&nbsp;
        <button
          onClick={() =>
            setTotalSessions((s) => Math.max(1, s - 1))
          }
          style={sessionBtn}
        >
          –
        </button>
        &nbsp;{totalSessions}&nbsp;
        <button
          onClick={() => setTotalSessions((s) => s + 1)}
          style={sessionBtn}
        >
          +
        </button>

        <div style={{ marginTop: 6 }}>
          Completed: {completedSessions}
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  wrapper: {
    width: "100%",
    height: "100%",
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    gap: 6,
    fontFamily: "Inter, system-ui",
    color: "#4a5a85",
  },
  title: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: 600,
  },
  hostNote: {
    fontSize: 12,
    color: "#6B7280",
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
  },
  controls: {
    display: "flex",
    justifyContent: "space-around",
    marginTop: 8,
  },
  sessions: {
    marginTop: 8,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
};

const buttonStyle = {
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  color: "#4a5a85",
  padding: "6px 14px",
  borderRadius: 8,
  cursor: "pointer",
};

const sessionBtn = {
  background: "transparent",
  border: "none",
  color: "#4a5a85",
  fontSize: 16,
  cursor: "pointer",
};
