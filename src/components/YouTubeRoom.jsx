import { useEffect, useRef, useCallback, useState } from "react";
import YouTube from "react-youtube";
import { useRoomContext, useLocalParticipant, useParticipants } from "@livekit/components-react";
import { fetchRoomVideoState, saveRoomVideoState, markVideoWatched } from "../services/api";

// ── Sync protocol ────────────────────────────────────────────────────────────
// All events sent via LiveKit data channel (same as Pomodoro + chat).
// { type: "YT_SYNC", action: "PLAY"|"PAUSE"|"SEEK", videoId, currentTime, ts }
// { type: "YT_REQUEST_SYNC" }  — new joiner asks for current state

const SYNC_TYPE = "YT_SYNC";
const REQUEST_TYPE = "YT_REQUEST_SYNC";
const DRIFT_TOLERANCE_S = 2; // only re-seek if drift > 2 seconds
const HEARTBEAT_MS = 15000;  // periodic sync every 15s to prevent drift

export default function YouTubeRoom({
  roomId = null,
  videoId,
  playlistId,
  locked = false,
  restrictVideoIds = null,
  segment = null,
  segmentPart = null,
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const lockedRef = useRef(locked);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  const playerRef = useRef(null);       // YT.Player instance
  const isSyncingRef = useRef(false);   // suppress re-broadcast while applying remote sync
  const heartbeatRef = useRef(null);
  const savedStateRef = useRef(null);   // persisted playback memory for this room
  const receivedSyncRef = useRef(false); // a live participant has synced us this session
  const watchedRef = useRef(new Set());  // videoIds this client already marked watched

  // Current video's title + channel, for creator attribution. Read live from
  // the player so it stays correct as the playlist advances.
  const [videoMeta, setVideoMeta] = useState(null);
  const captureVideoMeta = useCallback((player) => {
    const data = player?.getVideoData?.();
    if (data?.video_id) {
      setVideoMeta({ title: data.title, author: data.author, videoId: data.video_id });
    }
  }, []);

  // Cohort rooms restrict playback to the day's content. The data can arrive
  // after the player is ready, so keep the latest in a ref and apply it both on
  // ready and whenever it changes.
  const restrictRef = useRef({ restrictVideoIds, segment });
  useEffect(() => {
    restrictRef.current = { restrictVideoIds, segment };
  }, [restrictVideoIds, segment]);
  const applyRestriction = useCallback(
    (player, r) => {
      if (!player) return false;
      if (r?.segment?.videoId) {
        // A single video's time slice — the player auto-stops at endSeconds.
        player.cueVideoById?.({
          videoId: r.segment.videoId,
          startSeconds: r.segment.startSec ?? 0,
          endSeconds: r.segment.endSec ?? undefined,
        });
      } else if (r?.restrictVideoIds?.length) {
        player.cuePlaylist?.({ playlist: r.restrictVideoIds });
      } else {
        return false;
      }
      if (lockedRef.current) player.pauseVideo?.();
      captureVideoMeta(player);
      return true;
    },
    [captureVideoMeta],
  );

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

  // ── Persist playback memory (so an empty room resumes, not restarts) ───────

  const isHost = useCallback(() => {
    const sorted = [...participants].sort((a, b) => a.identity.localeCompare(b.identity));
    return sorted[0]?.identity === localParticipant?.identity;
  }, [participants, localParticipant]);

  const persistState = useCallback(() => {
    const player = playerRef.current;
    if (!player || !roomId) return;
    const data = player.getVideoData?.();
    saveRoomVideoState(roomId, {
      videoId: data?.video_id || null,
      positionSec: Math.round(player.getCurrentTime?.() || 0),
      playing: player.getPlayerState?.() === 1,
    }).catch(() => {});
  }, [roomId]);

  // Record (once) that THIS user finished a video — feeds per-member cohort
  // progress. Server no-ops for non-cohort rooms / non-members.
  const markWatched = useCallback((vid) => {
    if (!roomId || !vid || watchedRef.current.has(vid)) return;
    watchedRef.current.add(vid);
    markVideoWatched(roomId, vid).catch(() => {});
  }, [roomId]);

  // ── Apply incoming sync (with drift correction) ───────────────────────────

  const applySync = useCallback((msg) => {
    const player = playerRef.current;
    if (!player) return;

    receivedSyncRef.current = true; // a live peer is driving our position now
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
      // Still land at the synced position, but don't let it audibly/visibly
      // play until the local prep countdown has finished.
      if (lockedRef.current) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
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

  // ── Auto-start once the prep-timer lock naturally releases ────────────────

  const wasLockedRef = useRef(locked);
  useEffect(() => {
    if (wasLockedRef.current && !locked) {
      playerRef.current?.playVideo?.();
    }
    wasLockedRef.current = locked;
  }, [locked]);

  // ── Request sync on mount (new joiner) ────────────────────────────────────

  useEffect(() => {
    if (!room || room.state !== "connected") return;
    // Small delay so player has time to initialise before we receive a response
    const id = setTimeout(() => {
      broadcast({ type: REQUEST_TYPE });
    }, 1500);
    return () => clearTimeout(id);
  }, [room, broadcast]);

  // ── Load this room's saved playback memory on mount ───────────────────────

  useEffect(() => {
    if (!roomId) return;
    fetchRoomVideoState(roomId)
      .then((s) => { savedStateRef.current = s || null; })
      .catch(() => {});
  }, [roomId]);

  // ── Resume from saved memory if nobody synced us (empty-room case) ─────────

  useEffect(() => {
    if (!room) return undefined;
    // Wait past the 1500ms sync request + a response window. If a live peer
    // synced us, do nothing (we joined the group's live position). Otherwise
    // resume the room's last saved video + position instead of restarting.
    const id = setTimeout(() => {
      if (receivedSyncRef.current) return;
      const saved = savedStateRef.current;
      const player = playerRef.current;
      if (!player || !saved || !saved.videoId) return;

      isSyncingRef.current = true;
      const list = restrictRef.current?.restrictVideoIds;
      const idx = list?.length ? list.indexOf(saved.videoId) : -1;
      if (idx >= 0) {
        player.loadPlaylist?.({ playlist: list, index: idx, startSeconds: saved.positionSec || 0 });
      } else {
        player.loadVideoById?.({ videoId: saved.videoId, startSeconds: saved.positionSec || 0 });
      }
      if (lockedRef.current || !saved.playing) player.pauseVideo?.();
      captureVideoMeta(player);
      setTimeout(() => { isSyncingRef.current = false; }, 500);
    }, 2800);
    return () => clearTimeout(id);
  }, [room, captureVideoMeta]);

  // ── Periodic heartbeat: sync drift + persist playback memory (host only) ──

  useEffect(() => {
    heartbeatRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const state = player.getPlayerState?.();
      if (state === 1) broadcastState("PLAY"); // only host-style broadcast when playing
      if (isHost()) persistState(); // one writer keeps the room's memory fresh
      // Count a video as watched for THIS user once ~90% is seen.
      const dur = player.getDuration?.() || 0;
      const cur = player.getCurrentTime?.() || 0;
      if (dur > 0 && cur / dur >= 0.9) markWatched(player.getVideoData?.()?.video_id);
    }, HEARTBEAT_MS);
    return () => clearInterval(heartbeatRef.current);
  }, [broadcastState, isHost, persistState, markWatched]);

  // ── YouTube player event handlers ─────────────────────────────────────────

  const onReady = useCallback((e) => {
    playerRef.current = e.target;
    // Cohort rooms restrict to the day's videos/segment; otherwise fall back to
    // playlist-only mode.
    const applied = applyRestriction(e.target, restrictRef.current);
    if (!applied && !videoId && playlistId) {
      e.target.loadPlaylist({ list: playlistId, listType: "playlist", index: 0 });
    }
    // Safety net: some browsers/embeds can start playback right on load
    // despite autoplay:0. Never let that slip past the prep-timer lock.
    if (lockedRef.current) {
      e.target.pauseVideo?.();
    }
    captureVideoMeta(e.target);
  }, [videoId, playlistId, captureVideoMeta, applyRestriction]);

  // Apply (or re-apply) the day's restriction if it arrives / changes after the
  // player is already up.
  useEffect(() => {
    if (playerRef.current) {
      applyRestriction(playerRef.current, { restrictVideoIds, segment });
    }
  }, [restrictVideoIds, segment, applyRestriction]);

  const onStateChange = useCallback((e) => {
    const YT_PLAYING = 1;
    const YT_PAUSED = 2;
    const YT_ENDED = 0;

    // While locked, playback is not allowed under any circumstance — force
    // it back to paused and don't tell anyone else it "played".
    if (lockedRef.current && e.data === YT_PLAYING) {
      e.target.pauseVideo?.();
      return;
    }

    // Keep attribution in sync as the playlist advances to a new video.
    if (e.data === YT_PLAYING) captureVideoMeta(e.target);

    if (isSyncingRef.current) return; // skip — this change was caused by applySync
    if (e.data === YT_PLAYING) {
      broadcastState("PLAY");
      if (isHost()) persistState(); // capture a new video / resumed play
    }
    if (e.data === YT_PAUSED) {
      broadcastState("PAUSE");
      persistState(); // remember exactly where we paused
    }
    if (e.data === YT_ENDED) {
      broadcastState("PAUSE");
      persistState();
      markWatched(e.target.getVideoData?.()?.video_id);
    }
  }, [broadcastState, captureVideoMeta, isHost, persistState, markWatched]);

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
          videoId={videoId || "videoseries"}
          opts={{
            width: "100%",
            height: "100%",
            playerVars: {
              autoplay: 0,
              modestbranding: 1,
              rel: 0,
              fs: 1,
              ...(playlistId ? { list: playlistId, listType: "playlist" } : {}),
            },
          }}
          style={styles.ytEmbed}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      </div>

      {videoMeta ? (
        <div style={styles.attribution}>
          <span style={styles.attributionText}>
            {videoMeta.title}
            {videoMeta.author ? <> · <span style={styles.attributionAuthor}>{videoMeta.author}</span></> : null}
          </span>
          <a
            href={`https://www.youtube.com/watch?v=${videoMeta.videoId}${playlistId ? `&list=${playlistId}` : ""}`}
            target="_blank"
            rel="noreferrer"
            style={styles.attributionLink}
          >
            Watch on YouTube ↗
          </a>
        </div>
      ) : null}

      <p style={styles.hint}>
        {segmentPart ? `▶ Today's part ${segmentPart} of this video · ` : "▶ "}
        Anyone in this room can play, pause, or seek — everyone stays in sync.
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
  attribution: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 16px",
    background: "rgba(255,255,255,0.03)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    flexWrap: "wrap",
  },
  attributionText: {
    fontSize: 12,
    color: "rgba(226,232,240,0.85)",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  attributionAuthor: {
    color: "rgba(148,163,184,0.9)",
  },
  attributionLink: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 600,
    color: "#a78bfa",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
};
