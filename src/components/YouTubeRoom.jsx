import { useEffect, useRef, useCallback, useState } from "react";
import YouTube from "react-youtube";
import { useRoomContext, useLocalParticipant, useParticipants } from "@livekit/components-react";
import { fetchRoomVideoState, saveRoomVideoState, markVideoWatched, postCohortPresence } from "../services/api";
import { track } from "../services/analytics";

// ── Sync protocol ────────────────────────────────────────────────────────────
// All events sent via LiveKit data channel (same as Pomodoro + chat).
// { type: "YT_SYNC", action: "PLAY"|"PAUSE"|"SEEK"|"RATE", videoId, currentTime,
//   ts, actor, rate?, announce? } — anyone can drive playback; `actor` is the
//   name to announce and `announce` marks a genuine user action (vs a drift
//   heartbeat / new-joiner answer) so only real actions raise an alert.
// { type: "YT_REQUEST_SYNC" }  — new joiner asks for current state

const SYNC_TYPE = "YT_SYNC";
const REQUEST_TYPE = "YT_REQUEST_SYNC";
const HOST_REQUEST_TYPE = "YT_HOST_REQUEST";   // a viewer asks the host for control
const HOST_HANDOFF_TYPE = "YT_HOST_HANDOFF";   // the host grants control to someone
const DRIFT_TOLERANCE_S = 2; // only re-seek if drift > 2 seconds
const HEARTBEAT_MS = 15000;  // periodic sync every 15s to prevent drift

