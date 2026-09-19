import { Mic, MicOff, Video, VideoOff, LogOut, Copy, X, Play, Flame, Target, Sparkles, Eye, Check, Download, Upload, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParticipants, useTracks, VideoTrack, useRoomContext, useLocalParticipant } from "@livekit/components-react";
import useMediaControls from "../hooks/useMediaControl";
import YouTubeRoom from "./YouTubeRoom";
import ChatDrawer from "./ChatDrawer";
import api, { fetchMyAnalytics, fetchFocusSummary, fetchVideoSummary } from "../services/api";

const PREP_MS = 60_000;

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function WatchPartyLayout({
  roomId,
  roomName,
  youtubeVideoId = null,
  youtubePlaylistId = null,
  startTime = null,
  tags = [],
  currentUser = null,
  restrictVideoIds = null,
  segment = null,
  segmentPart = null,
  playlistVideos = null,
  watchedVideoIds = null,
  hostUserId = null,
  playlistSkipped = null,
  courseProgress = null,
  cohortId = null,
  cohortSessionId = null,
  cohortTopic = null,
}) {
  const { toggleMic, micEnabled, toggleCamera, camEnabled } = useMediaControls();
  const navigate = useNavigate();
  const participants = useParticipants();
  const participantCount = participants.length;
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  // ── Live synced reactions ─────────────────────────────────────────────────
  // Emoji reactions float over the video for everyone at once — the thing that
  // makes co-watching feel shared instead of "watching alone with a chat box".
  const REACTIONS = ["👍", "🔥", "😂", "🤯", "❤️", "👏"];
  const [floats, setFloats] = useState([]); // { id, emoji, left }
  const [chatUnread, setChatUnread] = useState(false);

  // ── Voice/audio unblock ───────────────────────────────────────────────────
  // In a watch party, clicks land inside the cross-origin YouTube iframe and
  // never reach the parent page, so the browser's autoplay policy keeps the
  // LiveKit AudioContext suspended → you can't hear anyone. Detect that and give
  // an explicit "enable sound" control (the standard LiveKit pattern).
  const [audioBlocked, setAudioBlocked] = useState(false);
  useEffect(() => {
    if (!room) return undefined;
    const update = () => setAudioBlocked(room.canPlaybackAudio === false);
    update();
    room.on("audioPlaybackChanged", update);
    return () => room.off("audioPlaybackChanged", update);
  }, [room]);
  const enableAudio = async () => {
    try { await room?.startAudio(); } catch { /* needs a user gesture; this is one */ }
    setAudioBlocked(room?.canPlaybackAudio === false);
  };
  const spawnFloat = (emoji) => {
    const id = (crypto.randomUUID?.() || String(Math.random()));
    const left = 8 + Math.random() * 84; // % across the stage
    setFloats((f) => [...f, { id, emoji, left }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 2600);
  };
  const sendReaction = (emoji) => {
    // A parent-page gesture — also a good moment to unblock suspended audio.
    room?.startAudio?.().catch(() => {});
    spawnFloat(emoji); // show mine instantly
    if (room?.state === "connected" && localParticipant) {
      try {
        localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({ type: "YT_REACTION", emoji })),
          { reliable: false },
        );
      } catch {
        /* best effort */
      }
    }
  };
  useEffect(() => {
    if (!room) return undefined;
    const handler = (payload, participant) => {
      if (participant?.identity === localParticipant?.identity) return;
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg?.type === "YT_REACTION" && msg.emoji) spawnFloat(msg.emoji);
        // Unread chat badge when a message arrives and chat isn't open.
        if (msg?.type === "chat" && tabRef.current !== "chat") setChatUnread(true);
      } catch {
        /* ignore non-JSON / other packets */
      }
    };
    room.on("dataReceived", handler);
    return () => room.off("dataReceived", handler);
  }, [room, localParticipant]);
  const cameraTracks = useTracks([{ source: "camera", withPlaceholder: false }], {
    onlySubscribed: true,
  });

  const [tab, setTab] = useState("chat");
  const tabRef = useRef(tab);
  useEffect(() => {
    tabRef.current = tab;
    if (tab === "chat") setChatUnread(false);
  }, [tab]);

  // Reactions are hidden until you tap the reaction button in the control bar.
  const [showReactions, setShowReactions] = useState(false);

  // Shared-control alerts: everyone can play/pause/seek/change speed, and the
  // room is told who did what ("Aman paused the video").
  const [controlToasts, setControlToasts] = useState([]); // { id, text }
  const pushControlToast = ({ actor, action, currentTime, rate }) => {
    const name = actor || "Someone";
    const at = formatCountdown((currentTime || 0) * 1000);
    let text;
    if (action === "PAUSE") text = `⏸  ${name} paused the video`;
    else if (action === "PLAY") text = `▶  ${name} resumed the video`;
    else if (action === "SEEK") text = `⏩  ${name} jumped to ${at}`;
    else if (action === "RATE") text = `⚡  ${name} set speed to ${rate}×`;
    else return;
    const id = crypto.randomUUID?.() || String(Math.random());
    setControlToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setControlToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  // Cameras live in the People tab, not over the video. When anyone turns their
  // camera ON (the count rises), open the People tab for everyone at once — every
  // client sees the same participant camera states, so this stays in sync.
  const camOnCount = participants.filter((p) => p.isCameraEnabled).length;
  const prevCamOnRef = useRef(0);
  useEffect(() => {
    if (camOnCount > prevCamOnRef.current) setTab("people");
    prevCamOnRef.current = camOnCount;
  }, [camOnCount]);
  const ytControlsRef = useRef(null);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  // What's on the main stage right now — headings (notes, etc.) bind to this so
  // everything stays synced to the video actually playing, not a fixed day topic.
  const currentVideoTitle =
    (Array.isArray(playlistVideos) ? playlistVideos : []).find((v) => v.ytVideoId === currentVideoId)?.title || null;
  const [hostState, setHostState] = useState({ amHost: true, hostName: null, pendingRequest: null });
  const hasPlaylist = Array.isArray(playlistVideos) && playlistVideos.length > 0;
  const hasNotes = Boolean(cohortId && cohortSessionId);

  // Per-day notes (cohort rooms) — persisted so you can revisit the day later.
  const [notes, setNotes] = useState("");
  const [notesStatus, setNotesStatus] = useState(""); // "", "saving", "saved"
  const notesLoadedRef = useRef(false);
  useEffect(() => {
    if (!hasNotes) return;
    let cancelled = false;
    api.get(`/cohorts/${cohortId}/sessions/${cohortSessionId}/notes`)
      .then((res) => { if (!cancelled) { setNotes(res.data?.text || ""); notesLoadedRef.current = true; } })
      .catch(() => { notesLoadedRef.current = true; });
    return () => { cancelled = true; };
  }, [hasNotes, cohortId, cohortSessionId]);
  // Debounced autosave once loaded.
  useEffect(() => {
    if (!hasNotes || !notesLoadedRef.current) return undefined;
    setNotesStatus("saving");
    const t = setTimeout(() => {
      api.post(`/cohorts/${cohortId}/sessions/${cohortSessionId}/notes`, { text: notes })
        .then(() => setNotesStatus("saved"))
        .catch(() => setNotesStatus(""));
    }, 900);
    return () => clearTimeout(t);
  }, [notes, hasNotes, cohortId, cohortSessionId]);
  const notesFileRef = useRef(null);
  const downloadNotes = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFont("Times", "Normal");
    doc.setFontSize(16);
    doc.text(`PrepSy Notes — ${cohortTopic || "Cohort"}`, 20, 20);
    doc.setFontSize(12);
    doc.text(notes || "No notes written.", 20, 40, { maxWidth: 170 });
    doc.save("prepsy-notes.pdf");
  };
  const uploadNotes = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNotes(String(reader.result || ""));
    reader.readAsText(file);
    e.target.value = ""; // allow re-selecting the same file
  };
  const watchedSet = new Set(Array.isArray(watchedVideoIds) ? watchedVideoIds : []);
  const [shareStatus, setShareStatus] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 980 : false
  );
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [stats, setStats] = useState(null);
  const [videoSummary, setVideoSummary] = useState(null);
  const [videoSummaryLoading, setVideoSummaryLoading] = useState(true);

  const mountedAtRef = useRef(Date.now());

  // Shared start anchor so the prep countdown is IDENTICAL for everyone no matter
  // when each person opened the room: the earliest participant's join time (all
  // clients observe the same set, so they agree on the minimum). A late joiner
  // computes an anchor already in the past → no stale fresh 60s timer, they drop
  // straight in. Falls back to our own mount time until joinedAt is available.
  const earliestJoinMs = participants.reduce((min, p) => {
    const t = p?.joinedAt ? new Date(p.joinedAt).getTime() : null;
    return t != null && (min == null || t < min) ? t : min;
  }, null);
  const anchorMs = earliestJoinMs ?? mountedAtRef.current;

  const startTimeMs = startTime ? new Date(startTime).getTime() : null;
  const prepEndsAt = anchorMs + PREP_MS;
  // Scheduled sessions start at their fixed time so everyone stays in sync — if
  // the scheduled start is still ahead, count down to it (however far away).
  // Ad-hoc rooms (no future startTime) just get a short settle-in prep from the
  // shared anchor.
  const effectiveEndsAt =
    startTimeMs && startTimeMs > anchorMs
      ? Math.max(startTimeMs, prepEndsAt)
      : prepEndsAt;
  // A genuine scheduled start (vs a short ad-hoc settle-in): everyone must wait
  // for the fixed time, so we don't offer the "start now" bypass for these.
  const isScheduledStart = Boolean(startTimeMs && startTimeMs > anchorMs);
  const isPreparing = now < effectiveEndsAt;
  const showWaiting = !dismissed && isPreparing;
  const [manuallyStarted, setManuallyStarted] = useState(false);
  const playbackLocked = isPreparing && !manuallyStarted;

  useEffect(() => {
    if (!isPreparing) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isPreparing]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMyAnalytics().catch(() => null), fetchFocusSummary().catch(() => null)])
      .then(([analyticsRes, focusRes]) => {
        if (cancelled) return;
        const recentDistractions = (focusRes?.recentSessions || [])
          .slice(0, 5)
          .reduce((sum, s) => sum + (s.distractionCount || 0), 0);
        setStats({
          streak: analyticsRes?.analytics?.summary?.currentStreakDays ?? 0,
          avgFocus: focusRes?.avgFocusScore ?? null,
          distractions: recentDistractions,
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!roomId || !youtubeVideoId) {
      setVideoSummaryLoading(false);
      return undefined;
    }
    let cancelled = false;
    fetchVideoSummary(roomId)
      .then((res) => {
        if (!cancelled) setVideoSummary(res?.summary || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setVideoSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, youtubeVideoId]);

  useEffect(() => {
    if (!shareStatus) return undefined;
    const id = window.setTimeout(() => setShareStatus(""), 2200);
    return () => window.clearTimeout(id);
  }, [shareStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => setIsMobile(window.innerWidth < 980);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const copyRoomId = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setShareStatus("Room ID copied");
    } catch {
      setShareStatus("Copy failed");
    }
  };

  const handleStartWatching = () => {
    // Don't call playVideo() here directly — the child's playback lock is
    // still true until it re-renders with the new prop. Flipping this state
    // releases the lock, and YouTubeRoom's own effect starts playback the
    // instant it sees `locked` go from true to false.
    setManuallyStarted(true);
    setDismissed(true);
  };

  const handleLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    setShowSummary(true);
    try {
      const res = await api.post(`/rooms/${roomId}/leave`);
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLeaving(false);
    }
  };

  const handleCloseSummary = () => {
    navigate("/dashboard");
  };


  return (
    <div style={styles.page}>
      <style>{`
        @keyframes yt-float-up {
          0%   { transform: translateY(0) scale(0.8); opacity: 0; }
          15%  { opacity: 1; transform: translateY(-10px) scale(1.1); }
          100% { transform: translateY(-180px) scale(1); opacity: 0; }
        }
        @keyframes yt-toast-in {
          0%   { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={styles.centerWrap(isMobile)}>
        <div style={styles.stageWrap}>
          <div style={styles.roomHeaderBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <p style={styles.roomHeaderName}>{roomName || "Watch Party"}</p>
              {tags.slice(0, 2).map((t) => (
                <span key={t} style={styles.topicPill}>{t}</span>
              ))}
              <span style={styles.watchingBadge}>
                <span style={styles.liveDot} />
                {participantCount} {participantCount === 1 ? "person" : "people"} watching
                <span style={styles.sessionDivider}>•</span>
                {cohortId ? "YouTube cohort" : "Watch party"}
              </span>
              {hasPlaylist && (
                <span style={styles.hostBadge(hostState.amHost)} title={hostState.amHost ? "You control playback for the room" : "Playback is controlled by the host"}>
                  {hostState.amHost ? "🎛 You're hosting" : `👁 ${hostState.hostName || "Host"} is hosting`}
                </span>
              )}
            </div>
            <button type="button" style={styles.roomHeaderButton} onClick={copyRoomId}>
              <Copy size={15} />
              {shareStatus || "Share"}
            </button>
          </div>

          <div style={styles.stage} data-room-stage>
            {audioBlocked && (
              <button type="button" style={styles.enableAudioBanner} onClick={enableAudio}>
                🔊 Tap to enable voice & sound
              </button>
            )}
            {hasPlaylist && hostState.amHost && hostState.pendingRequest && (
              <div style={styles.controlRequestBanner}>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <strong>{hostState.pendingRequest.name}</strong> wants to control playback
                </span>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    style={styles.grantBtn}
                    onClick={() => ytControlsRef.current?.giveControl(hostState.pendingRequest.identity)}
                  >
                    Give control
                  </button>
                  <button
                    type="button"
                    style={styles.dismissBtn}
                    onClick={() => ytControlsRef.current?.dismissRequest()}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            <YouTubeRoom
              roomId={roomId}
              videoId={youtubeVideoId}
              playlistId={youtubePlaylistId}
              locked={playbackLocked}
              restrictVideoIds={restrictVideoIds}
              segment={segment}
              segmentPart={segmentPart}
              playlistVideos={playlistVideos}
              watchedVideoIds={watchedVideoIds}
              hostUserId={hostUserId}
              onRegisterControls={(c) => { ytControlsRef.current = c; }}
              onCurrentVideoId={setCurrentVideoId}
              onHostState={setHostState}
              onRemoteControl={pushControlToast}
            />

            {/* Always-on presence — see your crew is here, even cameras off. */}
            <div style={styles.presenceStrip}>
              {participants.map((p) => {
                const words = (p.name || "Guest").trim().split(/\s+/);
                const initials = words.slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "G";
                const isMe = p.identity === localParticipant?.identity;
                return (
                  <div key={p.identity} style={styles.presenceAvatar(isMe)} title={`${p.name || "Guest"}${isMe ? " (you)" : ""}`}>
                    {initials}
                    <span style={styles.presenceDot(p.isMicrophoneEnabled)} />
                  </div>
                );
              })}
            </div>

            {/* Floating live reactions */}
            <div style={styles.floatsLayer} aria-hidden="true">
              {floats.map((f) => (
                <span key={f.id} style={{ ...styles.floatEmoji, left: `${f.left}%` }}>{f.emoji}</span>
              ))}
            </div>

            {/* Shared-control alerts ("Aman paused the video") */}
            {controlToasts.length > 0 && (
              <div style={styles.controlToastLayer}>
                {controlToasts.map((t) => (
                  <div key={t.id} style={styles.controlToast}>{t.text}</div>
                ))}
              </div>
            )}

            {/* Reaction pill — only while the reaction button is toggled on */}
            {showReactions && (
              <div style={styles.reactionPill}>
                {REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => sendReaction(e)}
                    style={styles.reactionBtn}
                    title="React"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            {showWaiting && (
              <div style={styles.waitingOverlay}>
                <div style={styles.waitingCard}>
                  <button
                    type="button"
                    style={styles.waitingCloseBtn}
                    onClick={() => setDismissed(true)}
                    title="Dismiss"
                  >
                    <X size={16} />
                  </button>

                  <div style={styles.waitingHeader}>
                    <span style={styles.waitingKicker}>
                      <Sparkles size={13} /> Getting ready
                    </span>
                    <p style={styles.waitingCountdown}>{formatCountdown(effectiveEndsAt - now)}</p>
                    <p style={styles.waitingSub}>
                      {isScheduledStart
                        ? "This session starts at its scheduled time so everyone watches in sync — the video begins automatically."
                        : "Take a moment to settle in — the video starts automatically when the timer ends."}
                    </p>
                  </div>

                  {(videoSummaryLoading || videoSummary) && (
                    <div style={styles.summaryBox}>
                      <p style={styles.summaryLabel}>What you're about to watch</p>
                      <p style={styles.summaryText}>
                        {videoSummaryLoading ? "Summarizing video…" : videoSummary}
                      </p>
                    </div>
                  )}

                  <div style={styles.waitingActions}>
                    {!isScheduledStart && (
                      <button type="button" style={styles.startBtn} onClick={handleStartWatching}>
                        <Play size={15} fill="currentColor" />
                        Start watching now
                      </button>
                    )}
                    <button type="button" style={styles.waitingShareBtn} onClick={copyRoomId}>
                      <Copy size={15} />
                      {shareStatus || "Share room"}
                    </button>
                  </div>

                  {stats && (
                    <div style={styles.waitingStats}>
                      <p style={styles.waitingStatsHeading}>Your stats</p>
                      <div style={styles.statRow}>
                        <StatPill icon={Target} label="Avg focus" value={stats.avgFocus !== null ? stats.avgFocus : "—"} />
                        <StatPill icon={Flame} label="Streak" value={stats.streak} />
                        <StatPill icon={Eye} label="Distractions" value={stats.distractions} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Chat / Playlist / Notes / People live in the right-side panel tabs,
              so the control bar keeps just mic, camera, reactions and leave. */}
          <div style={styles.bottomBar}>
            <Control icon={micEnabled ? Mic : MicOff} active={micEnabled} onClick={toggleMic} title="Toggle mic" />
            <Control icon={camEnabled ? Video : VideoOff} active={camEnabled} onClick={toggleCamera} title="Toggle camera" />
            <Control icon={Smile} active={showReactions} onClick={() => setShowReactions((v) => !v)} title="React" />
            <Control icon={LogOut} danger onClick={handleLeave} title="Leave" />
          </div>
        </div>

        <div style={styles.sidePanel(isMobile)}>
          <div style={styles.tabBar}>
            <button
              type="button"
              style={styles.tabBtn(tab === "chat")}
              onClick={() => setTab("chat")}
            >
              Chat
              {chatUnread && tab !== "chat" && (
                <span style={{ display: "inline-block", marginLeft: 6, width: 8, height: 8, borderRadius: "50%", background: "#ef4444", verticalAlign: "middle" }} />
              )}
            </button>
            {hasPlaylist && (
              <button
                type="button"
                style={styles.tabBtn(tab === "playlist")}
                onClick={() => setTab("playlist")}
              >
                Playlist <span style={styles.tabCount}>{playlistVideos.length}</span>
              </button>
            )}
            {hasNotes && (
              <button
                type="button"
                style={styles.tabBtn(tab === "notes")}
                onClick={() => setTab("notes")}
              >
                Notes
              </button>
            )}
            <button
              type="button"
              style={styles.tabBtn(tab === "people")}
              onClick={() => setTab("people")}
            >
              People <span style={styles.tabCount}>{participantCount}</span>
            </button>
          </div>

          <div style={styles.tabBody}>
            {tab === "chat" ? (
              <ChatDrawer embedded currentUser={currentUser} />
            ) : tab === "playlist" && hasPlaylist ? (
              <PlaylistPanel
                videos={playlistVideos}
                watchedSet={watchedSet}
                currentVideoId={currentVideoId}
                amHost={hostState.amHost}
                progress={courseProgress}
                skipped={playlistSkipped}
                onPick={(vid) => ytControlsRef.current?.jumpTo(vid)}
                onRequestControl={() => ytControlsRef.current?.requestControl()}
              />
            ) : tab === "notes" && hasNotes ? (
              <div style={styles.notesPanel}>
                <div style={styles.notesHeader}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={currentVideoTitle || cohortTopic || "Today's notes"}>
                    📝 {currentVideoTitle || cohortTopic || "Today's notes"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                    {notesStatus === "saving" ? "Saving…" : notesStatus === "saved" ? "Saved ✓" : ""}
                  </span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jot down key points from today's video — saved automatically, and here when you come back to this day."
                  style={styles.notesArea}
                />
                <input
                  ref={notesFileRef}
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  onChange={uploadNotes}
                  style={{ display: "none" }}
                />
                <div style={styles.notesActions}>
                  <button type="button" style={styles.notesActionBtn} onClick={downloadNotes}>
                    <Download size={15} /> Download PDF
                  </button>
                  <button type="button" style={styles.notesActionBtn} onClick={() => notesFileRef.current?.click()}>
                    <Upload size={15} /> Upload
                  </button>
                </div>
              </div>
            ) : (
              <PeopleList
                participants={participants}
                cameraTracks={cameraTracks}
                localIdentity={localParticipant?.identity}
              />
            )}
          </div>
        </div>
      </div>

      {showSummary && (
        <LeaveSummaryModal
          summary={summary}
          loading={!summary}
          onClose={handleCloseSummary}
        />
      )}
    </div>
  );
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div style={styles.statPill}>
      {Icon && <Icon size={14} color="#a5b4fc" style={{ marginBottom: 4 }} />}
      <p style={styles.statPillValue}>{value}</p>
      <p style={styles.statPillLabel}>{label}</p>
    </div>
  );
}

function PlaylistPanel({ videos, watchedSet, currentVideoId, amHost, progress, skipped, onPick, onRequestControl }) {
  const [showSkipped, setShowSkipped] = useState(false);
  const pct = progress?.percent ?? 0;
  const eta = progress?.etaDays ?? 0;
  const hasSkipped = Array.isArray(skipped) && skipped.length > 0;
  return (
    <div style={styles.playlistPanel}>
      {/* Shared course progress — derived from the cohort pointer (no LLM). */}
      {progress && progress.totalCount > 0 && (
        <div style={styles.courseProgress}>
          <div style={styles.courseProgressTop}>
            <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
              {progress.completedCount}/{progress.totalCount} videos
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {pct}% · {eta > 0 ? `≈${eta} day${eta === 1 ? "" : "s"} left` : "complete 🎉"}
            </span>
          </div>
          <div style={styles.courseBarTrack}>
            <div style={{ ...styles.courseBarFill, width: `${pct}%` }} />
          </div>
        </div>
      )}

      {amHost ? (
        <p style={styles.playlistHint}>
          You're hosting — pick any video and the whole room jumps to it together.
        </p>
      ) : (
        <div style={styles.playlistLockedNote}>
          <span>Only the host can change the video. Following along.</span>
          <button type="button" style={styles.requestControlBtn} onClick={onRequestControl}>
            Request control
          </button>
        </div>
      )}

      {/* Notice: videos left out of the plan when the room was created. */}
      {hasSkipped && (
        <div style={styles.skippedNote}>
          <button type="button" style={styles.skippedToggle} onClick={() => setShowSkipped((s) => !s)}>
            <span>⤼ {skipped.length} video{skipped.length === 1 ? "" : "s"} skipped when this room was created</span>
            <span>{showSkipped ? "▲" : "▼"}</span>
          </button>
          {showSkipped && (
            <ul style={styles.skippedList}>
              {skipped.map((v) => (
                <li key={v.ytVideoId} style={styles.skippedItem}>{v.title}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {videos.map((v, i) => {
        const isCurrent = v.ytVideoId === currentVideoId;
        const watched = watchedSet.has(v.ytVideoId);
        return (
          <button
            key={v.ytVideoId || i}
            type="button"
            onClick={() => amHost && onPick(v.ytVideoId)}
            disabled={!amHost}
            style={{ ...styles.playlistRow(isCurrent), cursor: amHost ? "pointer" : "default", opacity: amHost || isCurrent ? 1 : 0.7 }}
            title={amHost ? v.title : "Only the host can change the video"}
          >
            <span style={styles.playlistIndex(isCurrent)}>
              {isCurrent ? <Play size={12} fill="currentColor" /> : i + 1}
            </span>
            <span style={styles.playlistTitle(isCurrent)}>{v.title}</span>
            {watched && <Check size={14} color="#22c55e" style={{ flexShrink: 0 }} />}
          </button>
        );
      })}
    </div>
  );
}

function PeopleList({ participants, cameraTracks = [], localIdentity = null }) {
  const trackFor = (identity) => cameraTracks.find((t) => t.participant.identity === identity);
  const camsOn = participants.filter((p) => p.isCameraEnabled && trackFor(p.identity)?.publication?.track);
  return (
    <div style={styles.peopleList}>
      {/* Live cameras (moved here from over the video). Any camera-on member
          shows up as a tile — the People tab opens for everyone when one turns on. */}
      {camsOn.length > 0 && (
        <div style={styles.peopleCamGrid}>
          {camsOn.map((p) => (
            <div key={p.identity} style={styles.peopleCamTile}>
              <VideoTrack trackRef={trackFor(p.identity)} style={styles.cameraPipVideo} />
              <span style={styles.cameraPipName}>
                {p.name || "Guest"}{p.identity === localIdentity ? " (you)" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
      {participants.map((p) => {
        const words = (p.name || "Guest").trim().split(/\s+/);
        const initials = words.slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
        return (
          <div key={p.identity} style={styles.personRow}>
            <div style={styles.personAvatar}>{initials || "G"}</div>
            <span style={styles.personName}>
              {p.name || "Guest"}{p.identity === localIdentity ? " (you)" : ""}
            </span>
            {p.isCameraEnabled && <Video size={14} color="#22c55e" />}
            {!p.isMicrophoneEnabled && <MicOff size={14} color="#94A3B8" />}
          </div>
        );
      })}
    </div>
  );
}

function LeaveSummaryModal({ summary, loading, onClose, onExit, exiting }) {
  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.card} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        {loading ? (
          <>
            <p style={modalStyles.tag}>SESSION COMPLETE</p>
            <h2 style={modalStyles.title}>Wrapping up…</h2>
          </>
        ) : (
          <>
            <p style={modalStyles.tag}>SESSION COMPLETE</p>
            <h2 style={modalStyles.title}>Thanks for watching{summary?.roomName ? ` in ${summary.roomName}` : ""}</h2>
            <p style={modalStyles.text}>{summary?.message}</p>
            <div style={modalStyles.stats}>
              <StatBox label="Time spent" value={summary?.totalTimeLabel} />
              <StatBox label="Watched with" value={`${summary?.studiedWithCount ?? 0} people`} />
              <StatBox label="Streak" value={`🔥 ${summary?.streak ?? 0} day${summary?.streak === 1 ? "" : "s"}`} />
            </div>
            {onExit && (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--card-border)" }}>
                <button onClick={onExit} disabled={exiting} style={modalStyles.exitBtn}>
                  {exiting ? "Exiting…" : "Exit room & stop reminders"}
                </button>
                <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>
                  Leaves this room for good — no more reminders or emails. You can rejoin anytime.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div style={modalStyles.stat}>
      <p style={modalStyles.label}>{label}</p>
      <p style={modalStyles.value}>{value}</p>
    </div>
  );
}

function Control({ icon, danger, active, onClick, title, badge }) {
  const IconComponent = icon;
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        position: "relative",
        width: 48,
        height: 48,
        borderRadius: 14,
        border: "1px solid var(--card-border)",
        background: danger ? "#F87171" : active ? "var(--accent)" : "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: active ? "0 6px 18px rgba(138,155,214,0.45)" : "0 4px 12px rgba(0,0,0,0.08)",
        transition: "all 0.2s ease",
      }}
    >
      <IconComponent size={20} color={danger ? "#FFFFFF" : "var(--text-secondary)"} />
      {badge && (
        <span style={{ position: "absolute", top: 8, right: 8, width: 10, height: 10, borderRadius: "50%", background: "#ef4444", border: "2px solid #fff" }} />
      )}
    </button>
  );
}

const styles = {
  page: {
    width: "100%",
    minHeight: "100%",
    background: "linear-gradient(180deg, var(--card-bg) 0%, var(--accent-soft) 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
    padding: "10px 12px 18px",
    boxSizing: "border-box",
    gap: 10,
  },
  centerWrap: (m) => ({
    width: "100%",
    maxWidth: 1420,
    alignItems: "stretch",
    display: "grid",
    gridTemplateColumns: m ? "minmax(0, 1fr)" : "minmax(0, 1.92fr) minmax(300px, 0.68fr)",
    gap: 16,
    boxSizing: "border-box",
    // Desktop: a definite height + a shrinkable row so the chat scrolls inside
    // its own box instead of stretching the whole page. Mobile: let it flow.
    ...(m
      ? { minHeight: "calc(100vh - 118px)" }
      : { height: "calc(100vh - 118px)", gridTemplateRows: "minmax(0, 1fr)" }),
  }),
  stageWrap: { position: "relative", minHeight: 360, display: "flex", flexDirection: "column", gap: 10 },
  roomHeaderBar: {
    minHeight: 42, padding: "8px 14px", borderRadius: 16,
    border: "1px solid var(--card-border)", background: "var(--card-bg)",
    boxShadow: "0 8px 20px rgba(74,90,133,0.08)",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  roomHeaderName: { margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  topicPill: {
    fontSize: 11, fontWeight: 600, color: "#6f3bd6", background: "#f3e8ff",
    padding: "3px 10px", borderRadius: 999, flexShrink: 0,
  },
  roomHeaderButton: {
    height: 30, padding: "0 11px", borderRadius: 999,
    border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)",
    fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    cursor: "pointer", flexShrink: 0, fontSize: 14,
  },
  watchingBadge: {
    display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
    fontSize: 12, color: "var(--text-secondary)", fontWeight: 500,
    background: "var(--accent-soft)", padding: "4px 11px", borderRadius: 999,
    whiteSpace: "nowrap",
  },
  hostBadge: (amHost) => ({
    display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
    fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 999,
    whiteSpace: "nowrap",
    background: amHost ? "rgba(124,58,237,0.12)" : "var(--accent-soft)",
    color: amHost ? "#7c3aed" : "var(--text-secondary)",
    border: amHost ? "1px solid rgba(124,58,237,0.35)" : "1px solid transparent",
  }),
  controlRequestBanner: {
    position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 45,
    display: "flex", alignItems: "center", gap: 14, maxWidth: "calc(100% - 24px)",
    padding: "8px 14px", borderRadius: 12, fontSize: 12.5, color: "#fff",
    background: "rgba(17,24,39,0.92)", border: "1px solid rgba(148,163,184,0.3)",
    boxShadow: "0 10px 26px rgba(0,0,0,0.4)", backdropFilter: "blur(8px)",
  },
  enableAudioBanner: {
    position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 46,
    padding: "9px 18px", borderRadius: 999, border: "none", cursor: "pointer",
    background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", color: "#fff",
    fontWeight: 700, fontSize: 13, boxShadow: "0 10px 26px rgba(124,58,237,0.5)",
  },
  grantBtn: {
    height: 28, padding: "0 12px", borderRadius: 8, border: "none", cursor: "pointer",
    background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 12,
  },
  dismissBtn: {
    height: 28, padding: "0 10px", borderRadius: 8, cursor: "pointer",
    background: "transparent", color: "#cbd5e1", border: "1px solid rgba(148,163,184,0.4)", fontSize: 12,
  },
  playlistLockedNote: {
    display: "flex", flexDirection: "column", gap: 8, marginBottom: 8, padding: "10px 12px",
    borderRadius: 10, background: "var(--accent-soft)", fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.4,
  },
  requestControlBtn: {
    alignSelf: "flex-start", height: 30, padding: "0 14px", borderRadius: 8, cursor: "pointer",
    border: "1px solid var(--accent)", background: "var(--card-bg)", color: "var(--accent)", fontWeight: 700, fontSize: 12,
  },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#22c55e" },
  sessionDivider: { color: "#94A3B8" },
  presenceStrip: {
    position: "absolute", top: 14, left: 14, zIndex: 26,
    display: "flex", gap: 6, flexWrap: "wrap", maxWidth: "60%",
    pointerEvents: "none",
  },
  presenceAvatar: (isMe) => ({
    position: "relative", width: 34, height: 34, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, color: "#fff",
    background: "linear-gradient(135deg, var(--accent), #6f7fc0)",
    border: isMe ? "2px solid #fff" : "2px solid rgba(255,255,255,0.35)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
  }),
  presenceDot: (micOn) => ({
    position: "absolute", bottom: -1, right: -1, width: 10, height: 10,
    borderRadius: "50%", border: "2px solid #05070b",
    background: micOn ? "#22c55e" : "#94a3b8",
  }),
  floatsLayer: {
    position: "absolute", inset: 0, zIndex: 27, pointerEvents: "none", overflow: "hidden",
  },
  controlToastLayer: {
    position: "absolute", top: 54, left: "50%", transform: "translateX(-50%)", zIndex: 32,
    display: "flex", flexDirection: "column", gap: 6, alignItems: "center",
    pointerEvents: "none", maxWidth: "92%",
  },
  controlToast: {
    padding: "7px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, color: "#fff",
    background: "rgba(8,10,20,0.82)", border: "1px solid rgba(148,163,184,0.28)",
    backdropFilter: "blur(8px)", boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
    animation: "yt-toast-in 0.2s ease-out",
  },
  floatEmoji: {
    position: "absolute", bottom: 70, fontSize: 30,
    animation: "yt-float-up 2.6s ease-out forwards",
    filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
  },
  reactionPill: {
    position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 30,
    display: "flex", gap: 2, padding: "4px 6px", borderRadius: 999,
    background: "rgba(8,10,20,0.72)", border: "1px solid rgba(148,163,184,0.28)",
    backdropFilter: "blur(8px)", boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
  },
  reactionBtn: {
    border: "none", background: "transparent", cursor: "pointer",
    fontSize: 19, lineHeight: 1, padding: "4px 6px", borderRadius: 999,
  },
  peopleCamGrid: {
    display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8,
    padding: "12px 12px 4px",
  },
  peopleCamTile: {
    width: "100%", aspectRatio: "16 / 10", borderRadius: 12, overflow: "hidden",
    position: "relative", background: "#0f172a", boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
  },
  cameraPipVideo: { width: "100%", height: "100%", objectFit: "cover" },
  cameraPipName: {
    position: "absolute", bottom: 6, left: 6, padding: "2px 7px",
    borderRadius: 6, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11,
  },
  stage: {
    width: "100%", minHeight: 360, flex: 1, borderRadius: 24,
    border: "1px solid rgba(238,242,255,0.8)", background: "#05070b",
    overflow: "hidden", display: "flex", alignItems: "stretch", justifyContent: "stretch",
    position: "relative", boxShadow: "0 16px 32px rgba(15,23,42,0.14)",
  },
  waitingOverlay: {
    position: "absolute", inset: 0, zIndex: 40,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(8,10,20,0.6)", backdropFilter: "blur(10px)",
    padding: 16,
  },
  waitingCard: {
    position: "relative", width: "min(100%, 420px)", textAlign: "center", padding: "30px 28px",
    background: "linear-gradient(160deg, rgba(30,27,75,0.92) 0%, rgba(15,23,42,0.94) 100%)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
    maxHeight: "90%", overflowY: "auto",
  },
  waitingCloseBtn: {
    position: "absolute", top: 14, right: 14, width: 30, height: 30,
    borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.08)",
    color: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  waitingHeader: { marginBottom: 18 },
  waitingKicker: {
    display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700,
    color: "#c4b5fd", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  waitingCountdown: {
    margin: "4px 0 10px", fontSize: 36, fontWeight: 800, color: "#e0e7ff",
    fontVariantNumeric: "tabular-nums", letterSpacing: 0.5,
    textShadow: "0 0 24px rgba(165,180,252,0.4)",
  },
  waitingSub: { margin: 0, fontSize: 12.5, color: "#94A3B8", lineHeight: 1.5, padding: "0 8px" },
  summaryBox: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(148,163,184,0.15)",
    borderRadius: 14, padding: "12px 14px", margin: "0 0 18px", textAlign: "left",
  },
  summaryLabel: {
    margin: "0 0 5px", fontSize: 10, fontWeight: 700, color: "#a5b4fc",
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  summaryText: { margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 },
  waitingActions: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 4 },
  startBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    height: 44, padding: "0 18px", borderRadius: 999, border: "none",
    background: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)", color: "#fff",
    fontWeight: 700, fontSize: 14, cursor: "pointer",
    boxShadow: "0 10px 26px rgba(124,58,237,0.4)",
  },
  waitingShareBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    height: 38, padding: "0 18px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(255,255,255,0.04)", color: "#cbd5e1", fontWeight: 600, fontSize: 13, cursor: "pointer",
  },
  waitingStats: {
    marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(148,163,184,0.15)",
  },
  waitingStatsHeading: {
    margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "#94A3B8",
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  statRow: { display: "flex", gap: 10 },
  statPill: {
    flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "10px 8px",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  statPillValue: { margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: "#e2e8f0" },
  statPillLabel: { margin: 0, fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 },
  bottomBar: {
    marginTop: 10, alignSelf: "center", width: "fit-content", maxWidth: "100%",
    display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
    padding: "8px 14px", background: "var(--card-bg)", borderRadius: 20,
    boxShadow: "0 8px 20px rgba(0,0,0,0.16)", flexShrink: 0,
  },
  sidePanel: (m) => ({
    display: "flex", flexDirection: "column",
    maxWidth: m ? "100%" : 380, width: "100%", justifySelf: "end",
    background: "var(--card-bg)", borderRadius: 22, border: "1px solid var(--accent-soft)",
    boxShadow: "0 10px 22px rgba(0,0,0,0.06)", overflow: "hidden",
    minHeight: m ? 420 : "auto",
  }),
  tabBar: {
    display: "flex", borderBottom: "1px solid var(--accent-soft)", flexShrink: 0,
  },
  tabBtn: (active) => ({
    flex: 1, padding: "14px 10px", border: "none", background: "transparent",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    color: active ? "#6f3bd6" : "var(--text-secondary)",
    borderBottom: active ? "2px solid #6f3bd6" : "2px solid transparent",
  }),
  tabCount: {
    display: "inline-block", marginLeft: 4, fontSize: 11, color: "var(--text-muted)",
  },
  tabBody: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" },
  notesPanel: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: 12, gap: 8 },
  notesHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  notesArea: {
    flex: 1, minHeight: 0, resize: "none", borderRadius: 12,
    border: "1px solid var(--card-border)", background: "var(--input-bg, var(--card-bg))",
    padding: "12px 14px", fontSize: 13.5, lineHeight: 1.6, color: "var(--text-primary)",
    outline: "none", fontFamily: "inherit",
  },
  notesActions: { display: "flex", gap: 8, flexShrink: 0 },
  notesActionBtn: {
    flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    height: 36, borderRadius: 10, cursor: "pointer",
    border: "1px solid var(--card-border)", background: "var(--card-bg)",
    color: "var(--text-secondary)", fontSize: 12.5, fontWeight: 700,
  },
  peopleList: { padding: 12, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" },
  playlistPanel: { padding: 12, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" },
  playlistHint: {
    margin: "0 0 6px", fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4,
  },
  courseProgress: {
    padding: "10px 12px", borderRadius: 12, border: "1px solid var(--card-border)",
    background: "var(--card-bg)", marginBottom: 4, display: "flex", flexDirection: "column", gap: 8,
  },
  courseProgressTop: {
    display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12,
  },
  courseBarTrack: {
    height: 6, borderRadius: 999, background: "var(--accent-soft)", overflow: "hidden",
  },
  courseBarFill: {
    height: "100%", borderRadius: 999, background: "var(--accent)", transition: "width 0.3s ease",
  },
  skippedNote: {
    borderRadius: 10, border: "1px dashed var(--card-border)", background: "var(--accent-soft)",
    marginBottom: 4, overflow: "hidden",
  },
  skippedToggle: {
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, width: "100%",
    padding: "8px 10px", border: "none", background: "transparent", cursor: "pointer",
    fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", textAlign: "left",
  },
  skippedList: {
    margin: 0, padding: "0 12px 10px 26px", display: "flex", flexDirection: "column", gap: 4,
  },
  skippedItem: {
    fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4,
  },
  playlistRow: (current) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
    borderRadius: 10, cursor: "pointer", textAlign: "left", width: "100%",
    border: current ? "1px solid var(--accent)" : "1px solid var(--card-border)",
    background: current ? "var(--accent-soft)" : "var(--card-bg)",
  }),
  playlistIndex: (current) => ({
    width: 22, height: 22, flexShrink: 0, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700,
    background: current ? "var(--accent)" : "var(--accent-soft)",
    color: current ? "#fff" : "var(--accent)",
  }),
  playlistTitle: (current) => ({
    flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.35,
    color: "var(--text-primary)", fontWeight: current ? 700 : 500,
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  }),
  personRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
    borderRadius: 12, background: "var(--card-bg)",
  },
  personAvatar: {
    width: 32, height: 32, borderRadius: "50%", background: "var(--accent-gradient)",
    color: "#fff", fontSize: 12, fontWeight: 700, display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  personName: { flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 },
};

const modalStyles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: 20,
  },
  card: {
    width: "min(100%, 460px)", background: "var(--card-bg)", borderRadius: 20,
    padding: "28px 24px", boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
    textAlign: "center", maxHeight: "90vh", overflowY: "auto", position: "relative",
  },
  closeBtn: {
    position: "absolute", top: 12, right: 14, border: "none", background: "transparent",
    fontSize: 18, cursor: "pointer", color: "var(--text-secondary)", lineHeight: 1,
  },
  tag: { fontSize: 11, color: "var(--accent)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px", fontFamily: "Georgia, serif" },
  text: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 18 },
  stats: { display: "flex", gap: 10, justifyContent: "space-between" },
  stat: { flex: 1, background: "var(--card-bg)", borderRadius: 12, padding: 12, border: "1px solid var(--card-border)" },
  label: { fontSize: 11, color: "var(--text-secondary)", margin: "0 0 4px" },
  value: { fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 },
  exitBtn: {
    width: "100%", height: 40, borderRadius: 10, cursor: "pointer",
    border: "1px solid rgba(220,38,38,0.5)", background: "transparent",
    color: "#dc2626", fontSize: 13, fontWeight: 600,
  },
};
