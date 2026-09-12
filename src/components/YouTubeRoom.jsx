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
const HOST_REQUEST_TYPE = "YT_HOST_REQUEST";   // a viewer asks the host for control
const HOST_HANDOFF_TYPE = "YT_HOST_HANDOFF";   // the host grants control to someone
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
  playlistVideos = null,   // full cohort playlist [{ ytVideoId, title, ... }]
  watchedVideoIds = null,  // this member's watched set
  hostUserId = null,       // cohort creator = default host (drives playback)
  onRegisterControls = null, // hand up { jumpTo, requestControl, giveControl }
  onCurrentVideoId = null,   // report the currently-playing videoId to the parent
  onHostState = null,        // report { amHost, hostName, pendingRequest }
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
  const didResumeRef = useRef(false);    // resumed from saved memory this session
  const watchedRef = useRef(new Set());  // videoIds this client already marked watched
  const amHostRef = useRef(false);       // is THIS client the current driver?

  // The full cohort playlist (ordered ytVideoIds) so any video is reachable in
  // one shared player, and the member's watched set for choosing a sane default.
  const fullListRef = useRef(null);
  useEffect(() => {
    fullListRef.current = Array.isArray(playlistVideos) && playlistVideos.length
      ? playlistVideos.map((v) => v.ytVideoId).filter(Boolean)
      : null;
  }, [playlistVideos]);
  const watchedSetRef = useRef(new Set());
  useEffect(() => {
    watchedSetRef.current = new Set(Array.isArray(watchedVideoIds) ? watchedVideoIds : []);
  }, [watchedVideoIds]);

  // Host role: one driver controls playback; others follow. Default host is the
  // cohort creator; control can be handed off at runtime via data messages.
  const [hostOverride, setHostOverride] = useState(null); // identity granted control
  const [pendingRequest, setPendingRequest] = useState(null); // { identity, name } (host sees)

  // Current video's title + channel, for creator attribution. Read live from
  // the player so it stays correct as the playlist advances.
  const [videoMeta, setVideoMeta] = useState(null);
  const captureVideoMeta = useCallback((player) => {
    const data = player?.getVideoData?.();
    if (data?.video_id) {
      setVideoMeta({ title: data.title, author: data.author, videoId: data.video_id });
      onCurrentVideoId?.(data.video_id);
    }
  }, [onCurrentVideoId]);

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
    // Report the video actually playing now (the playlist may have advanced),
    // not the static `videoId` prop — which is null in cohort/playlist mode.
    const nowPlaying = player.getVideoData?.()?.video_id;
    broadcast({
      type: SYNC_TYPE,
      action,
      videoId: nowPlaying || videoId || null,
      currentTime: player.getCurrentTime?.() ?? 0,
      ts: Date.now(),
      ...extra,
    });
  }, [broadcast, videoId]);

  // ── Persist playback memory (so an empty room resumes, not restarts) ───────

  // Who currently drives playback: an explicit handoff target if present in the
  // room, else the cohort creator if present, else the elected first identity
  // (keeps plain non-cohort watch parties working, and covers the creator being
  // absent). Everyone computes the same answer from shared inputs.
  const hostIdentity = useCallback(() => {
    const ids = participants.map((p) => p.identity);
    if (hostOverride && ids.includes(hostOverride)) return hostOverride;
    if (hostUserId && ids.includes(hostUserId)) return hostUserId;
    const sorted = [...participants].sort((a, b) => a.identity.localeCompare(b.identity));
    return sorted[0]?.identity ?? null;
  }, [participants, hostUserId, hostOverride]);

  // Keep amHostRef fresh (used to gate broadcasts synchronously) and report host
  // state to the parent for the controls UI.
  useEffect(() => {
    const hid = hostIdentity();
    const mine = Boolean(hid && hid === localParticipant?.identity);
    amHostRef.current = mine;
    const hostP = participants.find((p) => p.identity === hid);
    onHostState?.({
      amHost: mine,
      hostName: hostP?.name || hostP?.identity || null,
      pendingRequest: mine ? pendingRequest : null,
    });
  }, [participants, localParticipant, hostIdentity, pendingRequest, onHostState]);

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

  // ── Jump to any video in the playlist (Playlist panel) ─────────────────────
  // The room is shared, so a jump loads the video locally and broadcasts it —
  // everyone in the room follows to the picked video (existing sync protocol).
  const jumpTo = useCallback((vid) => {
    const player = playerRef.current;
    if (!player || !vid) return;
    if (!amHostRef.current) return; // only the host changes the room's video
    isSyncingRef.current = true;
    const list = player.getPlaylist?.() || fullListRef.current || null;
    const idx = Array.isArray(list) ? list.indexOf(vid) : -1;
    if (idx >= 0) {
      player.loadPlaylist?.({ playlist: list, index: idx, startSeconds: 0 });
    } else {
      player.loadVideoById?.({ videoId: vid, startSeconds: 0 });
    }
    if (lockedRef.current) player.pauseVideo?.();
    captureVideoMeta(player);
    persistState();
    // Let the load settle, then tell the room to follow this video.
    setTimeout(() => {
      isSyncingRef.current = false;
      broadcastState(lockedRef.current ? "PAUSE" : "PLAY");
    }, 900);
  }, [captureVideoMeta, broadcastState, persistState]);

  // Ask the current host to hand over control.
  const requestControl = useCallback(() => {
    if (amHostRef.current) return;
    broadcast({
      type: HOST_REQUEST_TYPE,
      identity: localParticipant?.identity,
      name: localParticipant?.name || "A viewer",
    });
  }, [broadcast, localParticipant]);

  // Host grants control to a requester (or anyone by identity).
  const giveControl = useCallback((toIdentity) => {
    if (!amHostRef.current || !toIdentity) return;
    setHostOverride(toIdentity);
    setPendingRequest(null);
    broadcast({ type: HOST_HANDOFF_TYPE, to: toIdentity });
  }, [broadcast]);

  const dismissRequest = useCallback(() => setPendingRequest(null), []);

  useEffect(() => {
    onRegisterControls?.({ jumpTo, requestControl, giveControl, dismissRequest });
  }, [onRegisterControls, jumpTo, requestControl, giveControl, dismissRequest]);

  // ── Apply incoming sync (with drift correction) ───────────────────────────

  const applySync = useCallback((msg) => {
    const player = playerRef.current;
    if (!player) return;

    receivedSyncRef.current = true; // a live peer is driving our position now
    const networkDelay = (Date.now() - msg.ts) / 1000;
    const targetTime = msg.currentTime + networkDelay;

    isSyncingRef.current = true;

    // If the host is on a DIFFERENT video than us (the classic "I joined and it
    // started from video 1 while everyone's on video 2" case), switch to the
    // host's video first — otherwise we'd only seek within the wrong video.
    const localVideoId = player.getVideoData?.()?.video_id;
    if (msg.videoId && msg.videoId !== localVideoId) {
      const list =
        player.getPlaylist?.() || fullListRef.current || restrictRef.current?.restrictVideoIds || null;
      const idx = Array.isArray(list) ? list.indexOf(msg.videoId) : -1;
      if (idx >= 0) {
        // Keep the day's playlist intact so later videos still queue up.
        player.loadPlaylist?.({ playlist: list, index: idx, startSeconds: targetTime });
      } else {
        player.loadVideoById?.({ videoId: msg.videoId, startSeconds: targetTime });
      }
      // load*() auto-plays; enforce the host's play/pause state (and the lock).
      if (lockedRef.current || msg.action === "PAUSE") {
        player.pauseVideo?.();
      } else {
        player.playVideo?.();
      }
      captureVideoMeta(player);
      // A video load takes longer to settle than a seek — hold the lock a bit
      // longer so the resulting state changes don't echo back as new commands.
      setTimeout(() => { isSyncingRef.current = false; }, 1000);
      return;
    }

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
  }, [captureVideoMeta]);

  // ── Respond to new-joiner sync request ────────────────────────────────────

  const handleSyncRequest = useCallback((requesterIdentity) => {
    const player = playerRef.current;
    if (!player) return;
    // The host answers new joiners (it's the single source of truth for the
    // room's position). If the host is the one joining, fall back to the elected
    // first identity excluding the requester so someone still replies.
    if (amHostRef.current) {
      // host replies below
    } else {
      const responders = participants.filter((p) => p.identity !== requesterIdentity);
      const sorted = responders.sort((a, b) => a.identity.localeCompare(b.identity));
      const hid = hostIdentity();
      // Only step in if there's effectively no host present to answer.
      if (hid && participants.some((p) => p.identity === hid)) return;
      if (sorted[0]?.identity !== localParticipant?.identity) return;
    }

    const state = player.getPlayerState?.();
    const isPlaying = state === 1; // YT.PlayerState.PLAYING
    broadcastState(isPlaying ? "PLAY" : "PAUSE");
  }, [participants, localParticipant, broadcastState, hostIdentity]);

  // ── Listen for data events ────────────────────────────────────────────────

  useEffect(() => {
    if (!room) return;

    const handler = (payload, participant) => {
      if (participant?.identity === localParticipant?.identity) return;
      let msg;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }

      if (msg.type === SYNC_TYPE) applySync(msg);
      if (msg.type === REQUEST_TYPE) handleSyncRequest(participant?.identity);
      // A viewer wants control — only the current host should surface it.
      if (msg.type === HOST_REQUEST_TYPE && amHostRef.current) {
        setPendingRequest({ identity: msg.identity, name: msg.name || "A viewer" });
      }
      // The host handed control to someone — everyone applies the same override.
      if (msg.type === HOST_HANDOFF_TYPE && msg.to) {
        setHostOverride(msg.to);
        setPendingRequest(null);
      }
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

  // ── Resume where the cohort left off if nobody synced us (empty-room case) ──

  // Decide the best resume target and load it. Rules (no live peer present):
  //  • No saved memory → keep the onReady default (today's scheduled session).
  //  • Saved video is BEFORE today's scheduled session → the cohort has moved
  //    on; keep today's session (don't drag the room back to a finished day).
  //  • Saved video is AT/AFTER today's session → resume it at its saved position
  //    (this is "continue where we left off"). If that video is already fully
  //    watched, jump to the next unwatched one instead.
  const resumeFromSaved = useCallback(() => {
    if (didResumeRef.current || receivedSyncRef.current) return;
    const player = playerRef.current;
    const saved = savedStateRef.current;
    if (!player || !saved?.videoId) return;

    const full = fullListRef.current;
    const dayId =
      restrictRef.current?.segment?.videoId ||
      restrictRef.current?.restrictVideoIds?.[0] ||
      null;
    const savedIdx = full ? full.indexOf(saved.videoId) : -1;
    const dayIdx = dayId && full ? full.indexOf(dayId) : -1;

    // Cohort advanced past the saved point → keep today's session default.
    if (full && savedIdx >= 0 && dayIdx >= 0 && savedIdx < dayIdx) return;

    let targetVid = saved.videoId;
    let targetPos = saved.positionSec || 0;
    if (full && savedIdx >= 0 && watchedSetRef.current.has(saved.videoId)) {
      const next = full.slice(savedIdx + 1).find((id) => !watchedSetRef.current.has(id));
      if (next) { targetVid = next; targetPos = 0; }
    }

    didResumeRef.current = true;
    isSyncingRef.current = true;
    const list = full || restrictRef.current?.restrictVideoIds;
    const li = list?.length ? list.indexOf(targetVid) : -1;
    if (li >= 0) {
      player.loadPlaylist?.({ playlist: list, index: li, startSeconds: targetPos });
    } else {
      player.loadVideoById?.({ videoId: targetVid, startSeconds: targetPos });
    }
    if (lockedRef.current || !saved.playing) player.pauseVideo?.();
    captureVideoMeta(player);
    setTimeout(() => { isSyncingRef.current = false; }, 600);
  }, [captureVideoMeta]);

  useEffect(() => {
    if (!room) return undefined;
    // Wait past the 1500ms sync request + a response window. If a live peer
    // synced us we skip; otherwise resume the room's last saved position.
    const id = setTimeout(resumeFromSaved, 2800);
    return () => clearTimeout(id);
  }, [room, resumeFromSaved]);

  // ── Persist the spot when leaving (tab close / navigate / unmount) ────────
  // Passive watch-party users often just close the tab, so the pause/end
  // handlers never fire; without this the room's memory misses their progress.
  useEffect(() => {
    const save = () => { if (!isSyncingRef.current) persistState(); };
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [persistState]);

  // ── Periodic heartbeat: sync drift + persist playback memory (host only) ──

  useEffect(() => {
    heartbeatRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const state = player.getPlayerState?.();
      if (amHostRef.current) {
        if (state === 1) broadcastState("PLAY"); // host keeps the room in sync
        persistState(); // one writer (the host) keeps the room's memory fresh
      }
      // Count a video as watched for THIS user once ~90% is seen.
      const dur = player.getDuration?.() || 0;
      const cur = player.getCurrentTime?.() || 0;
      if (dur > 0 && cur / dur >= 0.9) markWatched(player.getVideoData?.()?.video_id);
    }, HEARTBEAT_MS);
    return () => clearInterval(heartbeatRef.current);
  }, [broadcastState, persistState, markWatched]);

  // ── YouTube player event handlers ─────────────────────────────────────────

  const onReady = useCallback((e) => {
    playerRef.current = e.target;
    const full = fullListRef.current;
    if (full?.length) {
      // Cohort room: load the WHOLE playlist so any video is reachable in one
      // shared player. Default start = the day's video, else the first video
      // this member hasn't watched, else video 1. The resume effect and live
      // sync override this shortly after if there's saved state / a live peer.
      const r = restrictRef.current;
      const dayId = r?.segment?.videoId || r?.restrictVideoIds?.[0] || null;
      const firstUnwatched = full.find((id) => !watchedSetRef.current.has(id));
      const startId = dayId || firstUnwatched || full[0];
      const idx = Math.max(0, full.indexOf(startId));
      // cue (not load) so nothing plays until the prep lock releases.
      e.target.cuePlaylist?.({
        playlist: full,
        index: idx,
        startSeconds: r?.segment?.startSec ?? 0,
      });
    } else {
      // Non-cohort: day restriction (single video/segment) or plain playlist.
      const applied = applyRestriction(e.target, restrictRef.current);
      if (!applied && !videoId && playlistId) {
        e.target.loadPlaylist({ list: playlistId, listType: "playlist", index: 0 });
      }
    }
    // Safety net: some browsers/embeds can start playback right on load
    // despite autoplay:0. Never let that slip past the prep-timer lock.
    if (lockedRef.current) {
      e.target.pauseVideo?.();
    }
    captureVideoMeta(e.target);
  }, [videoId, playlistId, captureVideoMeta, applyRestriction]);

  // Apply (or re-apply) the day's restriction if it arrives / changes after the
  // player is already up. Skipped for full-playlist cohort rooms — there the
  // whole list is loaded once and we never want a day change to yank the shared
  // player out from under people who may have jumped elsewhere.
  useEffect(() => {
    if (playerRef.current && !fullListRef.current) {
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
    // Only the host drives the room: non-hosts' play/pause/seek do NOT broadcast,
    // so one person can't move everyone else. Non-hosts still follow the host's
    // sync (and get pulled back by the heartbeat if they wander).
    if (e.data === YT_PLAYING && amHostRef.current) {
      broadcastState("PLAY");
      persistState();
    }
    if (e.data === YT_PAUSED && amHostRef.current) {
      broadcastState("PAUSE");
      persistState(); // remember exactly where we paused
    }
    if (e.data === YT_ENDED) {
      if (amHostRef.current) {
        broadcastState("PAUSE");
        persistState();
      }
      markWatched(e.target.getVideoData?.()?.video_id); // per-member, always
    }
  }, [broadcastState, captureVideoMeta, persistState, markWatched]);

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