// YouTube IFrame API onError codes → what they mean / what to tell the viewer.
const YT_ERROR_MEANING = {
  2: "invalid parameter (bad video id)",
  5: "HTML5 player / streaming error",
  100: "video not found, removed, or private",
  101: "embedding disabled by the video owner",
  150: "embedding disabled by the video owner",
};
const YT_ERROR_MESSAGE = {
  100: "This video was removed or made private on YouTube. The host can pick another one.",
  101: "The video's owner disabled playback on other sites. Try “Watch on YouTube”.",
  150: "The video's owner disabled playback on other sites. Try “Watch on YouTube”.",
  default:
    "YouTube couldn't stream it here — usually a browser blocking third-party cookies, an ad-blocker, or a strict privacy/tracking setting. Try reloading, or allow youtube.com in this browser.",
};

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
  onRemoteControl = null,    // report { actor, action, currentTime, rate } for the alert toast
  syncMode = "SYNC",         // "SYNC" = one shared player; "SOLO" = everyone at their own pace
  myPosition = null,         // SOLO: { videoId, positionSec } — this member's resume point
  trackPresence = false,     // signed-in cohort member: send the live-presence heartbeat
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const lockedRef = useRef(locked);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  // SOLO (self-paced) cohorts: nothing about playback is shared — no sync
  // broadcasts, no following, no host. Each member drives their own player.
  const soloRef = useRef(syncMode === "SOLO");
  useEffect(() => {
    soloRef.current = syncMode === "SOLO";
  }, [syncMode]);

  const playerRef = useRef(null);       // YT.Player instance
  const isSyncingRef = useRef(false);   // suppress re-broadcast while applying remote sync
  const lastPosRef = useRef({ t: 0, at: Date.now() }); // baseline for seek detection
  const lastAnnounceAtRef = useRef(0); // collapse a burst of alerts into one
  const lastAppliedSyncAtRef = useRef(0); // when we last APPLIED a remote sync (echo guard)
  const heartbeatRef = useRef(null);
  const savedStateRef = useRef(null);   // persisted playback memory for this room
  const receivedSyncRef = useRef(false); // a live participant has synced us this session
  const didResumeRef = useRef(false);    // resumed from saved memory this session
  // "Settled" = this client has decided where it should be (resumed, synced by
  // a peer, or found nothing to resume). Until then it must NOT write its spot
  // anywhere or answer sync requests — its player is still on the default
  // video at 0:00, and saving that is exactly what wiped people's progress.
  const settledRef = useRef(false);
  const savedLoadedRef = useRef(false);  // saved spot fetched (or known absent)
  const mountedAtRef = useRef(0); // set when the resume gate starts
  // A resume target that is CUED but not yet played: YouTube reports 0:00 for
  // a cued video, so report this position instead until playback starts.
  const pendingSpotRef = useRef(null);   // { videoId, positionSec }
  // When WE (not the user) last told the player to play. A pause that lands
  // shortly after is the browser blocking autoplay / a lock / buffering — not
  // a person pausing — and must never be broadcast (it stopped the whole room
  // whenever someone refreshed).
  const programmaticPlayAtRef = useRef(0);
  const [needsUnmute, setNeedsUnmute] = useState(false);
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

  // Player-level error surfacing + recovery. YouTube's embed shows a generic
  // "An error occurred. Please try again later." with no cause; capturing the
  // numeric code tells us WHY (bad id / embedding disabled / HTML5 / streaming),
  // and remounting the iframe clears most transient failures.
  const [errorCode, setErrorCode] = useState(null);
  const [playerKey, setPlayerKey] = useState(0);
  const autoRetriedRef = useRef(false);

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

  // Where this player really is. A cued resume target reads as 0:00 until it
  // plays, so fall back to the target position for that video.
  const currentSpot = useCallback(() => {
    const player = playerRef.current;
    const vid = player?.getVideoData?.()?.video_id || null;
    let pos = player?.getCurrentTime?.() || 0;
    const p = pendingSpotRef.current;
    if (p && p.videoId === vid && pos < p.positionSec - 1) pos = p.positionSec;
    return { videoId: vid, positionSec: pos };
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

  // Start playback on our own (sync / resume / lock release). Browsers block
  // autoplay WITH sound until the page gets a click — after a refresh that's
  // the norm — so if it didn't start, fall back to muted autoplay (always
  // allowed) and offer a one-tap unmute, instead of sitting paused.
  const autoPlay = useCallback((player) => {
    if (!player) return;
    programmaticPlayAtRef.current = Date.now();
    player.playVideo?.();
    setTimeout(() => {
      const p = playerRef.current;
      if (!p || lockedRef.current) return;
      const st = p.getPlayerState?.();
      if (st !== 1 && st !== 3 && st !== 0) {
        programmaticPlayAtRef.current = Date.now();
        p.mute?.();
        p.playVideo?.();
        setNeedsUnmute(true);
      }
    }, 2500);
  }, []);

  const unmute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    p.unMute?.();
    if (p.getPlayerState?.() !== 1) {
      programmaticPlayAtRef.current = Date.now();
      p.playVideo?.();
    }
    setNeedsUnmute(false);
  }, []);

  // Hide the unmute prompt if they unmute from YouTube's own controls.
  useEffect(() => {
    if (!needsUnmute) return undefined;
    const id = setInterval(() => {
      if (playerRef.current && playerRef.current.isMuted?.() === false) setNeedsUnmute(false);
    }, 1000);
    return () => clearInterval(id);
  }, [needsUnmute]);

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
    if (!player || soloRef.current) return; // self-paced: never move anyone else's player
    // Not settled = still on the default video; broadcasting it would pull the
    // whole room back to video 1.
    if (!settledRef.current) return;
    // Report the video actually playing now (the playlist may have advanced),
    // not the static `videoId` prop — which is null in cohort/playlist mode.
    const nowPlaying = player.getVideoData?.()?.video_id;
    // Downgrade a rapid second alert to a silent sync (e.g. a seek-while-playing
    // fires both SEEK and PLAY) — the room still syncs, but only one toast shows.
    let announce = Boolean(extra.announce);
    if (announce) {
      const now = Date.now();
      if (now - lastAnnounceAtRef.current < 900) announce = false;
      else lastAnnounceAtRef.current = now;
    }
    broadcast({
      type: SYNC_TYPE,
      action,
      videoId: nowPlaying || videoId || null,
      currentTime: currentSpot().positionSec,
      // Carry the playback rate on EVERY sync so speed stays consistent across
      // play/pause/seek, the drift heartbeat, and new joiners.
      rate: player.getPlaybackRate?.() ?? 1,
      ts: Date.now(),
      actor: localParticipant?.name || "Someone",
      ...extra,
      announce,
    });
  }, [broadcast, videoId, localParticipant, currentSpot]);

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
    if (syncMode === "SOLO") {
      // Everyone is "host" of their own player in a self-paced cohort.
      amHostRef.current = true;
      onHostState?.({ amHost: true, hostName: null, pendingRequest: null });
      return;
    }
    const hid = hostIdentity();
    const mine = Boolean(hid && hid === localParticipant?.identity);
    amHostRef.current = mine;
    const hostP = participants.find((p) => p.identity === hid);
    onHostState?.({
      amHost: mine,
      hostName: hostP?.name || hostP?.identity || null,
      pendingRequest: mine ? pendingRequest : null,
    });
  }, [participants, localParticipant, hostIdentity, pendingRequest, onHostState, syncMode]);

  const persistState = useCallback(() => {
    const player = playerRef.current;
    // SOLO has no shared pointer — each member's spot is saved via presence.
    if (!player || !roomId || soloRef.current || !settledRef.current) return;
    const spot = currentSpot();
    if (!spot.videoId) return;
    saveRoomVideoState(roomId, {
      videoId: spot.videoId,
      positionSec: Math.round(spot.positionSec),
      playing: player.getPlayerState?.() === 1,
    }).catch(() => {});
  }, [roomId, currentSpot]);

  // Record (once) that THIS user finished a video — feeds per-member cohort
  // progress. Server no-ops for non-cohort rooms / non-members.
  const markWatched = useCallback((vid) => {
    if (!roomId || !vid || watchedRef.current.has(vid)) return;
    watchedRef.current.add(vid);
    markVideoWatched(roomId, vid).catch(() => {});
  }, [roomId]);

  // Live presence for the cohort scoreboard: which video this member is on,
  // where, and whether it's playing. The server also accrues study time from
  // the gaps between beats. Throttled so state-change bursts send one beat.
  const lastPresenceAtRef = useRef(0);
  const sendPresence = useCallback((force = false) => {
    // Not settled yet = still on the default video; reporting it would also
    // overwrite this member's saved resume point.
    if (!trackPresence || !roomId || !settledRef.current) return;
    const player = playerRef.current;
    const now = Date.now();
    if (!force && now - lastPresenceAtRef.current < 3000) return;
    lastPresenceAtRef.current = now;
    const spot = currentSpot();
    postCohortPresence(roomId, {
      videoId: spot.videoId,
      positionSec: Math.round(spot.positionSec),
      playing: player?.getPlayerState?.() === 1,
    }).catch(() => {});
  }, [trackPresence, roomId, currentSpot]);

  // ── Jump to any video in the playlist (Playlist panel) ─────────────────────
  // The room is shared, so a jump loads the video locally and broadcasts it —
  // everyone in the room follows to the picked video (existing sync protocol).
  const jumpTo = useCallback((vid, startSec = 0) => {
    const player = playerRef.current;
    if (!player || !vid) return;
    if (!amHostRef.current) return; // only the host changes the room's video
    pendingSpotRef.current = null;
    settledRef.current = true; // an explicit pick is a decided position
    if (soloRef.current) {
      // Self-paced: switch only MY player, and tell the scoreboard right away.
      const list = player.getPlaylist?.() || fullListRef.current || null;
      const idx = Array.isArray(list) ? list.indexOf(vid) : -1;
      if (idx >= 0) player.loadPlaylist?.({ playlist: list, index: idx, startSeconds: startSec });
      else player.loadVideoById?.({ videoId: vid, startSeconds: startSec });
      if (lockedRef.current) player.pauseVideo?.();
      captureVideoMeta(player);
      setTimeout(() => sendPresence(true), 1200);
      return;
    }
    isSyncingRef.current = true;
    const list = player.getPlaylist?.() || fullListRef.current || null;
    const idx = Array.isArray(list) ? list.indexOf(vid) : -1;
    if (idx >= 0) {
      player.loadPlaylist?.({ playlist: list, index: idx, startSeconds: startSec });
    } else {
      player.loadVideoById?.({ videoId: vid, startSeconds: startSec });
    }
    if (lockedRef.current) player.pauseVideo?.();
    captureVideoMeta(player);
    persistState();
    // Let the load settle, then tell the room to follow this video.
    setTimeout(() => {
      isSyncingRef.current = false;
      broadcastState(lockedRef.current ? "PAUSE" : "PLAY");
    }, 900);
  }, [captureVideoMeta, broadcastState, persistState, sendPresence]);

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

  // Pause the room (e.g. when a pop quiz starts). Uses the normal state change so
  // shared control syncs the pause to everyone via the existing protocol.
  const pause = useCallback(() => {
    playerRef.current?.pauseVideo?.();
  }, []);

  // Seek within the current video (video flags). In a synced room the seek
  // poll picks the jump up and moves everyone, like any member's seek.
  const seekTo = useCallback((sec) => {
    const player = playerRef.current;
    if (!player) return;
    pendingSpotRef.current = null;
    settledRef.current = true;
    player.seekTo?.(Math.max(0, sec), true);
  }, []);
  const getTime = useCallback(() => currentSpot().positionSec, [currentSpot]);
  const getDuration = useCallback(() => playerRef.current?.getDuration?.() || 0, []);

  useEffect(() => {
    onRegisterControls?.({ jumpTo, requestControl, giveControl, dismissRequest, pause, seekTo, getTime, getDuration });
  }, [onRegisterControls, jumpTo, requestControl, giveControl, dismissRequest, pause, seekTo, getTime, getDuration]);

  // ── Apply incoming sync (with drift correction) ───────────────────────────

  const applySync = useCallback((msg) => {
    const player = playerRef.current;
    if (!player) return;

    receivedSyncRef.current = true; // a live peer is driving our position now
    settledRef.current = true;
    pendingSpotRef.current = null;
    const networkDelay = (Date.now() - msg.ts) / 1000;
    const targetTime = msg.currentTime + networkDelay;

    isSyncingRef.current = true;
    lastAppliedSyncAtRef.current = Date.now(); // suppress echoes for a moment

    // Keep the playback rate in lockstep on every sync (not just RATE events).
    if (typeof msg.rate === "number" && player.getPlaybackRate?.() !== msg.rate) {
      player.setPlaybackRate?.(msg.rate);
    }

    // Playback-rate change — no seek/play involved, just match the speed.
    if (msg.action === "RATE") {
      setTimeout(() => { isSyncingRef.current = false; }, 300);
      return;
    }

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
        autoPlay(player);
      }
      captureVideoMeta(player);
      // A video load takes longer to settle than a seek — hold the lock a bit
      // longer so the resulting state changes don't echo back as new commands.
      setTimeout(() => {
        isSyncingRef.current = false;
        lastAppliedSyncAtRef.current = Date.now();
        lastPosRef.current = { t: playerRef.current?.getCurrentTime?.() ?? 0, at: Date.now() };
      }, 1000);
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
      } else if (player.getPlayerState?.() !== 1) {
        autoPlay(player);
      }
    } else if (msg.action === "SEEK") {
      player.seekTo(targetTime, true);
      // maintain current play/pause state
    }

    // Release sync lock after the player has processed the command, and reset the
    // seek-detection baseline to the corrected position so an applied seek isn't
    // mistaken for a new local seek (which would echo + double-toast).
    setTimeout(() => {
      isSyncingRef.current = false;
      lastAppliedSyncAtRef.current = Date.now();
      lastPosRef.current = { t: playerRef.current?.getCurrentTime?.() ?? 0, at: Date.now() };
    }, 300);
  }, [captureVideoMeta, autoPlay]);

  // ── Respond to new-joiner sync request ────────────────────────────────────

  const handleSyncRequest = useCallback((requesterIdentity) => {
    const player = playerRef.current;
    if (!player) return;
    if (requesterIdentity && requesterIdentity === localParticipant?.identity) return; // don't answer myself
    // A peer that hasn't resumed yet is still on video 1 at 0:00 — answering
    // would drag the joiner there too. Let a settled peer (or saved state) win.
    if (!settledRef.current) return;

    // The host answers joiners (it's the single source of truth for the room's
    // position). But if the HOST is the one rejoining, the host can't answer its
    // own request — so the elected lowest-identity peer (excluding the requester)
    // steps in. This was the bug: everyone deferred to "the host will answer"
    // even when the host was the requester, so nobody replied → the rejoiner fell
    // back to video 1.
    if (!amHostRef.current) {
      const hid = hostIdentity();
      const hostCanAnswer = hid && hid !== requesterIdentity && participants.some((p) => p.identity === hid);
      if (hostCanAnswer) return; // the present host will reply
      const responders = participants
        .filter((p) => p.identity !== requesterIdentity)
        .sort((a, b) => a.identity.localeCompare(b.identity));
      if (responders[0]?.identity !== localParticipant?.identity) return; // only the elected one replies
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
      // Self-paced cohorts ignore the playback-sync protocol entirely.
      if (soloRef.current) return;

      if (msg.type === SYNC_TYPE) {
        applySync(msg);
        // Announce genuine user actions to the whole room (the sender is already
        // excluded above, so this is "someone else did X"). Attribute it from the
        // LiveKit sender object — the receiver resolves who actually sent the
        // packet — not the self-reported msg.actor, which can be stale/wrong.
        if (msg.announce) {
          onRemoteControl?.({
            actor: participant?.name || participant?.identity || msg.actor || "Someone",
            action: msg.action,
            currentTime: msg.currentTime,
            rate: msg.rate,
          });
        }
      }
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
  }, [room, localParticipant, applySync, handleSyncRequest, onRemoteControl]);

  // ── Auto-start once the prep-timer lock naturally releases ────────────────

  const wasLockedRef = useRef(locked);
  const pendingAutoplayRef = useRef(false);
  useEffect(() => {
    // Lock turned ON (prep / quiz / screen share): pause a video that's ALREADY
    // playing so it holds its position — the lock alone only catches a fresh PLAY,
    // so without this a running video kept playing behind an overlay and lost its
    // spot (screen share) or never paused. Silent (no broadcast) — every client
    // observes the same lock, so no need to announce it.
    if (locked && playerRef.current?.getPlayerState?.() === 1) {
      isSyncingRef.current = true;
      playerRef.current.pauseVideo?.();
      setTimeout(() => { isSyncingRef.current = false; }, 300);
    }
    // Lock turned OFF: resume from where we paused. If the player isn't ready yet
    // (prep ended before onReady), remember it and play the moment it's ready.
    if (wasLockedRef.current && !locked) {
      if (playerRef.current) {
        isSyncingRef.current = true;
        autoPlay(playerRef.current);
        setTimeout(() => { isSyncingRef.current = false; }, 500);
        // We sat paused behind the lock while others kept watching — ask the
        // room where it is now instead of dragging everyone back to our spot.
        if (!soloRef.current && participants.length > 1) {
          setTimeout(() => broadcast({ type: REQUEST_TYPE }), 600);
        }
      } else {
        pendingAutoplayRef.current = true;
      }
    }
    wasLockedRef.current = locked;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  // ── Seek detection (no native onSeek) + speed changes ─────────────────────
  // Poll the position once a second; a jump beyond what normal playback explains
  // is a manual seek — broadcast it (with the actor) so the room follows + alerts.
  useEffect(() => {
    const id = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      // Skip while applying a remote sync (or just after) and while locked, so an
      // applied jump isn't mistaken for a local seek and rebroadcast under our name.
      if (isSyncingRef.current || lockedRef.current || Date.now() - lastAppliedSyncAtRef.current < 1500) {
        lastPosRef.current = { t: player.getCurrentTime?.() ?? 0, at: Date.now() };
        return;
      }
      const state = player.getPlayerState?.();
      const now = Date.now();
      const cur = player.getCurrentTime?.() ?? 0;
      const rate = player.getPlaybackRate?.() || 1;
      const prev = lastPosRef.current;
      const elapsed = (now - prev.at) / 1000;
      const expected = prev.t + (state === 1 ? elapsed * rate : 0); // advance only while playing
      if (Math.abs(cur - expected) > 2.5) {
        broadcastState("SEEK", { announce: true });
      }
      lastPosRef.current = { t: cur, at: now };
    }, 1000);
    return () => clearInterval(id);
  }, [broadcastState]);

  // Speed change — react-youtube fires this with the new rate; share it + alert.
  const onPlaybackRateChange = useCallback((e) => {
    if (isSyncingRef.current || lockedRef.current) return;
    if (Date.now() - lastAppliedSyncAtRef.current < 1500) return; // echo of an applied rate
    broadcastState("RATE", { announce: true, rate: e.data });
  }, [broadcastState]);

  // ── Request sync on mount (new joiner) ────────────────────────────────────

  useEffect(() => {
    if (!room || room.state !== "connected") return undefined;
    // Ask for the room's current position, and RETRY until a peer answers — a
    // single request can be lost if our player isn't ready yet or the responder's
    // packet races us. Stops once a live sync arrives (or we've resumed locally).
    if (soloRef.current) return undefined; // nobody to follow in a self-paced cohort
    let tries = 0;
    let timer;
    const attempt = () => {
      // Re-checked per attempt: the cohort's mode can arrive after mount.
      if (soloRef.current || receivedSyncRef.current || didResumeRef.current) return;
      broadcast({ type: REQUEST_TYPE });
      tries += 1;
      if (tries < 5) timer = setTimeout(attempt, 1500);
    };
    timer = setTimeout(attempt, 1200);
    return () => clearTimeout(timer);
  }, [room, broadcast]);

  // ── Load this room's saved playback memory on mount ───────────────────────

  useEffect(() => {
    if (!roomId) return;
    const mine = myPosition?.videoId
      ? { videoId: myPosition.videoId, positionSec: myPosition.positionSec || 0, playing: false }
      : null;
    if (syncMode === "SOLO") {
      // My own resume point (last heartbeat), not the room's shared pointer.
      // It arrives with the playlist, so it's "loaded" once the playlist is.
      savedStateRef.current = mine;
      if (fullListRef.current) savedLoadedRef.current = true;
      return;
    }
    let cancelled = false;
    fetchRoomVideoState(roomId)
      // The room's shared spot; if the room has none yet, fall back to mine.
      .then((st) => { if (!cancelled) savedStateRef.current = st?.videoId ? st : mine; })
      .catch(() => { if (!cancelled) savedStateRef.current = mine; })
      .finally(() => { if (!cancelled) savedLoadedRef.current = true; });
    return () => { cancelled = true; };
  }, [roomId, syncMode, myPosition?.videoId, myPosition?.positionSec, playlistVideos]);

  // ── Resume where the cohort left off if nobody synced us (empty-room case) ──

  // Resume where we left off (no live peer present). Rules:
  //  • No saved spot → keep the onReady default.
  //  • Saved spot → resume that video at its saved position — "continue where
  //    we left off", even if the schedule says another day's video. If that
  //    video is already fully watched, go to the next unwatched one instead.
  // Returns true once resumed (or there was nothing to resume).
  const resumeFromSaved = useCallback(() => {
    if (didResumeRef.current || receivedSyncRef.current) return true;
    const player = playerRef.current;
    const saved = savedStateRef.current;
    if (!player) return false;
    if (!saved?.videoId) return true; // nothing saved — the default is right

    const full = fullListRef.current;
    const savedIdx = full ? full.indexOf(saved.videoId) : -1;

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
    const autoplay = saved.playing && !lockedRef.current;
    // CUE (not load+pause): load-then-pause raced the buffer and saved 0:00.
    // A cued video plays from startSeconds when someone presses play.
    if (li >= 0) {
      const opts = { playlist: list, index: li, startSeconds: targetPos };
      if (autoplay) player.loadPlaylist?.(opts); else player.cuePlaylist?.(opts);
    } else {
      const opts = { videoId: targetVid, startSeconds: targetPos };
      if (autoplay) player.loadVideoById?.(opts); else player.cueVideoById?.(opts);
    }
    pendingSpotRef.current = targetPos > 1 ? { videoId: targetVid, positionSec: targetPos } : null;
    captureVideoMeta(player);
    setTimeout(() => { isSyncingRef.current = false; }, 800);
    return true;
  }, [captureVideoMeta]);

  // Resume gate — waits until it can decide correctly instead of firing once
  // on a timer (the old 3.5s one-shot silently gave up whenever the iframe,
  // the saved spot or the playlist was slower than that → back to video 1).
  useEffect(() => {
    if (!room) return undefined;
    settledRef.current = false;
    mountedAtRef.current = Date.now();
    const GIVE_UP_MS = 25000;
    const id = setInterval(() => {
      const waited = Date.now() - mountedAtRef.current;
      if (receivedSyncRef.current) { settledRef.current = true; clearInterval(id); return; }
      const playlistKnown = Boolean(fullListRef.current) || waited > 6000;
      // Give a live peer a moment to answer first (synced rooms only).
      const peerWindowOver = soloRef.current || waited > 3500;
      const ready = playerRef.current && savedLoadedRef.current && playlistKnown && peerWindowOver;
      if ((ready && resumeFromSaved()) || waited > GIVE_UP_MS) {
        settledRef.current = true;
        clearInterval(id);
      }
    }, 400);
    return () => clearInterval(id);
  }, [room, resumeFromSaved, playerKey]);

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
      sendPresence(true);
    }, HEARTBEAT_MS);
    return () => clearInterval(heartbeatRef.current);
  }, [broadcastState, persistState, markWatched, sendPresence]);

  // First beat soon after joining, so the crew sees you on the board at once.
  useEffect(() => {
    if (!trackPresence) return undefined;
    const id = setTimeout(() => sendPresence(true), 4000);
    return () => clearTimeout(id);
  }, [trackPresence, sendPresence]);

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
      // Self-paced: start at MY next unwatched video (no shared day to follow).
      const startId = soloRef.current
        ? firstUnwatched || full[0]
        : dayId || firstUnwatched || full[0];
      const idx = Math.max(0, full.indexOf(startId));
      // cue (not load) so nothing plays until the prep lock releases.
      e.target.cuePlaylist?.({
        playlist: full,
        index: idx,
        startSeconds: soloRef.current ? 0 : r?.segment?.startSec ?? 0,
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
    } else if (pendingAutoplayRef.current) {
      // The lock released before the player was ready (scheduled session started
      // before this iframe finished loading) — start playback now.
      pendingAutoplayRef.current = false;
      isSyncingRef.current = true;
      autoPlay(e.target);
      setTimeout(() => { isSyncingRef.current = false; }, 500);
    }
    captureVideoMeta(e.target);
  }, [videoId, playlistId, captureVideoMeta, applyRestriction, autoPlay]);

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
    if (e.data === YT_PLAYING || e.data === YT_PAUSED) sendPresence();

    if (e.data === YT_PLAYING && pendingSpotRef.current) {
      const p = pendingSpotRef.current;
      const vid = e.target.getVideoData?.()?.video_id;
      if (p.videoId === vid) {
        const cur = e.target.getCurrentTime?.() || 0;
        if (Math.abs(cur - p.positionSec) > 3) {
          isSyncingRef.current = true;
          e.target.seekTo?.(p.positionSec, true);
          lastPosRef.current = { t: p.positionSec, at: Date.now() };
          setTimeout(() => { isSyncingRef.current = false; }, 600);
        }
      }
      pendingSpotRef.current = null;
    }

    if (e.data === YT_PLAYING) {
      captureVideoMeta(e.target);
      // Playback recovered — clear any error and re-arm the one-shot auto-retry
      // so a later (different) video can auto-recover too.
      setErrorCode(null);
      autoRetriedRef.current = false;
    }

    if (isSyncingRef.current) return; // skip — this change was caused by applySync
    // Echo guard: the YouTube player often takes longer than the sync lock to
    // actually transition (buffering), so a state change shortly after APPLYING a
    // remote sync is that echo, not a genuine local action. Don't rebroadcast it
    // (this is what caused actions to show the wrong person's name).
    if (Date.now() - lastAppliedSyncAtRef.current < 1500) return;
    // Shared control: ANY member's play/pause moves the whole room and is
    // announced to everyone ("<name> paused the video"). `announce` marks it a
    // genuine user action so the periodic drift heartbeat doesn't raise alerts.
    if (e.data === YT_PLAYING) {
      broadcastState("PLAY", { announce: true });
      persistState();
      lastPosRef.current = { t: e.target.getCurrentTime?.() ?? 0, at: Date.now() };
    }
    if (e.data === YT_PAUSED) {
      // Not a person pausing: our lock (prep/quiz/share) or the browser blocking
      // an autoplay we started. Broadcasting these is what froze the whole room
      // when someone refreshed. Real pauses still sync as before.
      if (lockedRef.current || Date.now() - programmaticPlayAtRef.current < 4000) return;
      broadcastState("PAUSE", { announce: true });
      persistState(); // remember exactly where we paused
      lastPosRef.current = { t: e.target.getCurrentTime?.() ?? 0, at: Date.now() };
    }
    if (e.data === YT_ENDED) {
      // Only the host announces the end (every client hits ENDED, so this avoids
      // an N-fold "paused" burst) — but everyone records their own watched credit.
      if (amHostRef.current) {
        broadcastState("PAUSE");
        persistState();
      }
      markWatched(e.target.getVideoData?.()?.video_id); // per-member, always
    }
  }, [broadcastState, captureVideoMeta, persistState, markWatched, sendPresence]);

  // ── Player error handling + recovery ──────────────────────────────────────
  // Fully rebuild the iframe. A remount re-runs onReady (re-cues the playlist)
  // and re-requests sync, which clears most transient "An error occurred" cases.
  const reloadPlayer = useCallback(() => {
    playerRef.current = null;
    receivedSyncRef.current = false;
    didResumeRef.current = false;
    settledRef.current = false;
    pendingSpotRef.current = null;
    setErrorCode(null);
    setPlayerKey((k) => k + 1);
    // The mount-time sync request only fires once for the component; after a
    // manual/auto reload of just the iframe, ask the host to re-sync us so the
    // fresh player lands on the room's current video/position (not the default).
    setTimeout(() => broadcast({ type: REQUEST_TYPE }), 2200);
  }, [broadcast]);

  const onError = useCallback((e) => {
    const code = e?.data ?? -1;
    // eslint-disable-next-line no-console
    console.warn(
      "[YouTubeRoom] YouTube player error",
      { code, meaning: YT_ERROR_MEANING[code] || "unknown", videoId: playerRef.current?.getVideoData?.()?.video_id }
    );
    setErrorCode(code);
    // Capture it server-side so we see the real cause from testers in the wild
    // without having to be present / reproduce it (shows up on /founder).
    track("yt_player_error", {
      code,
      meaning: YT_ERROR_MEANING[code] || "unknown",
      videoId: playerRef.current?.getVideoData?.()?.video_id || null,
      roomId: roomId || null,
    });
    // One automatic remount for the transient/streaming failures (2 invalid
    // param, 5 HTML5 player error, -1 unknown). Embedding-disabled (101/150)
    // and not-found (100) won't recover from a retry, so we don't loop on them.
    if (!autoRetriedRef.current && (code === 5 || code === 2 || code === -1)) {
      autoRetriedRef.current = true;
      setTimeout(reloadPlayer, 1200);
    }
  }, [reloadPlayer, roomId]);

  return (
    <div style={styles.shell}>
      {/* Presence is rendered by WatchPartyLayout (avatar strip on the stage). */}

      {/* YouTube player */}
      <div style={styles.playerWrap}>
        <YouTube
          key={playerKey}
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
          onPlaybackRateChange={onPlaybackRateChange}
          onError={onError}
        />

        {needsUnmute && (
          <button type="button" onClick={unmute} style={styles.unmuteBtn}>
            🔊 Tap to unmute — you're synced with the room
          </button>
        )}

        {/* Only surface our own overlay once an auto-retry has already failed,
            so a recoverable blip just reloads silently. */}
        {errorCode !== null && autoRetriedRef.current ? (
          <div style={styles.errorOverlay}>
            <p style={styles.errorTitle}>This video wouldn't play here</p>
            <p style={styles.errorMsg}>{YT_ERROR_MESSAGE[errorCode] || YT_ERROR_MESSAGE.default}</p>
            <button style={styles.errorBtn} onClick={reloadPlayer}>↻ Reload player</button>
          </div>
        ) : null}
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
  unmuteBtn: {
    position: "absolute", left: "50%", bottom: 64, transform: "translateX(-50%)", zIndex: 5,
    padding: "10px 18px", borderRadius: 999, border: "none", cursor: "pointer",
    background: "rgba(124,58,237,0.95)", color: "#fff", fontSize: 13, fontWeight: 700,
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)", whiteSpace: "nowrap",
  },
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
  errorOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
    textAlign: "center",
    background: "rgba(5,7,11,0.92)",
    zIndex: 3,
  },
  errorTitle: {
    margin: 0,
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: 700,
  },
  errorMsg: {
    margin: 0,
    maxWidth: 460,
    color: "rgba(148,163,184,0.9)",
    fontSize: 13,
    lineHeight: 1.5,
  },
  errorBtn: {
    marginTop: 8,
    padding: "8px 18px",
    borderRadius: 10,
    border: "none",
    background: "#7c3aed",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
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
