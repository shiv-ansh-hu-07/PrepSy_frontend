import { useEffect, useRef, useCallback } from "react";
import YouTube from "react-youtube";
import { useRoomContext, useLocalParticipant, useParticipants } from "@livekit/components-react";

// ── Sync protocol ────────────────────────────────────────────────────────────
// All events sent via LiveKit data channel (same as Pomodoro + chat).
// { type: "YT_SYNC", action: "PLAY"|"PAUSE"|"SEEK", videoId, currentTime, ts }
// { type: "YT_REQUEST_SYNC" }  — new joiner asks for current state

const SYNC_TYPE = "YT_SYNC";
const REQUEST_TYPE = "YT_REQUEST_SYNC";
const DRIFT_TOLERANCE_S = 2; // only re-seek if drift > 2 seconds
const HEARTBEAT_MS = 15000;  // periodic sync every 15s to prevent drift

export default function YouTubeRoom({ videoId }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const playerRef = useRef(null);       // YT.Player instance
  const isSyncingRef = useRef(false);   // suppress re-broadcast while applying remote sync
  const heartbeatRef = useRef(null);

  // ── Broadcast helpers ─────────────────────────────────────────────────────

  const broadcast = useCallback((payload) => {
    if (!room || room.state !== "connected" || !localParticipant) return;
    localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(payload)),
      { reliable: true }
    );
  }, [room, localParticipant]);

  const broadcastState = useCallback((action, extra = {}) => {
    const player = playerRef.current;
    if (!player) return;
    broadcast({
      type: SYNC_TYPE,
      action,
      videoId,
      currentTime: player.getCurrentTime?.() ?? 0,
      ts: Date.now(),
      ...extra,
    });
  }, [broadcast, videoId]);

  // ── Apply incoming sync (with drift correction) ───────────────────────────

  const applySync = useCallback((msg) => {
    const player = playerRef.current;
    if (!player) return;

    const networkDelay = (Date.now() - msg.ts) / 1000;
    const targetTime = msg.currentTime + networkDelay;

    isSyncingRef.current = true;

    if (msg.action === "PAUSE") {
      player.seekTo(msg.currentTime, true);
      player.pauseVideo();
    } else if (msg.action === "PLAY") {
      const currentTime = player.getCurrentTime?.() ?? 0;
      if (Math.abs(currentTime - targetTime) > DRIFT_TOLERANCE_S) {
        player.seekTo(targetTime, true);
      }
      player.playVideo();
    } else if (msg.action === "SEEK") {
      player.seekTo(targetTime, true);
      // maintain current play/pause state
    }

    // Release sync lock after player has processed the command
    setTimeout(() => { isSyncingRef.current = false; }, 300);
  }, []);

  // ── Respond to new-joiner sync request ────────────────────────────────────

  const handleSyncRequest = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    // Only the participant with the lexicographically first identity responds
    // to avoid everyone replying at once
    const sorted = [...participants].sort((a, b) =>
      a.identity.localeCompare(b.identity)
    );
    if (sorted[0]?.identity !== localParticipant?.identity) return;

    const state = player.getPlayerState?.();
    const isPlaying = state === 1; // YT.PlayerState.PLAYING
    broadcastState(isPlaying ? "PLAY" : "PAUSE");
  }, [participants, localParticipant, broadcastState]);

  // ── Listen for data events ────────────────────────────────────────────────

  useEffect(() => {
    if (!room) return;

    const handler = (payload, participant) => {
      if (participant?.identity === localParticipant?.identity) return;
      let msg;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }

      if (msg.type === SYNC_TYPE) applySync(msg);
      if (msg.type === REQUEST_TYPE) handleSyncRequest();
    };

    room.on("dataReceived", handler);
    return () => room.off("dataReceived", handler);
  }, [room, localParticipant, applySync, handleSyncRequest]);

  // ── Request sync on mount (new joiner) ────────────────────────────────────

  useEffect(() => {
    if (!room || room.state !== "connected") return;
    // Small delay so player has time to initialise before we receive a response
    const id = setTimeout(() => {
      broadcast({ type: REQUEST_TYPE });
    }, 1500);
    return () => clearTimeout(id);
  }, [room, broadcast]);

  // ── Periodic heartbeat to prevent drift ──────────────────────────────────

  useEffect(() => {
    heartbeatRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const state = player.getPlayerState?.();
      if (state === 1) broadcastState("PLAY"); // only host-style broadcast when playing
    }, HEARTBEAT_MS);
    return () => clearInterval(heartbeatRef.current);
  }, [broadcastState]);

  // ── YouTube player event handlers ─────────────────────────────────────────

  const onReady = useCallback((e) => {
    playerRef.current = e.target;
  }, []);

  const onStateChange = useCallback((e) => {
    if (isSyncingRef.current) return; // skip — this change was caused by applySync
    const YT_PLAYING = 1;
    const YT_PAUSED = 2;
    const YT_ENDED = 0;
    if (e.data === YT_PLAYING) broadcastState("PLAY");
    if (e.data === YT_PAUSED) broadcastState("PAUSE");
    if (e.data === YT_ENDED) broadcastState("PAUSE");
  }, [broadcastState]);

  // Manual seek detection — YouTube API doesn't fire a "seeked" event,
  // but PAUSE immediately followed by PLAY with a time jump signals a seek.
  // onStateChange covers this adequately for watch-party use.

  // ── Participant mic indicators ────────────────────────────────────────────

  const others = participants.filter(
    (p) => p.identity !== localParticipant?.identity
  );

  return (
    <div style={styles.shell}>
      {/* Participant indicators */}
      {others.length > 0 && (
        <div style={styles.participantBar}>
          {others.map((p) => (
            <div key={p.identity} style={styles.participantChip}>
              <span style={styles.dot} />
              {p.name || p.identity}
            </div>
          ))}
        </div>
      )}

      {/* YouTube player */}
      <div style={styles.playerWrap}>
        <YouTube
          videoId={videoId}
          opts={{
            width: "100%",
            height: "100%",
            playerVars: {
              autoplay: 0,
              modestbranding: 1,
              rel: 0,
              fs: 1,
            },
          }}
          style={styles.ytEmbed}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      </div>

      <p style={styles.hint}>
        ▶ Anyone in this room can play, pause, or seek — everyone stays in sync.
        Each person's view counts for the creator.
      </p>
    </div>
  );
}

const styles = {
  shell: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "#05070b",
    borderRadius: 24,
    overflow: "hidden",
  },
  participantBar: {
    display: "flex",
    gap: 8,
    padding: "10px 16px",
    background: "rgba(255,255,255,0.04)",
    flexWrap: "wrap",
  },
  participantChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 500,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#22c55e",
    flexShrink: 0,
  },
  playerWrap: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
  ytEmbed: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  hint: {
    margin: 0,
    padding: "8px 16px",
    fontSize: 11,
    color: "rgba(148,163,184,0.7)",
    background: "rgba(255,255,255,0.03)",
    textAlign: "center",
  },
};
